const ESC = '\x1b[';
const RESET = '\x1b[0m';

function wrap(code: number, text: string): string {
  return `${ESC}${code}m${text}${RESET}`;
}

export function green(text: string): string { return wrap(32, text); }
export function red(text: string): string { return wrap(31, text); }
export function yellow(text: string): string { return wrap(33, text); }
export function blue(text: string): string { return wrap(34, text); }
export function purple(text: string): string { return wrap(35, text); }
export function dim(text: string): string { return wrap(2, text); }
export function bold(text: string): string { return wrap(1, text); }

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}
