import { resolve } from 'node:path';
import { AGEX_DIR, WORKTREES_DIR } from '../constants.js';

const WORKTREE_SEGMENT = `/${AGEX_DIR}/${WORKTREES_DIR}/`;

export interface WorktreeContext {
  repoRoot: string;
  taskId: string;
}

/**
 * If cwd is inside a task worktree (.agex/tasks/<taskId>),
 * returns the main repo root and the task ID.
 * Returns null if cwd is not inside a worktree.
 */
export function resolveWorktreeContext(cwd?: string): WorktreeContext | null {
  const dir = resolve(cwd ?? process.cwd());
  const idx = dir.indexOf(WORKTREE_SEGMENT);
  if (idx === -1) return null;

  const repoRoot = dir.slice(0, idx);
  const afterSegment = dir.slice(idx + WORKTREE_SEGMENT.length);
  const taskId = afterSegment.split('/')[0];
  if (!taskId) return null;

  return { repoRoot, taskId };
}
