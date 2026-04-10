import { resolve } from 'node:path';
import type { TaskRecord } from '../types.js';

export type EnrichedTask = TaskRecord & { absolute_worktree: string };

export function withAbsoluteWorktree(task: TaskRecord, repoRoot: string): EnrichedTask {
  return { ...task, absolute_worktree: resolve(repoRoot, task.worktree) };
}

export function withAbsoluteWorktrees(tasks: TaskRecord[], repoRoot: string): EnrichedTask[] {
  return tasks.map((t) => withAbsoluteWorktree(t, repoRoot));
}
