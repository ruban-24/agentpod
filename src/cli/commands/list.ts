import { TaskManager } from '../../core/task-manager.js';
import { ServerManager } from '../../core/server-manager.js';
import type { TaskRecord } from '../../types.js';

export interface ListTask extends TaskRecord {
  port: number;
  url: string;
  server_running: boolean;
}

export async function listCommand(repoRoot: string): Promise<ListTask[]> {
  const tm = new TaskManager(repoRoot);
  const sm = new ServerManager(repoRoot);
  const tasks = await tm.listTasks();

  return tasks.map((task) => {
    const port = parseInt(task.env.AGEX_PORT, 10);
    return {
      ...task,
      port,
      url: `http://localhost:${port}`,
      server_running: task.server_pid != null && sm.isProcessAlive(task.server_pid),
    };
  });
}
