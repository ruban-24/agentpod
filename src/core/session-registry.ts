import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { sessionRegistryPath } from '../constants.js';

export interface SessionEntry {
  taskId: string;
  repoRoot: string;
}

export interface SessionRegistry {
  lookup(sessionId: string): SessionEntry | null;
  register(sessionId: string, entry: SessionEntry): void;
}

type RegistryShape = Record<string, SessionEntry>;

function readRegistry(path: string): RegistryShape {
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as RegistryShape;
    }
    return {};
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return {};
    // Corruption: treat as empty. Caller may have warned once.
    return {};
  }
}

function writeRegistry(path: string, data: RegistryShape): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}.${randomBytes(4).toString('hex')}`;
  writeFileSync(tmp, JSON.stringify(data), { encoding: 'utf-8', flag: 'wx' });
  renameSync(tmp, path);
}

export function loadSessionRegistry(repoRoot: string): SessionRegistry {
  const path = sessionRegistryPath(repoRoot);
  return {
    lookup(sessionId: string): SessionEntry | null {
      const data = readRegistry(path);
      return data[sessionId] ?? null;
    },
    register(sessionId: string, entry: SessionEntry): void {
      const existing = readRegistry(path);
      const prior = existing[sessionId];
      if (prior && prior.taskId === entry.taskId && prior.repoRoot === entry.repoRoot) {
        return; // idempotent — entry already exactly as requested
      }
      existing[sessionId] = entry;
      try {
        writeRegistry(path, existing);
      } catch {
        // Write failures are non-fatal; callers must tolerate (hook path).
      }
    },
  };
}
