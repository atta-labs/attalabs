---
name: cetana-coordinator
description: Cetana Coordinator internals — MCP servers, worktree manager, JSONL events, GitHub Octokit integration. Load when working in apps/cetana-ai/coordinator/. Do NOT load for high-level Cetana questions; read apps/cetana-ai/specs/cetana-v0-spec.md instead.
---

# Cetana Coordinator — Working Guide

## 1. When to Load This Skill

Load when:
- Working in `apps/cetana-ai/coordinator/src/` or `tests/`
- Adding or modifying MCP tools
- Debugging the dispatch flow or escalation handoff
- Modifying worktree management or JSONL event types
- Modifying either MCP server entry point

Do NOT load for:
- High-level architectural questions → read `apps/cetana-ai/specs/cetana-v0-spec.md`
- "How does Cetana work overall?" → read `apps/cetana-ai/README.md` and the spec

---

## 2. Directory Structure

```
apps/cetana-ai/coordinator/
├── src/
│   ├── mcp-server-strategist.ts  # Long-running, Claude Desktop connects
│   ├── mcp-server-executor.ts    # Per-task, spawned by claude -p
│   ├── paths.ts                  # All path constants and helpers
│   ├── config.ts                 # ~/.cetana/config.json loader (Zod-validated)
│   ├── events.ts                 # CetanaEvent discriminated union + JSONL helpers
│   ├── state.ts                  # StateManager — in-memory, hydrates from JSONL
│   ├── worktree.ts               # git worktree add/remove/list wrapper
│   ├── github.ts                 # Octokit wrapper (getIssue, postComment, openPR)
│   ├── claude-spawner.ts         # Spawns claude -p subprocess, streams output
│   └── tools/
│       ├── dispatch-task.ts          # cetana.dispatch_task (Strategist)
│       ├── list-active-tasks.ts      # cetana.list_active_tasks (Strategist)
│       ├── reply-to-blocked-task.ts  # cetana.reply_to_blocked_task (Strategist)
│       └── request-input.ts          # cetana_request_input (Executor)
├── tests/
│   ├── events.test.ts       # JSONL append/read roundtrip
│   ├── worktree.test.ts     # --porcelain parser, smoke tests
│   └── tools.test.ts        # Schema validation + StateManager transitions
├── package.json             # @atta/cetana-coordinator
└── tsconfig.json            # extends @atta/typescript-config/base.json
```

---

## 3. The Two MCP Server Entry Points

**`mcp-server-strategist.ts`** — long-running. Claude Desktop connects to this at startup. Registers `cetana.dispatch_task`, `cetana.list_active_tasks`, `cetana.reply_to_blocked_task`. On startup: loads config, creates `StateManager`, calls `state.hydrate()` to replay all JSONL logs and restore in-memory state.

**`mcp-server-executor.ts`** — spawned per task. `claude -p` connects to this via the per-task `mcp-config.json`. Registers only `cetana_request_input`. Reads `CETANA_TASK_ID` from `process.env` to know which task it's serving.

Both use the low-level `Server` from `@modelcontextprotocol/sdk/server/index.js` (not `McpServer`) — see D-015 in `cetana-decisions.md` for why.

Both connect via `StdioServerTransport` — stdio is the only transport Claude Code supports for per-task MCP servers.

---

## 4. Tool Naming Convention

- **`cetana.*`** — Strategist-side tools (Claude Desktop sees these): `cetana.dispatch_task`, `cetana.list_active_tasks`, `cetana.reply_to_blocked_task`
- **`cetana_request_input`** — Executor-side tool. No dot-prefix so the tool name is clean in the executor's tool registry

Each tool file exports a **factory function** that takes `{ state: StateManager, config?: CetanaConfig }` and returns `{ name, description, inputSchema, handler }`. The server entry points call these factories and register the returned objects.

`request-input.ts` factory takes no deps — it reads `CETANA_TASK_ID` from `process.env` at call time.

---

## 5. JSONL Event Schema

`CetanaEvent` is a discriminated union in `src/events.ts`. All 7 event types:

| type | when written | writer |
|------|-------------|--------|
| `task.dispatched` | dispatch_task starts | strategist server |
| `task.spawned` | after claude -p PID confirmed | strategist server |
| `task.blocked` | executor calls cetana_request_input | executor server |
| `task.unblocked` | reply written (by strategist) or received (by executor) | both |
| `task.progress` | each stdout line from claude -p | strategist server |
| `task.completed` | claude -p exits 0 | strategist server |
| `task.failed` | claude -p exits non-zero, or timeout | strategist/executor |

