import { TaskManager } from '../../core/task-manager.js';
import { WorkspaceManager } from '../../core/workspace-manager.js';
import { ServerManager } from '../../core/server-manager.js';

export interface CleanResult {
  removed: string[];
  kept: string[];
  uncommitted_changes?: string[];
}

export async function cleanCommand(repoRoot: string): Promise<CleanResult> {
  const tm = new TaskManager(repoRoot);
  const wm = new WorkspaceManager(repoRoot);
  const sm = new ServerManager(repoRoot);
  const tasks = await tm.listTasks();

  const cleanableStatuses = ['completed', 'failed', 'discarded', 'merged', 'errored'];
  const toClean = tasks.filter(task => cleanableStatuses.includes(task.status));
  const toKeep = tasks.filter(task => !cleanableStatuses.includes(task.status));

  const kept = toKeep.map(t => t.id);

  const results = await Promise.allSettled(toClean.map(async (task) => {
    let dirty = false;
    try {
      if (await wm.hasUncommittedChanges(task.id)) {
        dirty = true;
      }
    } catch {
      // Worktree may already be gone
    }

    if (task.server_pid && sm.isProcessAlive(task.server_pid)) {
      await sm.killProcess(task.server_pid);
    }

    try {
      await wm.removeWorktree(task.id, task.branch);
    } catch {
      // Worktree may already be removed
    }
    try {
      await tm.deleteTask(task.id);
    } catch {
      // Task file may already be gone
    }

    return { id: task.id, dirty };
  }));

  const dirtyTasks = results
    .filter((r): r is PromiseFulfilledResult<{ id: string; dirty: boolean }> =>
      r.status === 'fulfilled' && r.value.dirty
    )
    .map(r => r.value.id);

  const removed = toClean.map(t => t.id);

  return { removed, kept, ...(dirtyTasks.length ? { uncommitted_changes: dirtyTasks } : {}) };
}
