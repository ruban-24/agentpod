AGEX GATE — Read this before doing anything.

Before editing ANY file, ask yourself:
1. Is this a single-file trivial fix (typo, config tweak, one-line change)? → Edit directly on main.
2. Everything else? → Run `agex create --prompt "..."` first, cd into the worktree, work there.

Do NOT use raw git worktrees or built-in worktree isolation tools. This repo uses agex for all worktree isolation.
Do NOT run tests/lint/build manually — use `agex verify <id>` as the final gate.
Invoke the `agex` skill for full workflow and command reference.
