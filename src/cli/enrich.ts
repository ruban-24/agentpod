import { resolve } from 'node:path';
import type { TaskRecord } from '../types.js';

export type EnrichedTask<T extends TaskRecord = TaskRecord> = T & { absolute_worktree: string };

export function withAbsoluteWorktree<T extends TaskRecord>(task: T, repoRoot: string): EnrichedTask<T> {
  return { ...task, absolute_worktree: resolve(repoRoot, task.worktree) };
}

export function withAbsoluteWorktrees<T extends TaskRecord>(tasks: T[], repoRoot: string): EnrichedTask<T>[] {
  return tasks.map((t) => withAbsoluteWorktree(t, repoRoot));
}
