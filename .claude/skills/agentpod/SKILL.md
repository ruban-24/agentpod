---
name: agentpod
description: Use when a task involves changes to multiple files, multiple independent subtasks, or anything beyond a trivial single-file edit in a git repository. Creates isolated worktrees so work doesn't touch main until verified and merged.
---

# agentpod

**All non-trivial work goes through agentpod.** If you are about to edit files directly on main and the change touches more than one file, stop — create an agentpod task first.

You have access to `agentpod`, a CLI tool for managing isolated git worktrees. Each task gets its own branch and worktree directory. Nothing touches the main branch until you explicitly merge.

**You are the agent.** Create tasks, `cd` into their worktree paths, do your work there (edit files, run commands), then verify and merge back.

## When to Use

- The task has 2+ independent parts that touch different files — create a task per part
- The change modifies more than one file — isolate it
- The change is risky (refactor, migration, dependency change) — isolate it
- You want to verify before merging (tests, lint, build)

**Only skip agentpod for:** single-file trivial fixes (typos, config tweaks, one-line changes), or non-git projects.

## Workflow

### Step 1: Create a task

```bash
agentpod task create --prompt "Implement caching using Redis"
```

This returns JSON with `id` and `worktree` (the directory path).

### Step 2: Work inside the worktree

`cd` into the worktree path and do your work there — edit files, run commands, install packages. This is a full copy of the repo on its own git branch.

```bash
cd <worktree-path>
# Now edit files, run tests, etc. — all isolated from main
```

### Step 3: Verify

```bash
agentpod verify <id>
```

Runs the configured verification commands (tests, lint, build). Check the output — if anything fails, fix it in the worktree and re-verify.

### Step 4: Review and merge

```bash
agentpod diff <id>         # See what changed
agentpod merge <id>        # Merge into current branch
agentpod clean             # Remove finished task worktrees
```

## Multiple Approaches

When the user wants you to explore alternatives:

```bash
# Create one task per approach
agentpod task create --prompt "Approach A: use Redis"
agentpod task create --prompt "Approach B: use in-memory LRU"

# Work on each — cd into each worktree and implement
# Then verify both
agentpod verify <id1>
agentpod verify <id2>

# Compare them
agentpod compare <id1> <id2>

# Present results to the user, merge the winner
agentpod merge <winner-id>
agentpod discard <loser-id>
agentpod clean
```

## When Things Fail

```bash
agentpod diff <id>           # See what you changed
agentpod discard <id>        # Throw it away
# Create a new task and try again with a different approach
```

## Command Reference

| Command | Purpose |
|---------|---------|
| `agentpod task create --prompt <text>` | Create isolated task — returns `id` and `worktree` path |
| `agentpod task status <id>` | Get task details |
| `agentpod list` | List all tasks |
| `agentpod verify <id>` | Run verification checks (tests, lint, build) |
| `agentpod diff <id>` | Show changes vs base branch |
| `agentpod compare <id1> <id2> [...]` | Side-by-side task comparison |
| `agentpod merge <id>` | Merge task branch into current branch |
| `agentpod discard <id>` | Remove task worktree and branch |
| `agentpod clean` | Clean up all finished tasks |

All commands output JSON — parse the output to get task IDs, worktree paths, and status.

## Key Details

- `task create` returns `{ "id": "...", "worktree": "/path/to/worktree", ... }` — use the `worktree` path to `cd` into
- Always `verify` before `merge`
- Always `compare` when you have multiple tasks
- Always `clean` after merging/discarding
- Merge conflicts auto-abort and preserve the worktree so you can fix and retry
- `cd` back to the original repo directory before running `merge` or other agentpod commands
