import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logCommand } from '../../src/cli/commands/log.js';
import { createTestRepoWithAgex, type TestRepo } from '../helpers/test-repo.js';

describe('logCommand', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepoWithAgex();
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  it('returns the log content for a task', async () => {
    await writeFile(join(repo.path, '.agex', 'tasks', 'abc123.log'), 'agent output here\n');

    const result = await logCommand(repo.path, 'abc123');
    expect(result).toContain('agent output here');
  });

  it('throws when log file does not exist', async () => {
    await expect(logCommand(repo.path, 'nonexistent')).rejects.toThrow();
  });
});
