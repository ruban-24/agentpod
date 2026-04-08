import { describe, it, expect } from 'vitest';
import { calculatePortOffset } from '../../src/utils/port.js';

describe('calculatePortOffset', () => {
  it('returns base + offset for task index 0', () => {
    expect(calculatePortOffset(0, 3000, 100)).toBe(3100);
  });

  it('increments by offset for each task index', () => {
    expect(calculatePortOffset(1, 3000, 100)).toBe(3200);
    expect(calculatePortOffset(2, 3000, 100)).toBe(3300);
  });

  it('uses custom base and offset', () => {
    expect(calculatePortOffset(0, 8000, 50)).toBe(8050);
    expect(calculatePortOffset(3, 8000, 50)).toBe(8200);
  });
});
