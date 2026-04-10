import { describe, it, expect } from 'vitest';
import { parseJest } from '../../../src/core/parsers/jest.js';

const JEST_FAILURE_OUTPUT = `
PASS src/utils.test.ts
FAIL src/auth.test.ts
  ● login() › should return valid token

    expect(received).toEqual(expected)

    Expected: {"token": "abc123"}
    Received: undefined

      12 |   const result = login(user);
      13 |   expect(result).toEqual({ token: 'abc123' });
         |                  ^
      14 | });

  ● logout() › should clear session

    expect(received).toBe(expected)

    Expected: null
    Received: {"active": true}

      22 |   const result = logout();
      23 |   expect(result).toBe(null);
         |                  ^
      24 | });

FAIL src/config.test.ts
  ● loadConfig() › should parse yaml

    TypeError: Cannot read properties of undefined (reading 'split')

      5 | export function loadConfig(raw: string) {
      6 |   return raw.split('\\n');
        |              ^
      7 | }

Test Suites: 2 failed, 1 passed, 3 total
Tests:       3 failed, 5 passed, 8 total
`;

describe('parseJest', () => {
  it('extracts failing test name and file', () => {
    const errors = parseJest(JEST_FAILURE_OUTPUT);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(errors[0].file).toBe('src/auth.test.ts');
    expect(errors[0].message).toContain('login()');
    expect(errors[0].message).toContain('should return valid token');
  });

  it('extracts expected and actual values', () => {
    const errors = parseJest(JEST_FAILURE_OUTPUT);
    const loginError = errors.find((e) => e.message?.includes('login'));
    expect(loginError?.expected).toContain('"token"');
    expect(loginError?.actual).toBe('undefined');
  });

  it('extracts line number from code pointer', () => {
    const errors = parseJest(JEST_FAILURE_OUTPUT);
    expect(errors[0].line).toBe(13);
  });

  it('handles TypeError style errors without expected/actual', () => {
    const errors = parseJest(JEST_FAILURE_OUTPUT);
    const typeError = errors.find((e) => e.message?.includes('loadConfig'));
    expect(typeError).toBeDefined();
    expect(typeError?.file).toBe('src/config.test.ts');
  });

  it('returns empty array for passing output', () => {
    const output = 'Test Suites: 1 passed, 1 total\nTests: 5 passed, 5 total';
    expect(parseJest(output)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseJest('')).toEqual([]);
  });
});
