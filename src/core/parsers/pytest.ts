import type { ParsedError } from '../../types.js';

export function parsePytest(raw: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const seen = new Set<string>();

  // Match short-form: FAILED tests/test_auth.py::test_name - Error: message
  const shortPattern = /^FAILED\s+(.+?)::(\S+)\s*-\s*(.+)$/gm;
  let match;
  while ((match = shortPattern.exec(raw)) !== null) {
    const key = `${match[1]}::${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      errors.push({
        file: match[1],
        message: `${match[2]} — ${match[3].trim()}`,
      });
    }
  }

  // If no short-form matches, try verbose FAILURES section
  if (errors.length === 0) {
    const verbosePattern = /^(\S+\.py):(\d+):\s*(\S+)\s*$/gm;
    while ((match = verbosePattern.exec(raw)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[3],
      });
    }
  }

  return errors;
}
