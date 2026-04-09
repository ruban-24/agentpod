import { TaskManager } from '../../core/task-manager.js';
import type { TaskRecord } from '../../types.js';

export interface SummaryResult {
  total: number;
  pending: number;
  provisioning: number;
  ready: number;
  running: number;
  verifying: number;
  completed: number;
  failed: number;
  errored: number;
  merged: number;
  discarded: number;
  tasks: TaskRecord[];
}

export async function summaryCommand(repoRoot: string): Promise<SummaryResult> {
  const tm = new TaskManager(repoRoot);
  const tasks = await tm.listTasks();

  const count = (status: string) => tasks.filter((t) => t.status === status).length;

  return {
    total: tasks.length,
    pending: count('pending'),
    provisioning: count('provisioning'),
    ready: count('ready'),
    running: count('running'),
    verifying: count('verifying'),
    completed: count('completed'),
    failed: count('failed'),
    errored: count('errored'),
    merged: count('merged'),
    discarded: count('discarded'),
    tasks,
  };
}
