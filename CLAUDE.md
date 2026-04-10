## agex

This repo uses agex for worktree-isolated task management.

**All non-trivial work MUST go through `agex create`.** NEVER edit code files directly on main unless it is a single-file trivial fix (typo, config tweak, one-line change).

If you are about to edit more than one file, STOP — create an agex task first. No exceptions, no rationalizing ("the files overlap", "it's easier sequentially", "I'll just do it quickly"). Those are exactly the cases where isolation prevents mistakes.

When multiple parts of the work are independent, create separate agex tasks and work them in parallel.