**Invariant:** JSONL files are append-only. Never edit a line. Never truncate. Add new event types by extending the `CetanaEvent` union and updating `StateManager.applyEvent()`.

`appendEvent(taskId, event)` creates `TASKS_DIR` if missing. `readEvents(taskId)` returns `[]` if the file doesn't exist.

---

## 6. How to Add a New `cetana.*` Tool

1. Create `src/tools/<tool-name>.ts` with factory function export
2. If Strategist-side: register in `mcp-server-strategist.ts`
3. If Executor-side: register in `mcp-server-executor.ts`
4. Add schema validation unit test in `tests/tools.test.ts`
5. Document in `cetana-v0-spec.md` Section 4
6. Add a decision entry in `cetana-decisions.md` if it changes user-visible behavior

---

## 7. Filesystem-Based IPC

How the Strategist server and Executor server communicate when the agent is blocked:

```
Executor calls cetana_request_input(question)
  → writes ~/.cetana/tasks/{taskId}/question.json
  → appends task.blocked event to JSONL
  → polls ~/.cetana/tasks/{taskId}/reply.json every 1 second (30 min timeout)

Strategist calls cetana.reply_to_blocked_task(task_id, reply)
  → reads task state (confirms blocked)
  → writes ~/.cetana/tasks/{taskId}/reply.json
  → appends task.unblocked event to JSONL
  → updates in-memory state

Executor's poll loop detects reply.json
  → reads reply
  → deletes both question.json and reply.json
  → appends task.unblocked event
  → returns reply text to the agent as tool result
```

This is intentional (see D-008). No network dependency. Human-inspectable. Proven in Slice -1.

---

## 8. Worktree Path Conventions

Worktrees live at: `~/code/atta/.worktrees/issue-{N}/`
Branch name: `feat/issue-{N}`
Based on: `origin/{baseBranch}` (default `main`)

`worktreePath(issueNumber)` from `paths.ts` returns the absolute path.

Worktrees are created by `createWorktree()` in `dispatch-task.ts` and never auto-removed. Principal cleans up manually with `git worktree remove` or `git worktree prune`.

---

## 9. Spawning Claude Code

The exact `claude -p` invocation (from `claude-spawner.ts`):

```bash
claude -p "<brief>" \
  --mcp-config ~/.cetana/tasks/{taskId}/mcp-config.json \
  --output-format stream-json \
  --include-partial-messages \
  --verbose \
  --allowedTools "Read,Write,Edit,Bash,mcp__cetana__cetana_request_input" \
  --permission-mode acceptEdits \
  --model claude-sonnet-4-7 \
  --cwd ~/code/atta/.worktrees/issue-{N}
```

The `mcp-config.json` is generated per-task by `generateMcpConfig()` in `claude-spawner.ts`:

```json
{
  "mcpServers": {
    "cetana": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-server-executor.ts"],
      "env": { "CETANA_TASK_ID": "{taskId}" }
    }
  }
}
```

stdout/stderr are both streamed as `task.progress` events (claude uses stderr for verbose output). Each line is a separate event.

---

## 10. Common Pitfalls

- **`path.expandUser()` does not exist in Node.js.** Use `os.homedir()` and `path.join()`. Caught in Slice -1.
- **MCP tool descriptions are load-bearing.** Agents pick tools based on description text. `cetana_request_input`'s description says "wait patiently" — this is deliberate to prevent the agent from timing out.
- **Log errors as `task.failed` events, not silently.** If a handler throws unexpectedly, append a `task.failed` event before re-throwing so the Principal can diagnose via JSONL.
- **Do not auto-remove worktrees.** Manual cleanup only in V0. Removing a worktree mid-PR-review destroys uncommitted state.
- **Use `--include-partial-messages` and `--verbose`.** Slice -1 used these; they ensure all output is captured in stream-json.
- **The strategist and executor servers append `task.unblocked` independently.** Both the reply-to-blocked-task handler (strategist) and the request-input poller (executor) append `task.unblocked`. This means two `task.unblocked` events appear in the JSONL per escalation — that is expected and intentional. `StateManager.applyEvent` handles it idempotently.

---

## 11. Testing Conventions

- **Test runner:** `bun test`
- **Unit tests:** `tests/` directory alongside source
- **Scope:** schema validation, state transitions, JSONL roundtrip, worktree parser
- **No mocking of live processes:** do not spawn real `claude -p` or make real GitHub API calls in tests
- **Events tests:** write to real `~/.cetana/tasks/` with timestamp-unique taskId; clean up in `afterEach`
- **Run tests:** `cd apps/cetana-ai/coordinator && bun test`
