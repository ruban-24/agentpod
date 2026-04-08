import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { Reviewer } from '../../src/core/reviewer.js';
import { createTestRepoWithAgentpod, type TestRepo } from '../helpers/test-repo.js';

describe('Reviewer', () => {
  let repo: TestRepo;
  let reviewer: Reviewer;

  beforeEach(async () => {
    repo = await createTestRepoWithAgentpod();
    reviewer = new Reviewer(repo.path);
  });

  afterEach(async () => {
    // Clean up worktrees
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

  describe('getDiff', () => {
    it('returns diff stats for changes on a branch', async () => {
      // Create a worktree with a change
      const wtPath = join(repo.path, '.agentpod', 'worktrees', 'diff01');
      execSync(`git worktree add -b agentpod/diff01 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });

      // Make a change in the worktree
      await writeFile(join(wtPath, 'new-file.ts'), 'export const x = 1;\n');
      execSync('git add . && git commit -m "add file"', { cwd: wtPath, stdio: 'ignore' });

      const diff = await reviewer.getDiff('agentpod/diff01');

      expect(diff.files_changed).toBe(1);
      expect(diff.insertions).toBeGreaterThan(0);
    });

    it('returns zeros when branch has no changes', async () => {
      const wtPath = join(repo.path, '.agentpod', 'worktrees', 'diff02');
      execSync(`git worktree add -b agentpod/diff02 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });

      const diff = await reviewer.getDiff('agentpod/diff02');

      expect(diff.files_changed).toBe(0);
      expect(diff.insertions).toBe(0);
      expect(diff.deletions).toBe(0);
    });
  });

  describe('getDiffText', () => {
    it('returns the full diff text', async () => {
      const wtPath = join(repo.path, '.agentpod', 'worktrees', 'diff03');
      execSync(`git worktree add -b agentpod/diff03 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });
      await writeFile(join(wtPath, 'change.ts'), 'const y = 2;\n');
      execSync('git add . && git commit -m "add change"', { cwd: wtPath, stdio: 'ignore' });

      const text = await reviewer.getDiffText('agentpod/diff03');

      expect(text).toContain('change.ts');
      expect(text).toContain('const y = 2');
    });
  });
});
