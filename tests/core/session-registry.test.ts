import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSessionRegistry } from '../../src/core/session-registry.js';

describe('SessionRegistry', () => {
  let repo: string;

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'agex-session-reg-'));
    await mkdir(join(repo, '.agex'), { recursive: true });
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it('lookup returns null when registry file does not exist', () => {
    const reg = loadSessionRegistry(repo);
    expect(reg.lookup('session-1')).toBeNull();
  });

  it('lookup returns null for sessions not in the registry', async () => {
    await writeFile(
      join(repo, '.agex', 'sessions.json'),
      JSON.stringify({ 'session-2': { taskId: 't2', repoRoot: repo } }),
    );
    const reg = loadSessionRegistry(repo);
    expect(reg.lookup('session-1')).toBeNull();
  });

  it('lookup returns the entry when the session is registered', async () => {
    await writeFile(
      join(repo, '.agex', 'sessions.json'),
      JSON.stringify({ 'session-1': { taskId: 'task-abc', repoRoot: repo } }),
    );
    const reg = loadSessionRegistry(repo);
    expect(reg.lookup('session-1')).toEqual({ taskId: 'task-abc', repoRoot: repo });
  });
});
