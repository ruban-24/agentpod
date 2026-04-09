<p align="center">
  <h1 align="center">agentpod</h1>
  <p align="center">
    <strong>Run parallel AI coding tasks safely inside real git repos.</strong>
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

## 🤔 Why agentpod?

You're using AI coding agents — Claude Code, Codex CLI, Aider, Cursor. They're fast. But they work in your repo, on your branch, one at a time.

**What if you could run 5 agents in parallel, each in an isolated workspace, and pick the best result?**

agentpod makes this safe:

- Each task gets its own git worktree — full isolation, no conflicts
- Verification runs automatically — tests, linting, builds
- Compare approaches side-by-side, merge the winner, discard the rest
- All state lives in `.agentpod/` (gitignored) — invisible to your team, no buy-in needed

Think of it as **docker-compose for AI coding tasks** — lightweight infrastructure that lets agents work in parallel without stepping on each other.

## Features

- 🔀 **Agent-agnostic** — works with any CLI-based AI coding tool
- ⚡ **Parallel execution** — run 2-10 tasks simultaneously in isolated worktrees
- 🔄 **Full lifecycle** — create, execute, verify, compare, merge or discard
- ✅ **Auto-verification** — detects test/lint/build commands from your project
- 📦 **Workspace provisioning** — copies secrets, symlinks dependencies, runs setup hooks
- 🔌 **MCP server** — agents discover agentpod natively via Model Context Protocol
- 🏠 **Local-first** — no cloud, no accounts, no dependencies beyond git and Node.js

## Install

```bash
npm install -g agentpod
```

Requires **Node.js >= 20** and **git**.

## 🚀 Quick Start

```bash
# 1. Initialize in your repo
agentpod init --verify "npm test"

# 2. Run a task (create workspace + execute)
agentpod run --prompt "refactor auth to use JWT" \
  --cmd "claude -p 'refactor auth'" --wait

# 3. Check results
agentpod verify <id>
agentpod diff <id>

# 4. Accept or reject
agentpod merge <id>     # merge into current branch
agentpod discard <id>   # throw it away
agentpod clean          # remove finished task worktrees
```

## How It Works

```
You tell your agent:  "try 3 approaches to refactor auth"

Your agent calls agentpod:
  agentpod run --prompt "JWT approach"      --cmd "claude -p '...'"  --wait
  agentpod run --prompt "sessions approach" --cmd "codex -q '...'"   --wait
  agentpod run --prompt "OAuth approach"    --cmd "aider '...'"      --wait

Your agent reviews:
  agentpod compare <id1> <id2> <id3>
  agentpod merge <best-id>
  agentpod clean
```

**Two execution paths:**

| Path | Command | Use case |
|------|---------|----------|
| **Workspace only** | `agentpod task create` | Agent works in the worktree directly |
| **Workspace + subprocess** | `agentpod run --cmd "..."` | Delegate work to a different agent |

The subprocess path is what makes agentpod agent-agnostic — Claude Code can dispatch work to Codex, Aider, or any CLI tool.

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
