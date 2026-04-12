import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { AGEX_DIR, TASKS_DIR } from '../constants.js';
import { detectMonorepo, type MonorepoInfo } from '../config/auto-detect.js';

export interface EnsureWorkspaceResult {
  firstRun: boolean;
  monorepo: MonorepoInfo | null;
}

export async function ensureWorkspace(repoRoot: string): Promise<EnsureWorkspaceResult> {
  const tasksDir = join(repoRoot, AGEX_DIR, TASKS_DIR);

  let firstRun = false;
  try {
    await access(tasksDir);
  } catch {
    firstRun = true;
  }

  await mkdir(tasksDir, { recursive: true });

  const gitignorePath = join(repoRoot, '.gitignore');
  let gitignoreContent = '';
  try {
    gitignoreContent = await readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist
  }
  if (!gitignoreContent.includes('.agex/')) {
    gitignoreContent = gitignoreContent.trimEnd() + '\n.agex/\n';
    await writeFile(gitignorePath, gitignoreContent);
  }

  const monorepo = firstRun ? await detectMonorepo(repoRoot) : null;

  return { firstRun, monorepo };
}
