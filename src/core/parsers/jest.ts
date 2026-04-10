import type { ParsedError } from '../../types.js';

export function parseJest(raw: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const lines = raw.split('\n');

  let currentFile: string | undefined;
  let currentMessage: string | undefined;
  let expected: string | undefined;
  let actual: string | undefined;
  let lineNumber: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: FAIL src/auth.test.ts
    const failMatch = line.match(/^\s*FAIL\s+(.+)$/);
    if (failMatch) {
      currentFile = failMatch[1].trim();
      continue;
    }

    // Match: ● test name › sub name
    const testMatch = line.match(/^\s*●\s+(.+)$/);
    if (testMatch) {
      // Flush previous error if any
      if (currentMessage) {
        errors.push({
          file: currentFile,
          line: lineNumber,
          message: currentMessage,
          expected,
          actual,
        });
      }
      currentMessage = testMatch[1].trim();
      expected = undefined;
      actual = undefined;
      lineNumber = undefined;
      continue;
    }

    // Match: Expected: value
    const expectedMatch = line.match(/^\s*Expected:\s*(.+)$/);
    if (expectedMatch && currentMessage) {
      expected = expectedMatch[1].trim();
      continue;
    }

    // Match: Received: value
    const receivedMatch = line.match(/^\s*Received:\s*(.+)$/);
    if (receivedMatch && currentMessage) {
      actual = receivedMatch[1].trim();
      continue;
    }

    // Match line number from: "      13 |   code"  followed by "         |   ^"
    const pointerMatch = line.match(/^\s*\|?\s*\^/);
    if (pointerMatch && currentMessage && i > 0) {
      const prevLine = lines[i - 1];
      const numMatch = prevLine.match(/^\s*(\d+)\s*\|/);
      if (numMatch) {
        lineNumber = parseInt(numMatch[1], 10);
      }
      continue;
    }
  }

  // Flush last error
  if (currentMessage) {
    errors.push({
      file: currentFile,
      line: lineNumber,
      message: currentMessage,
      expected,
      actual,
    });
  }

  return errors;
}
