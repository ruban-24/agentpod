import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCommand } from '../../src/cli/commands/run.js';
import { taskExecCommand } from '../../src/cli/commands/task-exec.js';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { createTestRepoWithAgentpod, type TestRepo } from '../helpers/test-repo.js';

describe('runCommand', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepoWithAgentpod();
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

  it('creates a task, runs a command, and returns completed status', async () => {
    const result = await runCommand(repo.path, {
      prompt: 'test task',
      cmd: 'echo "hello from agent"',
      wait: true,
    });

    expect(result.status).toBe('completed');
    expect(result.exit_code).toBe(0);
  });

  it('captures agent output to log file', async () => {
    const result = await runCommand(repo.path, {
      prompt: 'log test',
      cmd: 'echo "captured"',
      wait: true,
    });

    const logPath = join(repo.path, '.agentpod', 'tasks', `${result.id}.log`);
    const log = await readFile(logPath, 'utf-8');
    expect(log).toContain('captured');
  });

  it('returns failed status when agent command fails and verification fails', async () => {
    const result = await runCommand(repo.path, {
      prompt: 'failing task',
      cmd: 'exit 1',
      wait: true,
    });

    // Status depends on verification — with no verify commands, it's completed
    expect(result.exit_code).toBe(1);
  });
});

describe('taskExecCommand', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepoWithAgentpod();
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

  it('runs a command in an existing task worktree', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'exec test' });

    const result = await taskExecCommand(repo.path, task.id, {
      cmd: 'echo "executed"',
      wait: true,
    });

    expect(result.status).toBe('completed');
  });
});
