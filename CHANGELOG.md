# Changelog

## 0.1.1 — 2026-04-10

### Bug Fixes

- **Fix EEXIST crash during worktree provisioning**: `task create` no longer crashes when the symlink destination already exists (e.g. `node_modules` created by `git worktree add`). The symlink step now skips EEXIST gracefully.
- **Allow discard from provisioning state**: Tasks stuck in `provisioning` from a failed `task create` can now be discarded and cleaned up.
- **Fix `agex init` not exiting**: Interactive init could leave readline handles open, preventing the process from exiting.

### Internal (v0.2.0 work-in-progress, backward compatible)

- Add `needs-input` and `retried` task states with state machine transitions
- Add `ParsedError`, `NeedsInputPayload`, `QAPair`, `VerifyCommand` types
- Add output parsers for jest/vitest, TypeScript, ESLint, and pytest
- Integrate parsers into verifier (`VerifyCommand[]` with optional `parser` field)
- Add needs-input detection in task completion handler (`.agex/needs-input.json`)

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
