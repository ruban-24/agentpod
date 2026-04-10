import type { ParsedError } from '../../types.js';
import { parseJest } from './jest.js';
import { parsePytest } from './pytest.js';

export type OutputParser = (raw: string) => ParsedError[];

const PARSERS: Record<string, OutputParser> = {
  jest: parseJest,
  vitest: parseJest,
  pytest: parsePytest,
};

export function getParser(name: string): OutputParser | undefined {
  return PARSERS[name];
}
