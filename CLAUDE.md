## agex

This repo uses agex. The sessionStart hook (`.claude/hooks/session-start.md`) has the enforcement rules — read it if you need a refresher.

When dogfooding: always use the `agex` CLI package, never `node dist/index.js` (running from `dist/` conflicts with build output of tasks you're merging).

## Codex Review

Run `/codex:review` at two checkpoints:
1. **After writing the implementation plan** — before any code is written
2. **After all code is written** — before merging the worktree to main
