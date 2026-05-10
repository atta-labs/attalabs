# Cetana V0

Local Mac orchestration for Atta. Claude Desktop (Strategist) dispatches Claude Code agents (Executors) into git worktrees of this monorepo, watches them work, and unblocks them when they hit decision points — all over MCP.

## Quick start

### 1. Install dependencies

From the monorepo root: `bun install` (installs everything).

### 2. Configure

On first run, `~/.cetana/config.json` is created automatically with defaults:

```json
{
  "github": { "owner": "daniboomerang", "repo": "atta.ai" },
  "defaults": { "claudeModel": "claude-sonnet-4-7", "permissionMode": "acceptEdits" }
}
```

To use a GitHub token explicitly (instead of `gh auth token` fallback), add `"token": "ghp_..."` to the `github` object.

### 3. Connect Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### 4. Verify

In Claude Desktop chat: `List active Cetana tasks` → should return `No active tasks.`

## Usage

### Dispatch a task

> "Dispatch Cetana task for GitHub Issue #42 with this brief: [your brief here]"

Cetana creates a worktree at `~/code/atta/.worktrees/issue-42/`, spawns a Claude Code agent, posts a GitHub comment, and returns a `taskId`.

### Monitor tasks

> "List active Cetana tasks"

Shows running tasks and any pending questions from blocked agents.

### Unblock an agent

When an agent calls `cetana_request_input`, it blocks and surfaces a question. Unblock via:

> "Reply to Cetana task {taskId}: [your answer]"

The agent resumes immediately with your reply as the tool result.

### Watch logs

```bash
tail -f ~/.cetana/tasks/<task-id>.jsonl
```

## Worktree cleanup

Worktrees are NOT auto-removed in V0. After a task's PR is merged:

```bash
git worktree remove ~/code/atta/.worktrees/issue-{N}
git worktree prune
```

## See also

- `apps/cetana-ai/specs/cetana-v0-spec.md` — locked V0 architecture
- `apps/cetana-ai/specs/cetana-experiment-log.md` — full journey (Slice -1, architecture reviews)
- `apps/cetana-ai/specs/cetana-decisions.md` — decision log (D-001+)
- `.claude/skills/cetana-coordinator/SKILL.md` — for working inside the codebase
