# Cetana V0 / V0.5

Local Mac orchestration for Atta. Claude Desktop (Strategist) dispatches Claude Code agents (Executors) into git worktrees of this monorepo, watches them work, and unblocks them when they hit decision points — all over MCP.

## Quick start (CLI — V0.5)

```bash
cd /path/to/attaai
(cd apps/cetana-ai/cli && bun link)
cetana init
cetana dispatch <issue-number>
```

`cetana init` walks you through setup interactively — no manual JSON editing required.

## Daily use

### `cetana init`

One-time interactive setup. Detects your git repo and GitHub auth, writes config (repo-local `.cetana.json` or global `~/.cetana/config.json`), and runs a smoke test.

```bash
cetana init
```

### `cetana dispatch <issue-number>`

Dispatch a Claude Code agent for a GitHub issue. Creates a worktree, spawns the agent, returns a task ID.

```bash
cetana dispatch 29
cetana dispatch 42 --brief-file ~/briefs/issue-42.md
cetana dispatch 29 --model claude-opus-4-5
```

### `cetana list`

Point-in-time view of running and blocked tasks.

```bash
cetana list
cetana list --json
```

### `cetana reply <task-id> "<message>"`

Unblock a blocked agent from the terminal without opening Claude Desktop.

```bash
cetana reply abc12345 "Use the acceptEdits permission mode"
```

### `cetana logs <task-id>`

Stream raw JSONL events for a task.

```bash
cetana logs abc12345
cetana logs abc12345 --follow
cetana logs abc12345 --since 2026-05-12T10:00:00Z
```

---

## MCP surface (Claude Desktop — V0)

The original V0 interface: Claude Desktop connects to the Strategist MCP server and dispatches tasks via MCP tools.

### Setup

1. Install dependencies: `bun install` from monorepo root.
2. Connect Claude Desktop. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cetana": {
      "command": "bun",
      "args": ["run", "/Users/YOU/code/atta/apps/cetana-ai/coordinator/src/mcp-server-strategist.ts"]
    }
  }
}
```

Replace `/Users/YOU/code/atta` with your actual path. Restart Claude Desktop.

3. Verify: in Claude Desktop chat: `List active Cetana tasks` → should return `No active tasks.`

### MCP tools

- **`cetana.dispatch_task`** — dispatch an agent for a GitHub issue
- **`cetana.list_active_tasks`** — view running and blocked tasks
- **`cetana.reply_to_blocked_task`** — unblock a blocked agent
- **`cetana_request_input`** (executor-side) — agent calls this when blocked

---

## Config

Cetana uses a hierarchical config: repo-local `.cetana.json` takes precedence over global `~/.cetana/config.json`.

```json
{
  "github": { "owner": "daniboomerang", "repo": "atta.ai" },
  "defaults": { "claudeModel": "claude-sonnet-4-7", "permissionMode": "acceptEdits" }
}
```

To use a GitHub token explicitly (instead of `gh auth token` fallback), add `"token": "ghp_..."` to the `github` object.

---

## Worktree cleanup

Worktrees are NOT auto-removed in V0. After a task's PR is merged:

```bash
git worktree remove ~/code/atta/.worktrees/issue-{N}
git worktree prune
```

---

## Architecture

```
apps/cetana-ai/
├── cli/              # @atta/cetana-cli — V0.5 CLI binary (this PR)
├── coordinator/      # @atta/cetana-coordinator — MCP server entry points + shared modules
└── specs/            # Architecture spec, decisions log, experiment log
```

See also:
- `apps/cetana-ai/specs/cetana-spec.md` — locked V0/V0.5 architecture (Section 10: CLI surface)
- `apps/cetana-ai/specs/cetana-decisions.md` — decision log (D-001+), especially D-020–D-023
- `apps/cetana-ai/specs/cetana-experiment-log.md` — full journey (Slice -1, architecture reviews)
- `.claude/skills/cetana-coordinator/SKILL.md` — for working inside the coordinator codebase
