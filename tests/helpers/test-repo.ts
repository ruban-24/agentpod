import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

export interface TestRepo {
  path: string;
  cleanup: () => Promise<void>;
}

export async function createTestRepo(): Promise<TestRepo> {
  const path = await mkdtemp(join(tmpdir(), 'agex-test-'));
  execSync('git init', { cwd: path, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: path, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: path, stdio: 'ignore' });
  await writeFile(join(path, 'README.md'), '# Test Repo\n');
  execSync('git add . && git commit -m "initial commit"', { cwd: path, stdio: 'ignore' });

  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    },
  };
}

export async function createTestRepoWithAgex(): Promise<TestRepo> {
  const repo = await createTestRepo();
  const agexDir = join(repo.path, '.agex');
  await mkdir(join(agexDir, 'tasks'), { recursive: true });
  await mkdir(join(agexDir, 'worktrees'), { recursive: true });
  return repo;
}
