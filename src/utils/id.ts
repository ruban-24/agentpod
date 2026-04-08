import { randomBytes } from 'node:crypto';

export function generateTaskId(): string {
  return randomBytes(3).toString('hex');
}
