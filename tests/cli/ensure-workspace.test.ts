import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTestRepo, type TestRepo } from '../helpers/test-repo.js';
import { ensureWorkspace } from '../../src/cli/ensure-workspace.js';

describe('ensureWorkspace', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepo();
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  it('creates .agex/tasks/ directory', async () => {
    const result = await ensureWorkspace(repo.path);
    await access(join(repo.path, '.agex', 'tasks'));
    expect(result.firstRun).toBe(true);
  });

  it('appends .agex/ to .gitignore', async () => {
    await ensureWorkspace(repo.path);
    const content = await readFile(join(repo.path, '.gitignore'), 'utf-8');
    expect(content).toContain('.agex/');
  });

  it('does not duplicate .agex/ in .gitignore on repeat call', async () => {
    await ensureWorkspace(repo.path);
    await ensureWorkspace(repo.path);
    const content = await readFile(join(repo.path, '.gitignore'), 'utf-8');
    const matches = content.match(/\.agex\//g);
    expect(matches).toHaveLength(1);
  });

  it('does NOT write skill files (that is init concern)', async () => {
    await ensureWorkspace(repo.path);
    await expect(access(join(repo.path, '.agents', 'skills', 'agex', 'SKILL.md'))).rejects.toThrow();
  });

  it('returns firstRun=false on repeat calls', async () => {
    await ensureWorkspace(repo.path);
    const result = await ensureWorkspace(repo.path);
    expect(result.firstRun).toBe(false);
  });

  it('detects monorepo on first run and returns info', async () => {
    await writeFile(join(repo.path, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    const result = await ensureWorkspace(repo.path);
    expect(result.firstRun).toBe(true);
    expect(result.monorepo).toEqual({ type: 'pnpm', label: 'pnpm workspace' });
  });

  it('returns null monorepo for non-monorepo', async () => {
    const result = await ensureWorkspace(repo.path);
    expect(result.monorepo).toBeNull();
  });
});
