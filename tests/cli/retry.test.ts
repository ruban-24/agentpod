import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { TaskManager } from '../../src/core/task-manager.js';
import { retryCommand } from '../../src/cli/commands/retry.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('retryCommand', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepoWithAgex();
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'verify:\n  - "true"\n');
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
        execSync(`git worktree remove --force "${wt}"`, { cwd: repo.path, stdio: 'ignore' });
      }
    } catch { /* ignore */ }
    await repo.cleanup();
  });

  it('rejects retry on task not in failed/errored/completed', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'test' });

    await expect(
      retryCommand(repo.path, task.id, { feedback: 'fix it', cmd: 'echo ok' })
    ).rejects.toThrow(/cannot retry/i);
  });

  it('creates new task with retry metadata', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'original task' });
    const tm = new TaskManager(repo.path);

    // Force to failed state
    const taskData = await tm.getTask(task.id);
    taskData!.status = 'failed' as any;
    taskData!.cmd = 'echo "original"';
    taskData!.verification = {
      passed: false,
      checks: [{ cmd: 'npm test', passed: false, exit_code: 1, duration_s: 1, output: 'test failed' }],
    };
    await tm.saveTask(taskData!);

    const result = await retryCommand(repo.path, task.id, {
      feedback: 'fix the auth test',
      cmd: 'echo "retrying"',
      wait: true,
    });

    expect(result.retriedFrom).toBe(task.id);
    expect(result.retryDepth).toBe(1);
    expect(result.retryFeedback).toBe('fix the auth test');
    expect(result.prompt).toContain('original task');
    expect(result.prompt).toContain('fix the auth test');
    expect(result.prompt).toContain('Previous attempt failed');
  });

  it('transitions original task to retried', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'test' });
    const tm = new TaskManager(repo.path);

    const taskData = await tm.getTask(task.id);
    taskData!.status = 'failed' as any;
    taskData!.cmd = 'echo "original"';
    await tm.saveTask(taskData!);

    await retryCommand(repo.path, task.id, {
      feedback: 'try again',
      cmd: 'echo "retry"',
      wait: true,
    });

    const original = await tm.getTask(task.id);
    expect(original!.status).toBe('retried');
  });

  it('builds prompt with structured verify output when available', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'refactor auth' });
    const tm = new TaskManager(repo.path);

    const taskData = await tm.getTask(task.id);
    taskData!.status = 'failed' as any;
    taskData!.cmd = 'echo ok';
    taskData!.verification = {
      passed: false,
      checks: [{
        cmd: 'npm test',
        passed: false,
        exit_code: 1,
        duration_s: 1,
        output: 'raw output',
        parsed: [{ file: 'src/auth.ts', line: 13, message: 'login failed', expected: '"token"', actual: 'undefined' }],
      }],
    };
    await tm.saveTask(taskData!);

    const result = await retryCommand(repo.path, task.id, {
      feedback: 'fix login',
      cmd: 'echo ok',
      dryRun: true,
    });

    // dry-run returns the prompt as a string
    expect(result.prompt).toContain('src/auth.ts:13');
    expect(result.prompt).toContain('login failed');
    expect(result.prompt).toContain('Expected: "token"');
    expect(result.prompt).toContain('fix login');
  });

  it('rejects retry on already-retried task', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'test' });
    const tm = new TaskManager(repo.path);

    const taskData = await tm.getTask(task.id);
    taskData!.status = 'retried' as any;
    await tm.saveTask(taskData!);

    await expect(
      retryCommand(repo.path, task.id, { feedback: 'try again', cmd: 'echo ok' })
    ).rejects.toThrow(/cannot retry/i);
  });
});
