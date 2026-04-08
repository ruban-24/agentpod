import { taskCreateCommand } from './task-create.js';
import { taskExecCommand } from './task-exec.js';
import type { TaskRecord } from '../../types.js';

export interface RunOptions {
  prompt: string;
  cmd: string;
  wait?: boolean;
}

export async function runCommand(
  repoRoot: string,
  options: RunOptions
): Promise<TaskRecord> {
  // Create task with workspace
  const task = await taskCreateCommand(repoRoot, {
    prompt: options.prompt,
    cmd: options.cmd,
  });

  // Execute command in the workspace
  return await taskExecCommand(repoRoot, task.id, {
    cmd: options.cmd,
    wait: options.wait,
  });
}
