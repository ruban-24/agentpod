import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { Reviewer } from '../../src/core/reviewer.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('Reviewer', () => {
  let repo: TestRepo;
  let reviewer: Reviewer;

  beforeEach(async () => {
    repo = await createTestRepoWithAgex();
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
      const wtPath = join(repo.path, '.agex', 'worktrees', 'diff01');
      execSync(`git worktree add -b agex/diff01 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });

      // Make a change in the worktree
      await writeFile(join(wtPath, 'new-file.ts'), 'export const x = 1;\n');
      execSync('git add . && git commit -m "add file"', { cwd: wtPath, stdio: 'ignore' });

      const diff = await reviewer.getDiff('agex/diff01');

      expect(diff.files_changed).toBe(1);
      expect(diff.insertions).toBeGreaterThan(0);
    });

    it('returns zeros when branch has no changes', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'diff02');
      execSync(`git worktree add -b agex/diff02 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });

      const diff = await reviewer.getDiff('agex/diff02');

      expect(diff.files_changed).toBe(0);
      expect(diff.insertions).toBe(0);
      expect(diff.deletions).toBe(0);
    });
  });

  describe('getDiffText', () => {
    it('returns the full diff text', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'diff03');
      execSync(`git worktree add -b agex/diff03 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });
      await writeFile(join(wtPath, 'change.ts'), 'const y = 2;\n');
      execSync('git add . && git commit -m "add change"', { cwd: wtPath, stdio: 'ignore' });

      const text = await reviewer.getDiffText('agex/diff03');

      expect(text).toContain('change.ts');
      expect(text).toContain('const y = 2');
    });
  });

  describe('getCommitLog', () => {
    it('returns commit log entries for a branch', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'log01');
      execSync(`git worktree add -b agex/log01 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });
      await writeFile(join(wtPath, 'file1.txt'), 'hello');
      execSync('git add . && git commit -m "first commit on branch"', { cwd: wtPath, stdio: 'ignore' });
      await writeFile(join(wtPath, 'file2.txt'), 'world');
      execSync('git add . && git commit -m "second commit on branch"', { cwd: wtPath, stdio: 'ignore' });

      const log = await reviewer.getCommitLog('agex/log01');

      expect(log).toHaveLength(2);
      expect(log[0].message).toBe('second commit on branch');
      expect(log[1].message).toBe('first commit on branch');
      expect(log[0].sha).toHaveLength(7);
    });

    it('returns empty array for branch with no new commits', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'log02');
      execSync(`git worktree add -b agex/log02 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });

      const log = await reviewer.getCommitLog('agex/log02');
      expect(log).toEqual([]);
    });
  });

  describe('getPerFileStats', () => {
    it('returns per-file change stats for a branch', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'stats01');
      execSync(`git worktree add -b agex/stats01 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });
      await writeFile(join(wtPath, 'new.txt'), 'new file\nline 2\n');
      execSync('git add . && git commit -m "add new file"', { cwd: wtPath, stdio: 'ignore' });

      const stats = await reviewer.getPerFileStats('agex/stats01');

      expect(stats.length).toBeGreaterThanOrEqual(1);
      const newFile = stats.find((s) => s.file === 'new.txt');
      expect(newFile).toBeDefined();
      expect(newFile!.insertions).toBeGreaterThan(0);
      expect(newFile!.status).toBe('A');
    });

    it('returns empty array for branch with no changes', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'stats02');
      execSync(`git worktree add -b agex/stats02 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });

      const stats = await reviewer.getPerFileStats('agex/stats02');
      expect(stats).toEqual([]);
    });
  });

  describe('merge', () => {
    it('merges a branch into the current branch', async () => {
      const wtPath = join(repo.path, '.agex', 'worktrees', 'merge01');
      execSync(`git worktree add -b agex/merge01 "${wtPath}"`, {
        cwd: repo.path,
        stdio: 'ignore',
      });
      await writeFile(join(wtPath, 'merged-file.ts'), 'export const merged = true;\n');
      execSync('git add . && git commit -m "add merged file"', { cwd: wtPath, stdio: 'ignore' });

      const result = await reviewer.merge('agex/merge01');

      expect(result.success).toBe(true);
      expect(result.strategy).toBeDefined();

      // Verify the file exists on the main branch now
      const { access: acc } = await import('node:fs/promises');
      await acc(join(repo.path, 'merged-file.ts'));
    });

    it('reports merge conflicts', async () => {
      // Create conflicting changes
      await writeFile(join(repo.path, 'conflict.ts'), 'const main = true;\n');
      execSync('git add . && git commit -m "main change"', { cwd: repo.path, stdio: 'ignore' });

      // Now create a branch from BEFORE that commit, make a conflicting change
      const parentSha = execSync('git rev-parse HEAD~1', { cwd: repo.path, encoding: 'utf-8' }).trim();
      const wtPath = join(repo.path, '.agex', 'worktrees', 'merge02');
      execSync(`git worktree add -b agex/merge02 "${wtPath}" ${parentSha}`, {
        cwd: repo.path,
        stdio: 'ignore',
      });
      await writeFile(join(wtPath, 'conflict.ts'), 'const branch = true;\n');
      execSync('git add . && git commit -m "branch change"', { cwd: wtPath, stdio: 'ignore' });

      const result = await reviewer.merge('agex/merge02');

      expect(result.success).toBe(false);
    });
  });
});
