import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('taskCreateCommand', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepoWithAgex();
  });

  afterEach(async () => {
    // Clean worktrees
    const { execSync } = await import('node:child_process');
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: repo.path,
        encoding: 'utf-8',
      });
      const worktrees = output
        .split('\n')
        .filter((line) => line.startsWith('worktree '))
        .map((line) => line.replace('worktree ', ''))
        .filter((path) => path !== repo.path);
      for (const wt of worktrees) {
        execSync(`git worktree remove --force "${wt}"`, {
          cwd: repo.path,
          stdio: 'ignore',
        });
      }
    } catch {
      // Ignore
    }
    await repo.cleanup();
  });

  it('creates a task with a worktree and returns task info', async () => {
    const result = await taskCreateCommand(repo.path, {
      prompt: 'refactor auth to use JWT',
    });

    expect(result.id).toMatch(/^[a-z0-9]{6}$/);
    expect(result.status).toBe('ready');
    expect(result.branch).toContain('agex/');
    expect(result.worktree).toContain('.agex/tasks/');
    expect(result.env.AGEX_TASK_ID).toBe(result.id);
  });

  it('task worktree field is a relative path that resolves correctly', async () => {
    const { resolve } = await import('node:path');
    const { withAbsoluteWorktree } = await import('../../src/cli/enrich.js');

    const result = await taskCreateCommand(repo.path, { prompt: 'path test' });
    const enriched = withAbsoluteWorktree(result, repo.path);

    expect(enriched.worktree).toBe(`.agex/tasks/${result.id}`);
    expect(enriched.absolute_worktree).toBe(resolve(repo.path, `.agex/tasks/${result.id}`));
    expect(enriched.absolute_worktree).toBe(enriched.env.AGEX_WORKTREE);
  });

  it('cleans up worktree, branch, and task JSON when setup hook fails', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { access } = await import('node:fs/promises');
    const { TaskManager } = await import('../../src/core/task-manager.js');
    const { execSync } = await import('node:child_process');

    // Configure a setup hook that always fails
    await writeFile(
      join(repo.path, '.agex', 'config.yml'),
      'setup:\n  - exit 1\n'
    );

    const tm = new TaskManager(repo.path);
    const tasksBefore = await tm.listTasks();

    await expect(
      taskCreateCommand(repo.path, { prompt: 'should fail' })
    ).rejects.toThrow();

    // Task JSON should be deleted
    const tasksAfter = await tm.listTasks();
    expect(tasksAfter.length).toBe(tasksBefore.length);

    // No orphan worktrees should remain
    const { realpathSync } = await import('node:fs');
    const realRepoPath = realpathSync(repo.path);
    const output = execSync('git worktree list --porcelain', {
      cwd: repo.path,
      encoding: 'utf-8',
    });
    const worktrees = output
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.replace('worktree ', ''))
      .filter((path) => path !== repo.path && path !== realRepoPath);
    expect(worktrees).toHaveLength(0);

    // No orphan branches (beyond main) should remain
    const branches = execSync('git branch', { cwd: repo.path, encoding: 'utf-8' });
    const branchList = branches.split('\n').map(b => b.trim().replace('* ', '')).filter(Boolean);
    // Only the initial branch should exist
    expect(branchList).toHaveLength(1);
  });

  it('provisions the workspace with config copy/symlink', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');

    // Create a .env file and config
    await writeFile(join(repo.path, '.env'), 'SECRET=test\n');
    await writeFile(
      join(repo.path, '.agex', 'config.yml'),
      'copy:\n  - .env\n'
    );

    const result = await taskCreateCommand(repo.path, { prompt: 'test' });

    const envPath = join(repo.path, '.agex', 'tasks', result.id, '.env');
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(envPath, 'utf-8');
    expect(content).toBe('SECRET=test\n');
  });
});
