import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { acceptCommand } from '../../src/cli/commands/accept.js';
import { taskCreateCommand } from '../../src/cli/commands/task-create.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('acceptCommand', () => {
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

  it('merges a task branch and cleans up the worktree', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'merge test' });

    // Make a change in the worktree
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'merged.ts'), 'export const merged = true;\n');
    execSync('git add . && git commit -m "add merged file"', { cwd: wtPath, stdio: 'ignore' });

    const result = await acceptCommand(repo.path, task.id, { reviewed: true });

    expect(result.id).toBe(task.id);
    expect(result.merged).toBe(true);

    // Verify the file exists on the main branch
    await access(join(repo.path, 'merged.ts'));

    // Verify worktree is removed
    await expect(access(wtPath)).rejects.toThrow();
  });

  it('auto-commits uncommitted changes before merging', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'auto-commit test' });

    // Make a change in the worktree but do NOT commit
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'uncommitted.ts'), 'export const uncommitted = true;\n');

    const result = await acceptCommand(repo.path, task.id, { reviewed: true });

    expect(result.id).toBe(task.id);
    expect(result.merged).toBe(true);
    expect(result.auto_committed).toBe(true);

    // Verify the file exists on main
    await access(join(repo.path, 'uncommitted.ts'));

    // Verify commit message is the task prompt
    const log = execSync('git log -1 --format=%s', { cwd: repo.path, encoding: 'utf-8' }).trim();
    expect(log).toBe('auto-commit test');
  });

  it('does not set auto_committed when changes were already committed', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'pre-committed test' });

    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'committed.ts'), 'export const committed = true;\n');
    execSync('git add . && git commit -m "manual commit"', { cwd: wtPath, stdio: 'ignore' });

    const result = await acceptCommand(repo.path, task.id, { reviewed: true });

    expect(result.merged).toBe(true);
    expect(result.auto_committed).toBeUndefined();
  });

  it('rejects merge when working tree is dirty with overlapping files', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'dirty merge test' });

    // Make a commit in the worktree that modifies a file
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'new-file.txt'), 'content');
    execSync('git add . && git commit -m "add file"', { cwd: wtPath, stdio: 'ignore' });

    // Dirty the same file on main (overlapping with task branch)
    await writeFile(join(repo.path, 'new-file.txt'), 'uncommitted');

    await expect(acceptCommand(repo.path, task.id, { reviewed: true })).rejects.toThrow('conflict with task branch');

    // Clean up
    const { unlink } = await import('node:fs/promises');
    await unlink(join(repo.path, 'new-file.txt'));
  });

  it('allows accept when dirty files do not overlap with task branch changes', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'non-overlapping dirty test' });

    // Make a change in the worktree (creates a new file on the task branch)
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'task-file.ts'), 'export const task = true;\n');
    execSync('git add . && git commit -m "add task file"', { cwd: wtPath, stdio: 'ignore' });

    // Create a dirty unrelated file on main
    await writeFile(join(repo.path, 'unrelated-dirty.txt'), 'uncommitted');

    const result = await acceptCommand(repo.path, task.id, { reviewed: true });

    expect(result.merged).toBe(true);

    // Clean up the dirty file
    const { unlink } = await import('node:fs/promises');
    await unlink(join(repo.path, 'unrelated-dirty.txt'));
  });

  it('blocks accept when dirty files overlap with task branch changes', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'overlapping dirty test' });

    // Modify README.md in the worktree (it already exists from initial commit)
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'README.md'), '# Modified by task branch\n');
    execSync('git add . && git commit -m "modify readme on task"', { cwd: wtPath, stdio: 'ignore' });

    // Make README.md dirty on main (same file the task branch changed)
    await writeFile(join(repo.path, 'README.md'), '# Dirty on main\n');

    await expect(acceptCommand(repo.path, task.id, { reviewed: true })).rejects.toThrow('conflict with task branch');

    // Clean up
    execSync('git checkout -- README.md', { cwd: repo.path, stdio: 'ignore' });
  });

  it('blocks accept when review mode is manual and no flags passed', async () => {
    // Write manual review config
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'review: manual\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'manual gate test' });
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'gated.ts'), 'export const gated = true;\n');
    execSync('git add . && git commit -m "add gated file"', { cwd: wtPath, stdio: 'ignore' });

    await expect(acceptCommand(repo.path, task.id)).rejects.toThrow('human approval required');
  });

  it('allows accept in manual mode with --reviewed flag', async () => {
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'review: manual\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'reviewed test' });
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'reviewed.ts'), 'export const reviewed = true;\n');
    execSync('git add . && git commit -m "add reviewed file"', { cwd: wtPath, stdio: 'ignore' });

    const result = await acceptCommand(repo.path, task.id, { reviewed: true });
    expect(result.merged).toBe(true);
  });

  it('allows accept in manual mode with --human flag', async () => {
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'review: manual\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'human test' });
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'human.ts'), 'export const human = true;\n');
    execSync('git add . && git commit -m "add human file"', { cwd: wtPath, stdio: 'ignore' });

    const result = await acceptCommand(repo.path, task.id, { human: true });
    expect(result.merged).toBe(true);
  });

  it('allows accept without flags when review mode is auto', async () => {
    await writeFile(join(repo.path, '.agex', 'config.yml'), 'review: auto\n');

    const task = await taskCreateCommand(repo.path, { prompt: 'auto mode test' });
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'auto.ts'), 'export const auto = true;\n');
    execSync('git add . && git commit -m "add auto file"', { cwd: wtPath, stdio: 'ignore' });

    const result = await acceptCommand(repo.path, task.id);
    expect(result.merged).toBe(true);
  });

  it('defaults to manual mode when no config exists', async () => {
    // No config.yml at all — should default to manual and block
    const task = await taskCreateCommand(repo.path, { prompt: 'no config test' });
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);
    await writeFile(join(wtPath, 'noconfig.ts'), 'export const noconfig = true;\n');
    execSync('git add . && git commit -m "add noconfig file"', { cwd: wtPath, stdio: 'ignore' });

    await expect(acceptCommand(repo.path, task.id)).rejects.toThrow('human approval required');
  });

  it('restores worktree when merge fails due to conflict', async () => {
    const task = await taskCreateCommand(repo.path, { prompt: 'conflict test' });
    const wtPath = join(repo.path, '.agex', 'tasks', task.id);

    // Make a change in the worktree on README.md (exists from initial commit)
    await writeFile(join(wtPath, 'README.md'), '# Modified by task\n');
    execSync('git add . && git commit -m "task modifies readme"', { cwd: wtPath, stdio: 'ignore' });

    // Make a conflicting change on main
    await writeFile(join(repo.path, 'README.md'), '# Modified on main\n');
    execSync('git add . && git commit -m "main modifies readme"', { cwd: repo.path, stdio: 'ignore' });

    const result = await acceptCommand(repo.path, task.id, { reviewed: true });

    expect(result.merged).toBe(false);
    // Worktree should be restored
    await access(wtPath);
  });
});
