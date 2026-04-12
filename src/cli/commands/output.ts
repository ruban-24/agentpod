import { readFile } from 'node:fs/promises';
import { taskLogPath } from '../../constants.js';
import { AgexError } from '../../errors.js';

export async function outputCommand(repoRoot: string, taskId: string): Promise<string> {
  const logPath = taskLogPath(repoRoot, taskId);
  try {
    return await readFile(logPath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new AgexError(`No output found for task: ${taskId}`, {
        suggestion: "Run 'agex list' to see available tasks",
      });
    }
    throw err;
  }
}
