export function calculatePortOffset(taskIndex: number, base: number, offset: number): number {
  return base + offset * (taskIndex + 1);
}
