import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDuration, formatRelativeTime } from '../../../src/cli/format/time.js';

describe('formatDuration', () => {
  it('formats seconds under 60 as Ns', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats 60 seconds as 1m 0s', () => {
    expect(formatDuration(60)).toBe('1m 0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('1h 1m');
  });

  it('handles undefined gracefully', () => {
    expect(formatDuration(undefined)).toBe('-');
  });
});

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats time less than 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T00:01:30Z'));
    expect(formatRelativeTime('2026-04-09T00:01:00Z')).toBe('30s ago');
  });

  it('formats time in minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T00:05:00Z'));
    expect(formatRelativeTime('2026-04-09T00:02:00Z')).toBe('3 min ago');
  });

  it('formats time in hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T03:00:00Z'));
    expect(formatRelativeTime('2026-04-09T00:30:00Z')).toBe('2h ago');
  });

  it('handles undefined gracefully', () => {
    expect(formatRelativeTime(undefined)).toBe('-');
  });
});
