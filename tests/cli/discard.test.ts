import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { discardCommand } from '../../src/cli/commands/discard.js';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { createTestRepoWithAgentpod, type TestRepo } from '../helpers/test-repo.js';

describe('discardCommand', () => {
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

  it('discards a task by removing worktree and branch', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'discard test' });
    const wtPath = join(repo.path, '.agentpod', 'worktrees', task.id);

    const result = await discardCommand(repo.path, task.id);

    expect(result.id).toBe(task.id);
    expect(result.status).toBe('discarded');

    // Worktree should be gone
    await expect(access(wtPath)).rejects.toThrow();
  });
});
