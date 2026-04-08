import { describe, it, expect } from 'vitest';
import { generateTaskId } from '../../src/utils/id.js';

describe('generateTaskId', () => {
  it('returns a 6-character lowercase alphanumeric string', () => {
    const id = generateTaskId();
    expect(id).toMatch(/^[a-z0-9]{6}$/);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTaskId()));
    expect(ids.size).toBe(100);
  });
});
