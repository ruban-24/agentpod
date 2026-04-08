import { TaskManager } from '../../core/task-manager.js';
import type { TaskRecord } from '../../types.js';

export async function taskStatusCommand(
  repoRoot: string,
  taskId: string
): Promise<TaskRecord> {
  const tm = new TaskManager(repoRoot);
  const task = await tm.getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  return task;
}
