<p align="center">
  <h1 align="center">agentpod</h1>
  <p align="center">
    <strong>Your agent works in parallel. You pick the winner.</strong>
  </p>
  <p align="center">
    Isolate. Execute. Verify. Compare. Merge or discard.
  </p>
  <p align="center">
    <a href="https://github.com/ruban-24/agentpod/actions"><img src="https://github.com/ruban-24/agentpod/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://www.npmjs.com/package/agentpod"><img src="https://img.shields.io/npm/v/agentpod.svg" alt="npm version"></a>
    <a href="https://github.com/ruban-24/agentpod/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/agentpod.svg" alt="license"></a>
    <a href="https://www.npmjs.com/package/agentpod"><img src="https://img.shields.io/node/v/agentpod.svg" alt="node version"></a>
  </p>
</p>

<!-- TODO: Uncomment after recording with VHS -->
<!-- <p align="center">
  <img src="./docs/demo.gif" alt="agentpod demo" width="800">
</p> -->

---

## Why agentpod?

AI coding agents are fast — but they work on your branch, one task at a time.

**What if you could run 5 agents in parallel, each in an isolated workspace, and pick the best result?**

agentpod gives your agent a fleet of git worktrees. Each task gets its own branch — full isolation, no conflicts. Your agent creates tasks, runs them in parallel, verifies results automatically, and you decide what ships.

**For you:** install, init, go back to what you were doing. Check in when you want with `agentpod summary --human`.

**For your agent:** 14 commands covering the full lifecycle — create, execute, verify, compare, merge, discard. JSON output by default. Agent skill files for auto-discovery.

**No cloud. No accounts. No team buy-in needed.** Everything lives in `.agentpod/` (gitignored) and optional skill files (committed).

## How It Works

```
1. You run    →  agentpod init             →  guided setup, drops agent skill files
2. Agent works →  creates tasks in parallel  →  isolated worktrees, auto-verification
3. You decide  →  agentpod summary --human   →  merge the winner, discard the rest
```

That's the whole model. You run one command. Your agent does the rest. You check in when you want.

**Under the hood**, your agent uses agentpod to:
- Create isolated git worktrees (one per task, own branch)
- Execute commands in each worktree (other agents, scripts, anything)
- Run verification (tests, lint, build) automatically
- Compare results side-by-side
- Merge the best approach into your branch

## Get Started

```bash
npm install -g agentpod
cd your-project
agentpod init
```

Requires **Node.js >= 20** and **git**.

`agentpod init` auto-detects your project, asks a few questions, and drops a skill file so your agent discovers agentpod automatically. After init, go back to your agent and give it a task:

> *"Use agentpod to try 3 different approaches to refactor the auth module, then compare and merge the best one."*

## 🤖 Agent Setup Guides

agentpod works with any agent that can run shell commands. Here's how to set it up with popular tools:

### Claude Code

Claude Code can use agentpod directly since it has shell access. Just tell it:

```
Use agentpod to try 3 different approaches to refactor the auth module.
Run agentpod init first if .agentpod/ doesn't exist.
```

