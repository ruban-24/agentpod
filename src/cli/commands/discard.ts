import { TaskManager } from '../../core/task-manager.js';
import { WorkspaceManager } from '../../core/workspace-manager.js';
import type { TaskRecord } from '../../types.js';

export async function discardCommand(
  repoRoot: string,
  taskId: string
): Promise<TaskRecord> {
  const tm = new TaskManager(repoRoot);
  const wm = new WorkspaceManager(repoRoot);

  const task = await tm.getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  await wm.removeWorktree(taskId, task.branch);
  return await tm.updateStatus(taskId, 'discarded');
}
