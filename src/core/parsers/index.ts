import type { ParsedError } from '../../types.js';
import { parseJest } from './jest.js';

export type OutputParser = (raw: string) => ParsedError[];

const PARSERS: Record<string, OutputParser> = {
  jest: parseJest,
  vitest: parseJest, // same output format
};

export function getParser(name: string): OutputParser | undefined {
  return PARSERS[name];
}
