# Architecture

```
CLI (commander)
 ├── TaskManager      — task state machine, JSON persistence
 ├── WorkspaceManager — git worktree lifecycle, provisioning
 ├── AgentRunner      — subprocess spawn (blocking + non-blocking)
 ├── Verifier         — run checks, collect pass/fail results
 └── Reviewer         — diff stats, commit log, merge

MCP Server (stdio)
 └── wraps all 14 CLI commands as MCP tools
```

## Task Lifecycle

```
pending → provisioning → ready → running → verifying → completed → merged
                           │                         → failed    → discarded
                           ├──→ verifying (direct verify)
                           └──→ merged / discarded
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Agent command failed |
| `2` | Verification failed |
| `3` | Merge conflict |
| `4` | Invalid arguments |
| `5` | Workspace error |
