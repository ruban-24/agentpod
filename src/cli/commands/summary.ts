import { TaskManager } from '../../core/task-manager.js';
import { ServerManager } from '../../core/server-manager.js';
import type { TaskRecord } from '../../types.js';

export interface SummaryTask extends TaskRecord {
  port: number;
  url: string;
  server_running: boolean;
}

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
  tasks: SummaryTask[];
}

export async function summaryCommand(repoRoot: string): Promise<SummaryResult> {
  const tm = new TaskManager(repoRoot);
  const sm = new ServerManager(repoRoot);
  const rawTasks = await tm.listTasks();

  const tasks: SummaryTask[] = rawTasks.map((task) => {
    const port = parseInt(task.env.AGEX_PORT, 10);
    return {
      ...task,
      port,
      url: `http://localhost:${port}`,
      server_running: task.server_pid != null && sm.isProcessAlive(task.server_pid),
    };
  });

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
