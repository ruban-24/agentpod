# v0.2.0 Design Spec: Agent Autonomy

Three features that complete the single-task lifecycle: structured verify output (#10), retry with feedback (#12), and needs-input state (#27).

## Design Decisions

### Two-gate verification model
Verify stays as-is: fast shell commands, exit code checks. Structured parsers enhance verify output with actionable error details. Regression guard (baseline snapshots, before/after comparison) deferred — non-deterministic baselines, flaky test poisoning, and language-specific export parsing need their own design pass.

### Retry creates + executes by default
`agex retry` is a one-shot: create new task, construct enhanced prompt, execute agent. `--dry-run` previews the prompt without creating a task. `--from-scratch` branches from main instead of the failed task's branch.

### Needs-input uses file detection only
Agent writes `.agex/needs-input.json` in the worktree. agex detects it after agent process exits (any exit code). No exit code convention — AI agents don't naturally control their own exit codes. The file is the source of truth.

### No acceptance criteria framework
The original acceptance criteria design (LLM review, custom quality gates, scoring) was scrapped. Most proposed checks were just verify commands with different names. LLM review and quality scoring deferred to when fan-out (#9) needs them.

---

## State Machine Changes

### New states

- `needs-input` — agent signaled it needs a human decision before continuing
- `retried` — task has been superseded by a retry (terminal)

### New transitions

```
running    → needs-input    (needs-input.json detected after agent exit)
needs-input → running       (via agex respond)
needs-input → discarded     (human abandons)
failed     → retried        (via agex retry)
errored    → retried        (via agex retry)
completed  → retried        (via agex retry — "works but wrong approach")
```

### Full transition table (updated)

```
pending       → [provisioning]
provisioning  → [ready, errored]
ready         → [running, verifying, merged, discarded]
running       → [verifying, needs-input, errored]
verifying     → [completed, failed]
completed     → [merged, discarded, retried]
failed        → [merged, discarded, retried]
errored       → [discarded, retried]
needs-input   → [running, discarded]
merged        → []
discarded     → []
retried       → []
```

---

## Schema Changes

### TaskRecord new fields

```typescript
interface TaskRecord {
  // ... existing fields unchanged ...

  // Retry (#12)
  retriedFrom?: string;       // task ID this was retried from
  retryDepth?: number;        // 0 = original, 1 = first retry, etc.
  retryFeedback?: string;     // human's feedback that triggered this retry
  retryFromScratch?: boolean; // true if branched from main instead of failed task

  // Needs-input (#27)
  needsInput?: NeedsInputPayload;
  responses?: QAPair[];       // history of all Q&A rounds
}
```

### New types

```typescript
interface NeedsInputPayload {
  question: string;
  options?: string[];     // optional multiple choice
  context?: string;       // agent can provide additional context
}

interface QAPair {
  question: string;
  answer: string;
  round: number;          // 1-indexed
}

interface ParsedError {
  file?: string;
  line?: number;
  message: string;
  rule?: string;          // eslint rule, ts error code
  expected?: string;      // for test assertions
  actual?: string;
}
```

### Modified types

```typescript
// Verify config — backwards compatible
type VerifyCommand = string | { cmd: string; parser?: string };

interface AgexConfig {
  verify?: VerifyCommand[];   // was string[], now accepts objects too
  // ... rest unchanged ...
}

// VerificationCheck — one new field
interface VerificationCheck {
  cmd: string;
  passed: boolean;
  exit_code: number;
  duration_s: number;
  output?: string;          // raw output (existing)
  parsed?: ParsedError[];   // NEW: structured errors from parser
}
```

### New TaskStatus values

```typescript
type TaskStatus =
  | 'pending'
  | 'provisioning'
  | 'ready'
  | 'running'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'errored'
  | 'merged'
  | 'discarded'
  | 'needs-input'    // NEW
  | 'retried';       // NEW
```

---

## New Commands

### `agex retry <taskId> --feedback "..." [--from-scratch] [--dry-run] [--wait]`

**Flow:**

1. Load original task, validate status is `failed`, `errored`, or `completed`
2. If `--dry-run`: build prompt, print to stdout, exit (no task created)
3. Construct enhanced prompt:
   - Original task prompt
   - `## Previous attempt failed` section with verify output (prefers parsed errors, falls back to raw truncated to last 30 lines)
   - `## Feedback` section with human's feedback string
4. Determine base branch:
   - Default: branch from `agex/{originalTaskId}` (inherits previous code)
   - `--from-scratch`: branch from main/HEAD (clean slate)
5. Create new task with new ID, worktree, branch
   - Store `retriedFrom`, `retryDepth`, `retryFeedback`, `retryFromScratch`
   - Inherit `cmd` from original task
6. Transition original task to `retried`
7. Execute agent with enhanced prompt
   - `--wait` for blocking, default non-blocking

**Prompt construction:**

```typescript
function buildRetryPrompt(original: TaskRecord, feedback: string): string {
  let prompt = original.prompt;

  if (original.verification && !original.verification.passed) {
    prompt += '\n\n## Previous attempt failed\n';
    for (const check of original.verification.checks) {
      if (!check.passed) {
        prompt += `\n### ${check.cmd} (exit ${check.exit_code})\n`;
        if (check.parsed && check.parsed.length > 0) {
          for (const err of check.parsed) {
            prompt += `- ${err.file || ''}`;
            if (err.line) prompt += `:${err.line}`;
            prompt += ` — ${err.message}`;
            if (err.expected) prompt += `\n  Expected: ${err.expected}`;
            if (err.actual) prompt += `\n  Actual: ${err.actual}`;
            prompt += '\n';
          }
        } else if (check.output) {
          const lines = check.output.split('\n');
          const tail = lines.slice(-30).join('\n');
          prompt += `\`\`\`\n${tail}\n\`\`\`\n`;
        }
      }
    }
  }

  prompt += `\n\n## Feedback\n${feedback}`;
  return prompt;
}
```

### `agex respond <taskId> --answer "..."`

**Flow:**

1. Load task, validate status is `needs-input`
2. Read `needsInput` payload from task JSON
3. Append to `responses` array: `{ question: needsInput.question, answer, round }`
4. Clear `needsInput` field
5. Reconstruct prompt with all Q&A history:
   - Original task prompt
   - `## Previous Q&A` section with all rounds
