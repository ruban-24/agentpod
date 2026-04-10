import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { configPath } from '../constants.js';
import type { AgexConfig } from '../types.js';

export async function loadConfig(repoRoot: string): Promise<AgexConfig> {
  try {
    const content = await readFile(configPath(repoRoot), 'utf-8');
    const parsed = load(content);
    if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
      return {};
    }
    return parsed as AgexConfig;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw err;
  }
}
