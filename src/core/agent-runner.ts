import { execaCommand } from 'execa';
import { writeFile, appendFile } from 'node:fs/promises';
import { taskLogPath } from '../constants.js';

export interface RunResult {
  exitCode: number;
  timedOut: boolean;
}

export interface SpawnHandle {
  pid: number;
  kill: () => void;
  done: Promise<RunResult>;
}

export interface RunOptions {
  timeout?: number;
}

export class AgentRunner {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async run(
    taskId: string,
    cmd: string,
    cwd: string,
    env: Record<string, string>,
    options?: RunOptions
  ): Promise<RunResult> {
    const logPath = taskLogPath(this.repoRoot, taskId);
    await writeFile(logPath, '');

    try {
      const result = await execaCommand(cmd, {
        cwd,
        shell: true,
        env: { ...process.env, ...env },
        reject: false,
        ...(options?.timeout ? { timeout: options.timeout } : {}),
      });

      const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
      await appendFile(logPath, output);

      return { exitCode: result.exitCode ?? 1, timedOut: (result as any).timedOut ?? false };
    } catch (err: unknown) {
      const timedOut = (err as any).timedOut === true;
      const msg = err instanceof Error ? err.message : String(err);
      await appendFile(logPath, `Error: ${msg}\n`);
      return { exitCode: 1, timedOut };
    }
  }

  spawn(
    taskId: string,
    cmd: string,
    cwd: string,
    env: Record<string, string>,
    options?: RunOptions
  ): SpawnHandle {
    const logPath = taskLogPath(this.repoRoot, taskId);

    const subprocess = execaCommand(cmd, {
      cwd,
      shell: true,
      env: { ...process.env, ...env },
      reject: false,
      detached: false,
    });

    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (options?.timeout) {
      timer = setTimeout(() => {
        timedOut = true;
        try {
          subprocess.kill();
        } catch {
          // Already dead
        }
      }, options.timeout);
    }

    const done = (async (): Promise<RunResult> => {
      try {
        await writeFile(logPath, '');
        const result = await subprocess;
        if (timer) clearTimeout(timer);
        const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
        await appendFile(logPath, output);
        return { exitCode: result.exitCode ?? 1, timedOut };
      } catch {
        if (timer) clearTimeout(timer);
        return { exitCode: 1, timedOut };
      }
    })();

    const pid = subprocess.pid ?? 0;

    return {
      pid,
      kill: () => {
        if (timer) clearTimeout(timer);
        try {
          subprocess.kill();
        } catch {
          // Already dead
        }
      },
      done,
    };
  }
}
