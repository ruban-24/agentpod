import { TaskManager } from '../../core/task-manager.js';
import { WorkspaceManager } from '../../core/workspace-manager.js';
import { loadConfig } from '../../config/loader.js';
import type { TaskRecord } from '../../types.js';

export interface TaskCreateOptions {
  prompt: string;
  cmd?: string;
}

export async function taskCreateCommand(
  repoRoot: string,
  options: TaskCreateOptions
): Promise<TaskRecord> {
  const config = await loadConfig(repoRoot);
  const tm = new TaskManager(repoRoot);
  const wm = new WorkspaceManager(repoRoot);

  // Create task record
  const task = await tm.createTask({ prompt: options.prompt, cmd: options.cmd });
  await tm.updateStatus(task.id, 'provisioning');

  // Create worktree
  await wm.createWorktree(task.id, task.branch);

  // Provision
  await wm.provision(task.id, {
    copy: config.copy,
    symlink: config.symlink,
  });

  // Run setup hooks
  if (config.setup && config.setup.length > 0) {
    await wm.runSetupHooks(task.id, config.setup);
  }

  // Mark ready
  const readyTask = await tm.updateStatus(task.id, 'ready');
  return readyTask;
}
