import { readFileSync } from 'node:fs';
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

export function loadSessionRegistry(repoRoot: string): SessionRegistry {
  const path = sessionRegistryPath(repoRoot);
  return {
    lookup(sessionId: string): SessionEntry | null {
      const data = readRegistry(path);
      return data[sessionId] ?? null;
    },
    register(_sessionId: string, _entry: SessionEntry): void {
      throw new Error('register not yet implemented');
    },
  };
}