6. Transition `needs-input` → `running`
7. Re-execute agent with reconstructed prompt in the same worktree

### Modified: `task-exec.ts` completion handler

Both blocking and non-blocking paths get the same change. After agent process exits:

```
agent exits
  → check for .agex/needs-input.json in worktree
     FOUND:
       → parse the JSON (validate against NeedsInputPayload shape)
       → if malformed (missing 'question' field or invalid JSON): log warning,
         treat as not found, proceed to verify as normal
       → store as needsInput on task record
       → delete the file from worktree
       → transition running → needs-input
       → STOP (no verify)
     NOT FOUND:
       → proceed to verify as normal
       → verify runs with parsers (structured output)
       → completed/failed as normal
```

---

## Parser System

### Interface

```typescript
type OutputParser = (raw: string) => ParsedError[];
```

Pure functions. No async, no side effects, no dependencies. Regex over text. Best-effort — return empty array if output format is unexpected.

### Registry

```typescript
// src/core/parsers/index.ts
const PARSERS: Record<string, OutputParser> = {
  jest: parseJest,
  vitest: parseVitest,
  pytest: parsePytest,
  typescript: parseTypescript,
  eslint: parseEslint,
};

export function getParser(name: string): OutputParser | undefined {
  return PARSERS[name];
}
```

### Parser details

**jest / vitest** (same output format):
- Pattern: `FAIL <filepath>` for file, `● <test name>` for message
- Extract `Expected:` / `Received:` values
- Line number from code pointer (`| ^`)

**typescript** (`tsc --noEmit`):
- Pattern: `<file>(<line>,<col>): error <code>: <message>`
- Single regex, one error per line

**eslint:**
- Pattern: filepath line (starts with `/` or no indent), then `<line>:<col> error|warning <message> <rule>`
- Strip absolute path prefix for clean file paths

**pytest:**
- Pattern: `FAILED <file>::<test> - <error>` (short form)
- Also handles verbose `FAILURES` section with `>` markers

