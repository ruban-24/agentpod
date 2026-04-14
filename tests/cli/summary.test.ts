import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { summaryCommand } from '../../src/cli/commands/summary.js';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('summaryCommand', () => {
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

  it('returns a summary of all tasks', async () => {
    await taskCreateCommand(repo.path, { prompt: 'task 1' });
    await taskCreateCommand(repo.path, { prompt: 'task 2' });

    const result = await summaryCommand(repo.path);

    expect(result.total).toBe(2);
    expect(result.tasks).toHaveLength(2);
  });

  it('counts tasks by status', async () => {
    const result = await summaryCommand(repo.path);

    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('includes review_mode in result', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'review: auto\n');

    const result = await summaryCommand(repo.path);
    expect(result.review_mode).toBe('auto');
  });

  it('defaults review_mode to manual when not configured', async () => {
    const result = await summaryCommand(repo.path);
    expect(result.review_mode).toBe('manual');
  });

  it('includes all status count fields', async () => {
    const result = await summaryCommand(repo.path);

    expect(result).toHaveProperty('pending');
    expect(result).toHaveProperty('provisioning');
    expect(result).toHaveProperty('verifying');
    expect(result).toHaveProperty('merged');
    expect(result).toHaveProperty('discarded');
    expect(result.pending).toBe(0);
    expect(result.provisioning).toBe(0);
    expect(result.verifying).toBe(0);
    expect(result.merged).toBe(0);
    expect(result.discarded).toBe(0);
  });
});
