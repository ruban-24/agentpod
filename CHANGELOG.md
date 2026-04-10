# Changelog

## 0.2.0 — 2026-04-11

### Features

- **Retry with feedback** (`agex retry <id> --feedback "..."`): Create a new task branching from a failed task's branch with an enhanced prompt containing the original prompt, structured failure context, and human feedback. Supports `--from-scratch` (branch from main), `--dry-run` (preview prompt), and `--wait`.
- **Needs-input state** (`agex respond <id> --answer "..."`): Agents can pause and ask questions by writing `.agex/needs-input.json` in their worktree. agex detects it, pauses the task, and the human responds. The agent is re-invoked with full Q&A context. Supports multiple rounds.
- **Structured verify output**: Verify commands accept parser configuration (`{ cmd: "npm test", parser: jest }`). Built-in parsers for jest/vitest, TypeScript, ESLint, and pytest extract file, line, message, expected/actual from raw output.
- **`task list` alias**: `agex task list` now works as an alias for the top-level `list` command.
- **MCP tools**: `agex_retry` and `agex_respond` added to the MCP server.
- **Dynamic version**: CLI version now reads from package.json instead of being hardcoded.

### Improvements

- **Human formatter updates**: `agex status --human` now shows parsed verify errors with file:line and expected/actual, needs-input questions with options, retry lineage, and contextual next-action hints for all states.
- **SKILL.md updates**: Added "When You're Stuck" section, "Retry with Feedback" workflow, updated command reference and common mistakes table, clarified verify vs direct test runs.
- **Unified task directory**: Renamed `.agex/worktrees/` to `.agex/tasks/` — worktree directories now live alongside task JSON files under a single directory.

### Breaking Changes

- **Directory rename**: `.agex/worktrees/` is now `.agex/tasks/`. Existing tasks created with v0.1.x will not be found. Run `agex clean` before upgrading, or manually move worktree directories.

## 0.1.1 — 2026-04-10

### Bug Fixes

- **Fix EEXIST crash during worktree provisioning**: `task create` no longer crashes when the symlink destination already exists (e.g. `node_modules` created by `git worktree add`). The symlink step now skips EEXIST gracefully.
- **Allow discard from provisioning state**: Tasks stuck in `provisioning` from a failed `task create` can now be discarded and cleaned up.
- **Fix `agex init` not exiting**: Interactive init could leave readline handles open, preventing the process from exiting.

## 0.1.0 — 2026-04-10

Initial public release.

### Features

- **Task lifecycle**: create, execute, verify, diff, compare, merge, discard, clean
- **Isolated workspaces** via git worktrees with automatic branch management
- **Blocking and non-blocking execution** with background lifecycle completion
- **Verification system** with configurable check commands and auto-detection (package.json, Makefile, pyproject.toml, Cargo.toml, go.mod)
- **Workspace provisioning**: file copy, symlink, setup hooks
- **Port isolation** via `AGEX_PORT` environment variable
- **Diff and compare**: stats, commit log, per-file changes, side-by-side comparison
- **Merge with conflict detection**: fast-forward or merge commit, worktree restored on conflict
- **Auto-commit uncommitted worktree changes** on merge, warn on discard/clean
- **Auto-infer task ID** from cwd when running inside a worktree
- **Interactive init** with guided setup and agent skill file generation
- **JSON output by default** (agent-first), `--human` flag for colored terminal output
- **MCP server** exposing all 14 commands as tools
- **Task state machine** with enforced valid transitions
- **Agent skill files** for Claude Code, Codex CLI, and Copilot CLI auto-discovery