### Adding new parsers

One function, one registry line:

```typescript
// src/core/parsers/go.ts
export function parseGo(raw: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const pattern = /^(.+?):(\d+):\d+:\s*(.+)$/gm;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    errors.push({ file: match[1], line: parseInt(match[2]), message: match[3] });
  }
  return errors;
}

// src/core/parsers/index.ts — add one line:
import { parseGo } from './go.js';
// PARSERS.go = parseGo;
```

### Verifier integration

`verifier.ts` changes:
- Accept `VerifyCommand[]` instead of `string[]`
- For each command: normalize to `{ cmd, parser? }`
- After running command, if parser specified: `getParser(name)?.(output)`
- Store result in `check.parsed`
- Unknown parser name: log warning, skip parsing, raw output preserved

---

## Human Formatter Changes

### `agex status <id>`

- `needs-input`: show question and options prominently, indicate human action needed
- `retried`: show "Superseded by {retryTaskId}", dim styling
- Parsed verify errors: show structured errors instead of just "2/3 checks passed"
- Retry lineage: "Retry of abc123 (depth: 2)"

### `agex summary`

- `needs-input` tasks highlighted with the question text (these need human action)
- `retried` tasks dimmed or collapsed
- Retry depth indicator: `def456 (retry x2)`
- Count of tasks needing input in summary line

### `agex retry --dry-run`

- Full constructed prompt in bordered box
- Clear "No task created. Remove --dry-run to execute." footer

### `agex respond`

- Confirmation: "Answer saved. Resuming task abc123..."

---

## Config Changes

`verify` field evolves from `string[]` to `VerifyCommand[]`. Backwards compatible:

```yaml
# Before (still works)
verify:
  - "npm test"
  - "npm run lint"

# After (new format, can mix)
verify:
  - cmd: "npm test"
    parser: jest
  - cmd: "tsc --noEmit"
    parser: typescript
  - "npm run lint"          # plain string, no parser
```

No new top-level config sections for v0.2.0.

---

## MCP Tool Additions

Two new tools in `src/mcp/tools.ts`:

- `agex_retry` — mirrors `agex retry` CLI command
- `agex_respond` — mirrors `agex respond` CLI command

---

## Files Touched

| Feature | New files | Modified files |
|---------|-----------|----------------|
| Structured verify (#10) | `src/core/parsers/index.ts`, `src/core/parsers/jest.ts`, `src/core/parsers/typescript.ts`, `src/core/parsers/eslint.ts`, `src/core/parsers/pytest.ts` | `src/types.ts`, `src/core/verifier.ts`, `src/cli/commands/verify.ts`, `src/config/loader.ts`, `src/cli/format/human.ts` |
| Retry (#12) | `src/cli/commands/retry.ts` | `src/types.ts`, `src/core/task-manager.ts`, `src/index.ts`, `src/mcp/tools.ts`, `src/cli/format/human.ts` |
| Needs-input (#27) | `src/cli/commands/respond.ts` | `src/types.ts`, `src/core/task-manager.ts`, `src/cli/commands/task-exec.ts`, `src/index.ts`, `src/mcp/tools.ts`, `src/cli/format/human.ts` |

---

## Testing Strategy

- **Parsers:** Unit tests with real output fixtures. One fixture file per parser containing actual tool output. Assert on extracted `ParsedError[]`.
- **Retry:** Integration test: create task → fail verify → retry with feedback → verify new task has correct prompt, retriedFrom, retryDepth. Test `--from-scratch` branches from main. Test `--dry-run` prints prompt without creating task.
- **Needs-input:** Integration test: create task → mock agent that writes needs-input.json → verify task transitions to needs-input → respond → verify task re-executes with Q&A context.
- **State machine:** Unit tests for new transitions. Verify invalid transitions throw (e.g., `completed → needs-input` should fail).

---

## Out of Scope

- Regression guard / baseline snapshots — deferred, needs own design pass
- LLM review / acceptance criteria framework — deferred to fan-out (#9)
- Auto-merge integration — v0.3.0
- Notifications on needs-input — v0.4.0 (#17)
- CONTRIBUTING.md with state machine docs — implementation plan task