Or add agentpod as an MCP server for native tool discovery (see [MCP Server](#mcp-server) below).

**Cross-agent orchestration** — Claude Code can delegate subtasks to other agents:

```
Use agentpod to run these in parallel:
- "claude -p 'refactor auth'" for approach 1
- "codex -q 'refactor auth'" for approach 2
Then compare and merge the best one.
```

### Codex CLI

Codex CLI runs commands in a sandbox. Use agentpod to give it isolated workspaces:

```bash
agentpod task create --prompt "fix login bug"
agentpod task exec <id> --cmd "codex -q 'fix the login bug'" --wait
agentpod verify <id>
```

### Aider

Aider works well with agentpod's workspace-only path:

```bash
agentpod task create --prompt "add caching layer"
cd .agentpod/worktrees/<id>/
aider --message "add a caching layer to the API"
cd -
agentpod verify <id>
```

Or use the subprocess path:

```bash
agentpod run --prompt "add caching" \
  --cmd "aider --yes --message 'add a caching layer'" --wait
```

### Cursor / Windsurf / Other IDE Agents

IDE-based agents can't call agentpod directly, but you can set up workspaces for them:

```bash
# Create an isolated workspace
agentpod task create --prompt "redesign settings page"

# Open the worktree in your IDE
code .agentpod/worktrees/<id>/

# After the agent finishes, verify and merge from the terminal
agentpod verify <id>
agentpod merge <id>
```

### Any CLI Agent

If it can run in a shell, it works with agentpod:

```bash
agentpod run --prompt "description of task" \
  --cmd "your-agent-cli 'instructions'" --wait
```

## Commands

All commands output JSON by default (agent-first). Add `--human` for colored terminal output.

### Task Lifecycle

| Command | Description |
|---------|-------------|
| `agentpod init [--verify <cmds...>]` | Initialize agentpod in the current repo |
| `agentpod task create --prompt "..."` | Create an isolated workspace |
| `agentpod task exec <id> --cmd "..." [--wait]` | Run a command in a task's worktree |
| `agentpod run --prompt "..." --cmd "..." [--wait]` | Shortcut: create + exec |

### Monitoring

| Command | Description |
|---------|-------------|
| `agentpod task status <id>` | Get detailed task info |
| `agentpod list` | List all tasks |
| `agentpod log <id>` | Show captured agent output |
| `agentpod summary` | Status breakdown of all tasks |

### Review

| Command | Description |
|---------|-------------|
| `agentpod verify <id>` | Run verification checks |
| `agentpod diff <id>` | Diff stats, commits, per-file changes |
| `agentpod compare <id1> <id2> ...` | Compare tasks side-by-side |

### Resolution

| Command | Description |
|---------|-------------|
| `agentpod merge <id>` | Merge task branch into current branch |
| `agentpod discard <id>` | Remove task worktree and branch |
| `agentpod clean` | Clean up all finished tasks |

## Configuration

Create `.agentpod/config.yml` (or pass `--verify` to `init`):

```yaml
# Commands to verify task results
verify:
  - "npm test"
  - "npm run lint"
  - "npm run build"

# Files to copy into each worktree (e.g., secrets not in git)
copy:
  - ".env"
  - "config/local.json"

# Directories to symlink into worktrees (shared, not copied)
symlink:
  - "node_modules"

# Commands to run after workspace creation
setup:
  - "npm install"
```

### Auto-Detection

If no `verify` commands are configured, agentpod auto-detects from your project:

| File | Detected commands |
|------|-------------------|
| `package.json` | `npm test`, `npm run lint`, `npm run build` |
| `Makefile` | `make test` |
| `pyproject.toml` | `pytest` |
| `Cargo.toml` | `cargo test` |
| `go.mod` | `go test ./...` |

## Architecture

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

### Task Lifecycle

```
pending → provisioning → ready → running → verifying → completed → merged
                           │                         → failed    → discarded
                           ├──→ verifying (direct verify)
                           └──→ merged / discarded
```

## 🔌 MCP Server

agentpod includes an MCP server so agents can discover all commands as native tools. It uses **stdio transport** — no ports, no HTTP, just stdin/stdout.

Add to your MCP client config:

```json
{
  "mcpServers": {
    "agentpod": {
      "command": "agentpod-mcp",
      "args": []
    }
  }
}
```

**Claude Code** — add to `.claude/settings.json` or `~/.claude/settings.json`

**Cursor** — add to `.cursor/mcp.json`

All 14 CLI commands are exposed as MCP tools. The agent can then call `agentpod_task_create`, `agentpod_verify`, `agentpod_merge`, etc. directly.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Agent command failed |
| `2` | Verification failed |
| `3` | Merge conflict |
| `4` | Invalid arguments |
| `5` | Workspace error |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
