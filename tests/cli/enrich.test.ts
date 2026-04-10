import { describe, it, expect } from 'vitest';
import { withAbsoluteWorktree, withAbsoluteWorktrees } from '../../src/cli/enrich.js';
import type { TaskRecord } from '../../src/types.js';

function makeTask(id: string = 'abc123'): TaskRecord {
  return {
    id,
    prompt: 'test',
    status: 'ready',
    branch: `agex/${id}`,
    worktree: `.agex/tasks/${id}`,
    created_at: new Date().toISOString(),
    env: {
      AGEX_TASK_ID: id,
      AGEX_WORKTREE: `/repo/.agex/tasks/${id}`,
      AGEX_PORT: '3100',
    },
  };
}

describe('withAbsoluteWorktree', () => {
  it('adds absolute_worktree field resolved from repoRoot', () => {
    const task = makeTask();
    const enriched = withAbsoluteWorktree(task, '/Users/dev/myproject');
    expect(enriched.absolute_worktree).toBe('/Users/dev/myproject/.agex/tasks/abc123');
    // Original fields preserved
    expect(enriched.id).toBe('abc123');
    expect(enriched.worktree).toBe('.agex/tasks/abc123');
  });
});

describe('withAbsoluteWorktrees', () => {
  it('enriches an array of tasks', () => {
    const tasks = [makeTask('aaa'), makeTask('bbb')];
    const enriched = withAbsoluteWorktrees(tasks, '/repo');
    expect(enriched).toHaveLength(2);
    expect(enriched[0].absolute_worktree).toBe('/repo/.agex/tasks/aaa');
    expect(enriched[1].absolute_worktree).toBe('/repo/.agex/tasks/bbb');
  });
});
