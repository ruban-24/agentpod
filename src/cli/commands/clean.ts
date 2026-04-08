import { TaskManager } from '../../core/task-manager.js';
import { WorkspaceManager } from '../../core/workspace-manager.js';

export interface CleanResult {
  removed: string[];
  kept: string[];
}

export async function cleanCommand(repoRoot: string): Promise<CleanResult> {
  const tm = new TaskManager(repoRoot);
  const wm = new WorkspaceManager(repoRoot);
  const tasks = await tm.listTasks();

  const removed: string[] = [];
  const kept: string[] = [];

  for (const task of tasks) {
    if (
      task.status === 'completed' ||
      task.status === 'failed' ||
      task.status === 'discarded' ||
      task.status === 'merged'
    ) {
      try {
        await wm.removeWorktree(task.id, task.branch);
        removed.push(task.id);
      } catch {
        // Worktree may already be removed
        removed.push(task.id);
      }
    } else {
      kept.push(task.id);
    }
  }

  return { removed, kept };
}
