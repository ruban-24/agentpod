import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectVerifyCommands } from '../../src/config/auto-detect.js';
import { createTestRepo, type TestRepo } from '../helpers/test-repo.js';

describe('detectVerifyCommands', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepo();
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  it('returns empty array when no recognizable files exist', async () => {
    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toEqual([]);
  });

  it('detects npm test from package.json with test script', async () => {
    await writeFile(
      join(repo.path, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } })
    );

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('npm test');
  });

  it('detects npm run lint from package.json with lint script', async () => {
    await writeFile(
      join(repo.path, 'package.json'),
      JSON.stringify({ scripts: { lint: 'eslint .' } })
    );

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('npm run lint');
  });

  it('detects npm run build from package.json with build script', async () => {
    await writeFile(
      join(repo.path, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc' } })
    );

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('npm run build');
  });

  it('detects all three npm scripts when present', async () => {
    await writeFile(
      join(repo.path, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest', lint: 'eslint .', build: 'tsc' } })
    );

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toEqual(['npm test', 'npm run lint', 'npm run build']);
  });

  it('detects pytest from pyproject.toml', async () => {
    await writeFile(join(repo.path, 'pyproject.toml'), '[tool.pytest]\n');

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('pytest');
  });

  it('detects cargo test from Cargo.toml', async () => {
    await writeFile(join(repo.path, 'Cargo.toml'), '[package]\nname = "test"\n');

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('cargo test');
  });

  it('detects go test from go.mod', async () => {
    await writeFile(join(repo.path, 'go.mod'), 'module example.com/test\n');

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('go test ./...');
  });

  it('detects make test from Makefile with test target', async () => {
    await writeFile(join(repo.path, 'Makefile'), 'test:\n\techo "testing"\n');

    const cmds = await detectVerifyCommands(repo.path);
    expect(cmds).toContain('make test');
  });
});
