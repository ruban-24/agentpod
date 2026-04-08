import simpleGit from 'simple-git';
import { TaskManager } from '../../core/task-manager.js';
import { Reviewer } from '../../core/reviewer.js';
import { worktreePath } from '../../constants.js';

export interface MergeResult {
  id: string;
  merged: boolean;
  strategy?: string;
  commit?: string;
}

export async function mergeCommand(repoRoot: string, taskId: string): Promise<MergeResult> {
  const tm = new TaskManager(repoRoot);
  const reviewer = new Reviewer(repoRoot);
  const git = simpleGit(repoRoot);

  const task = await tm.getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const wtPath = worktreePath(repoRoot, taskId);

  // Remove the worktree but keep the branch (git can't merge a checked-out branch)
  await git.raw(['worktree', 'remove', '--force', wtPath]);

  // Attempt merge
  const result = await reviewer.merge(task.branch);

  if (result.success) {
    // Clean up the branch after successful merge
    try {
      await git.raw(['branch', '-D', task.branch]);
    } catch {
      // Branch may already be gone
    }

    await tm.updateStatus(taskId, 'merged');
    return { id: taskId, merged: true, strategy: result.strategy, commit: result.commit };
  } else {
    return { id: taskId, merged: false };
  }
}
