# v0.2.0 Implementation Session Prompt

Copy everything below the line into a new Claude Code session.

---

## Task

Implement the v0.2.0 "Agent Autonomy" features for agex using the subagent-driven-development approach.

**Read these files first:**
- `docs/specs/2026-04-10-v020-agent-autonomy-design.md` — the design spec
- `docs/specs/2026-04-10-v020-implementation-plan.md` — the implementation plan (13 tasks, TDD, all code provided)

**Execute the plan using the `superpowers:subagent-driven-development` skill.** Dispatch one subagent per task. Tasks 2-4 (jest, typescript/eslint, pytest parsers) are independent and can run in parallel.

**There is a 14th task not in the plan — add it after Task 12:**

### Task 14: Update SKILL.md and skill-writer.ts with v0.2.0 features

The agex SKILL.md is how agents learn to use agex. It's the primary interface — more important than MCP tools. Two files need updating:

1. **`skills/agex/SKILL.md`** — the canonical full reference. Add:
   - New states in the lifecycle diagram: `needs-input` and `retried`
   - New workflow section: "When You're Stuck" — explains writing `.agex/needs-input.json` with `{"question": "...", "options": [...]}` and exiting, so agex pauses the task and the human responds with `agex respond`
   - Updated "Discard and Retry" section → rename to "Retry with Feedback" — use `agex retry <id> --feedback "..."` instead of discard-and-recreate. Explain that retry branches from your existing work (not from scratch) and constructs an enhanced prompt with your previous failure context
   - New command reference entries: `agex retry`, `agex respond`
   - Updated verify config example showing parser syntax: `{ cmd: "npm test", parser: jest }`
   - In "Common Mistakes" table: add "Discarding and recreating instead of retrying" → "Use `agex retry --feedback` to build on previous work"
   - In "Common Mistakes" table: add "Erroring out when stuck on a decision" → "Write `.agex/needs-input.json` and exit — the human will respond"

2. **`src/cli/skill-writer.ts`** — the inline `SKILL_CONTENT` constant (compact version). Add:
   - `agex retry` and `agex respond` to the command reference table
   - Brief "When You're Stuck" section explaining needs-input.json
   - Updated "When Things Fail" section to show `agex retry` instead of discard-and-recreate
   - Updated lifecycle: `running -> needs-input -> running (after respond)` and `failed -> retried (after retry)`

**Keep both files in sync.** The inline version is a condensed form of the canonical file. Follow the existing patterns — the skill file is agent-facing, imperative, no fluff.

Also update `tests/cli/skill-writer.test.ts` to verify the new content sections exist.

## Constraints

- Follow CLAUDE.md — all work through agex tasks, no direct edits on main
- TDD: write failing test first, then implement, then verify
- Commit after each task
- Run full test suite after Tasks 5, 8, 9, 10, and 13 (regression checkpoints)
- The `verify` config type changed from `string[]` to `VerifyCommand[]` — make sure all existing tests handle both formats
- `checkNeedsInput` in task-exec.ts must be exported (respond.ts imports it)
- Parser tests use inline fixture strings, not external fixture files
