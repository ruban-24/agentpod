import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { verifyCommand } from '../../src/cli/commands/verify.js';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('verifyCommand', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepoWithAgex();
  });

  afterEach(async () => {
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

  it('runs verification checks against a task worktree', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');

    // Set up verify commands in config
    await writeFile(
      join(repo.path, '.agex', 'config.yml'),
      'verify:\n  - echo "check passed"\n'
    );

    const task = await taskCreateCommand(repo.path, { prompt: 'verify test' });
    const result = await verifyCommand(repo.path, task.id);

    expect(result.id).toBe(task.id);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].passed).toBe(true);
  });

  it('transitions task to completed when verification passes and status allows', async () => {
    const { writeFile: wf } = await import('node:fs/promises');
    const { join: j } = await import('node:path');
    const { TaskManager } = await import('../../src/core/task-manager.js');

    await wf(j(repo.path, '.agex', 'config.yml'), 'verify:\n  - echo pass\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'verify transitions test' });
    const tm = new TaskManager(repo.path);

    // Force task to running (verify can transition running -> verifying -> completed)
    const taskData = await tm.getTask(task.id);
    taskData!.status = 'running' as any;
    await tm.saveTask(taskData!);

    const result = await verifyCommand(repo.path, task.id);

    expect(result.checks[0].passed).toBe(true);

    const updated = await tm.getTask(task.id);
    expect(updated!.status).toBe('completed');
  });

  it('returns passed and summary in result', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');

    await writeFile(
      join(repo.path, '.agex', 'config.yml'),
      'verify:\n  - echo "all good"\n  - echo "also good"\n'
    );

    const task = await taskCreateCommand(repo.path, { prompt: 'pass/fail test' });
    const result = await verifyCommand(repo.path, task.id);

    expect(result.passed).toBe(true);
    expect(result.summary).toBe('2/2 checks passed');
  });

  it('returns passed=false and failure summary when check fails', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');

    await writeFile(
      join(repo.path, '.agex', 'config.yml'),
      'verify:\n  - echo pass\n  - exit 1\n'
    );

    const task = await taskCreateCommand(repo.path, { prompt: 'fail test' });

    // Force task to running so verify can transition
    const { TaskManager } = await import('../../src/core/task-manager.js');
    const tm = new TaskManager(repo.path);
    const taskData = await tm.getTask(task.id);
    taskData!.status = 'running' as any;
    await tm.saveTask(taskData!);

    const result = await verifyCommand(repo.path, task.id);

    expect(result.passed).toBe(false);
    expect(result.summary).toBe('1 of 2 checks failed');
  });

  it('includes review_mode in result', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'review: manual\nverify:\n  - echo ok\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'review mode test' });
    const result = await verifyCommand(repo.path, task.id);
    expect(result.review_mode).toBe('manual');
  });

  it('defaults review_mode to manual when not configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'verify:\n  - echo ok\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'default review test' });
    const result = await verifyCommand(repo.path, task.id);
    expect(result.review_mode).toBe('manual');
  });

  it('updates verification data without changing status on re-verify of completed task', async () => {
    const { writeFile: wf } = await import('node:fs/promises');
    const { join: j } = await import('node:path');
    const { TaskManager } = await import('../../src/core/task-manager.js');

    await wf(j(repo.path, '.agex', 'config.yml'), 'verify:\n  - echo pass\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'reverify test' });
    const tm = new TaskManager(repo.path);

    // Force task to completed
    const taskData = await tm.getTask(task.id);
    taskData!.status = 'completed' as any;
    await tm.saveTask(taskData!);

    const result = await verifyCommand(repo.path, task.id);

    expect(result.checks[0].passed).toBe(true);
    const updated = await tm.getTask(task.id);
    expect(updated!.status).toBe('completed');
    expect(updated!.verification).toBeDefined();
  });
});
