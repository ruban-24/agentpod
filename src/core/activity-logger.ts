import { appendFile, readFile, access } from 'node:fs/promises';
import { taskActivityPath } from '../constants.js';
import type { ActivityEvent, ActivityEventType } from '../types.js';

export class ActivityLogger {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async append(taskId: string, event: ActivityEventType, data?: Record<string, unknown>): Promise<void> {
    const entry: ActivityEvent = {
      ts: new Date().toISOString(),
      event,
      task_id: taskId,
      ...(data !== undefined && { data }),
    };
    const filePath = taskActivityPath(this.repoRoot, taskId);
    await appendFile(filePath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  async read(taskId: string): Promise<ActivityEvent[]> {
    const filePath = taskActivityPath(this.repoRoot, taskId);
    try {
      const content = await readFile(filePath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line) as ActivityEvent;
          } catch {
            return null;
          }
        })
        .filter((e): e is ActivityEvent => e !== null);
    } catch {
      return [];
    }
  }

  async exists(taskId: string): Promise<boolean> {
    try {
      await access(taskActivityPath(this.repoRoot, taskId));
      return true;
    } catch {
      return false;
    }
  }

  async hasToolCalls(taskId: string): Promise<boolean> {
    const events = await this.read(taskId);
    return events.some(e => e.event === 'tool.call');
  }
}
