import { describe, it, expect } from 'vitest';
import { green, red, yellow, blue, purple, dim, bold, stripAnsi, isTTY } from '../../../src/cli/format/colors.js';

describe('color functions', () => {
  it('wraps text in ANSI green', () => {
    const result = green('hello');
    expect(result).toBe('\x1b[32mhello\x1b[0m');
  });

  it('wraps text in ANSI red', () => {
    const result = red('hello');
    expect(result).toBe('\x1b[31mhello\x1b[0m');
  });

  it('wraps text in ANSI yellow', () => {
    const result = yellow('hello');
    expect(result).toBe('\x1b[33mhello\x1b[0m');
  });

  it('wraps text in ANSI blue', () => {
    const result = blue('hello');
    expect(result).toBe('\x1b[34mhello\x1b[0m');
  });

  it('wraps text in ANSI purple', () => {
    const result = purple('hello');
    expect(result).toBe('\x1b[35mhello\x1b[0m');
  });

  it('wraps text in ANSI dim', () => {
    const result = dim('hello');
    expect(result).toBe('\x1b[2mhello\x1b[0m');
  });

  it('wraps text in ANSI bold', () => {
    const result = bold('hello');
    expect(result).toBe('\x1b[1mhello\x1b[0m');
  });
});

describe('stripAnsi', () => {
  it('strips ANSI codes from colored text', () => {
    expect(stripAnsi('\x1b[32mhello\x1b[0m')).toBe('hello');
  });

  it('strips nested ANSI codes', () => {
    expect(stripAnsi('\x1b[1m\x1b[32mhello\x1b[0m\x1b[0m')).toBe('hello');
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsi('hello world')).toBe('hello world');
  });
});

describe('isTTY', () => {
  it('returns a boolean', () => {
    expect(typeof isTTY()).toBe('boolean');
  });
});
