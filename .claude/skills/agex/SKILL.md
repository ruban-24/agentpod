---
name: agex
description: Use when a task involves changes to multiple files, multiple independent subtasks, or anything beyond a trivial single-file edit in a git repository. Creates isolated worktrees so work doesn't touch main until verified and merged.
---

# agex

**All non-trivial work goes through agex.** If you are about to edit files directly on main and the change touches more than one file, stop — create an agex task first.

You have access to `agex`, a CLI tool for managing isolated git worktrees. Each task gets its own branch and worktree directory. Nothing touches the main branch until you explicitly merge.

**You are the agent.** Create tasks, `cd` into their worktree paths, do your work there (edit files, run commands), then verify and merge back.

## When to Use

- The task has 2+ independent parts that touch different files — create a task per part
- The change modifies more than one file — isolate it
- The change is risky (refactor, migration, dependency change) — isolate it
- You want to verify before merging (tests, lint, build)

**Only skip agex for:** single-file trivial fixes (typos, config tweaks, one-line changes), or non-git projects.

## Workflow

### Step 1: Create a task

```bash
agex create --prompt "Implement caching using Redis"
agex create --issue 45
agex create --issue owner/repo#45
agex create --issue 45 --prompt "Focus on the Redis approach"
```

This returns JSON with `id`, `worktree`, and `absolute_worktree` (the full absolute path — use this to `cd` into the worktree). `--prompt` and `--issue` can be used together: the issue content provides context and the prompt adds additional instructions.

### Step 2: Work inside the worktree

`cd` into the `absolute_worktree` path from the JSON output and do your work there — edit files, run commands, install packages. This is a full copy of the repo on its own git branch.

```bash
cd <absolute_worktree>
# Now edit files, run tests, etc. — all isolated from main
```

### Step 3: Verify

```bash
agex verify <id>
```

Runs the configured verification commands (tests, lint, build). Returns JSON with `passed: boolean` and `summary: string` at the top level. Exit code is 2 when checks fail (check `$?` or the `passed` field). If anything fails, fix it in the worktree and re-verify.

### Step 4: Review and merge

```bash
agex review <id>         # See what changed
agex accept <id>        # Merge into current branch
agex clean             # Remove finished task worktrees
```

## Multiple Approaches

When the user wants you to explore alternatives:

```bash
# Create one task per approach
agex create --prompt "Approach A: use Redis"
agex create --prompt "Approach B: use in-memory LRU"

# Work on each — cd into each worktree and implement
# Then verify both
agex verify <id1>
agex verify <id2>

# Compare them
agex compare <id1> <id2>

# Present results to the user, merge the winner
agex accept <winner-id>
agex reject <loser-id>
agex clean
```

## Error Handling

Error JSON now includes a `suggestion` field with recovery hints. For example:

```json
{"error": "Task not found: abc123", "suggestion": "Run 'agex list' to see available tasks"}
```

Check the `suggestion` field for actionable next steps when a command fails.

## When Things Fail

```bash
agex review <id>           # See what you changed
agex reject <id>        # Throw it away
# Create a new task and try again with a different approach
```

## Command Reference

| Command | Purpose |
|---------|---------|
| `agex create --prompt <text> [--issue <ref>]` | Create isolated task — returns `id` and `absolute_worktree` path. `--prompt` and `--issue` can be used together (issue content + additional instructions). |
| `agex status <id>` | Get task details |
| `agex list` | List all tasks |
| `agex verify <id>` | Run verification checks (tests, lint, build) |
| `agex review <id>` | Show changes vs base branch |
| `agex compare <id1> <id2> [...]` | Side-by-side task comparison |
| `agex accept <id>` | Merge task branch into current branch |
| `agex reject <id>` | Remove task worktree and branch |
| `agex clean` | Clean up all finished tasks |

All commands output JSON — parse the output to get task IDs, worktree paths, and status.

## Key Details

- `create` returns `{ "id": "...", "worktree": "...", "absolute_worktree": "/full/path/to/worktree", ... }` — use `absolute_worktree` to `cd` into
- `verify` returns `{ "passed": true/false, "summary": "3/3 checks passed", ... }` — check `passed` for quick pass/fail
- Always `verify` before `accept`
- Always `compare` when you have multiple tasks
- Always `clean` after merging/discarding
- Merge conflicts auto-abort and preserve the worktree so you can fix and retry
- `cd` back to the original repo directory before running `accept` or other agex commands
