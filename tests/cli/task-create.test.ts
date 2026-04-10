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
