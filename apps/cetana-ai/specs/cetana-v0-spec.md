# Cetana V0 — Locked Architecture Specification

**Status:** Locked — May 9, 2026
**Author:** Dani + Sonnet (Claude Code)
**Version:** V0

---

## 1. Purpose

Cetana is the Atta ecosystem's local Mac orchestration tool. Its name comes from Pāli (cetanā — volition, intention), following the ecosystem's naming convention: Pāli name = built by Atta.

Cetana V0 is internal tooling. It lets Claude Desktop (the Strategist) dispatch Claude Code agents (Executors) into the Atta monorepo, watch them work, and unblock them when they hit decision points — all over MCP.

Future public surface: `cetana.attalabs.dev`, if and only if V0 proves daily-driver value over two weeks of real use and a V1 build is justified.

**The problem V0 solves:** Copy-paste friction between Claude.ai (Strategist) and Claude Code CLI (Executor) was costing 30–60 minutes per Vāda iteration cycle. Cetana V0 reduces that to: type a brief in Claude Desktop, watch it run, reply when blocked, get notified on completion.

---

## 2. The Validated Load-Bearing Mechanism

Cetana V0's core is a blocking escalation primitive: an agent calls a custom MCP tool when it needs a decision, the tool blocks until the Principal replies, and the agent receives the reply as a tool result — then continues coherently with no context loss.

This was validated end-to-end on May 9, 2026 via the **Slice -1 prototype** (throwaway, ~100 lines, `~/code/cetana-prototype/` — deleted after V0 ships). 13/13 pass criteria:

**Mechanical (8/8):**
- MCP server loaded by Claude Code
- Tool listed in agent's tool registry
- Tool called by agent before acting
- Tool call blocked (process did not exit)
- Reply received by tool from external write
- Agent resumed after receiving reply
- Target file created with correct content
- Process exited with code 0

**Cognitive continuity (5/5):**
- No redundant file reads after resumption
- No re-planning after resumption
- No duplicated work
- No hallucination about the choice made
- Events were sequential (dispatched → blocked → unblocked → completed)

7-minute human pause across the tool call. Agent's first post-resume sentence: "The principal chose pizza. Creating choice.txt now." Wall-clock 7m38s, Claude Code 2.1.118, Bun 1.2.14, macOS.

The blocking pattern is what differentiates Cetana from CCPM, APM, Conductor.build, and every other agentic PM framework surveyed in Phase 0. None have interactive pause/resume.

See `cetana-experiment-log.md` for the full journey.

---

## 3. Architecture (Locked May 9, 2026)

### Five-layer stack

```
┌──────────────────────────────────────────────────┐
│  STRATEGIST: Claude Desktop                      │
│  (local stdio MCP — web Claude.ai cannot reach  │
│   localhost; only Desktop can)                   │
└──────────────────────┬───────────────────────────┘
                       │ cetana.* MCP tools
┌──────────────────────▼───────────────────────────┐
│  COORDINATOR: Bun service                        │
│  apps/cetana-ai/coordinator/                     │
│  Two stdio MCP servers from one codebase:        │
│    mcp-server-strategist.ts  (long-running)      │
│    mcp-server-executor.ts    (per-task)          │
└──────────────────────┬───────────────────────────┘
                       │ reads/writes
┌──────────────────────▼───────────────────────────┐
│  ROADMAP: GitHub Issues + Labels + Milestones    │
│  (no Projects V2 — GraphQL friction not worth   │
│   it for solo workflow)                          │
└──────────────────────────────────────────────────┘
                       │ spawns
┌──────────────────────▼───────────────────────────┐
│  EXECUTOR: Claude Code subprocess                │
│  claude -p "<brief>" --mcp-config ...            │
│  Runs in git worktree at                         │
│  ~/code/atta/.worktrees/issue-{N}/               │
└──────────────────────────────────────────────────┘
                       │ appends
┌──────────────────────▼───────────────────────────┐
│  STATE: JSONL append-only logs                   │
│  ~/.cetana/tasks/{task-id}.jsonl                 │
│  (SQLite later if/when schema stabilizes)        │
└──────────────────────────────────────────────────┘
```

### Why each choice

**Claude Desktop (not web Claude.ai):** Web Claude.ai cannot reach localhost MCP servers per Anthropic's architecture — only Claude Desktop supports local stdio MCP. Caught by a reviewer in Phase 0 architecture review (see `cetana-experiment-log.md` Section 2). Fatal assumption if missed.

**One coordinator with two MCP server entry points (not two separate servers):** The Strategist and each Executor need different tool surfaces, but share the same underlying state logic. Two entry points in one codebase (`mcp-server-strategist.ts`, `mcp-server-executor.ts`) is simpler than two separate packages and allows sharing `state.ts`, `events.ts`, `config.ts`, `paths.ts` without duplication. See D-002.

**GitHub Issues (not Projects V2):** GraphQL friction for Projects V2 is not worth it for a solo workflow. Labels + Milestones cover all V0 tracking needs. See D-003.

**JSONL (not SQLite):** Schema is not stable in V0. JSONL is honest about that — each event is a discrete record, append-only, human-readable with `tail -f`. SQLite is V1+ if JSONL proves insufficient. See D-004.

**Worktrees (not branches-in-main):** Parallel agents need real filesystem isolation. Multiple executors touching the same working directory would corrupt each other's intermediate state. Worktrees give each task its own checkout. See D-005.

**No UI in V0:** Building a Tauri shell + dashboard before validating that V0 is daily-driver useful is premature. The investment would be wasted if V0 proves insufficient or solves the problem well enough without it. Decision gate: 2 weeks of real V0 use → then decide. See D-006.

---

## 4. The Four MCP Tools

### `cetana.dispatch_task` (Strategist-side)

**When to call:** Strategist is ready to hand off a task to an executor agent.

**Input:**
```typescript
{
  issue_number: number    // GitHub issue to work on (must exist)
  brief: string           // Instructions for the executor (min 50 chars)
  base_branch?: string    // Worktree base (default: 'main')
}
```

**Side effects:**
1. Validates the GitHub issue exists via Octokit
2. Creates a git worktree at `~/code/atta/.worktrees/issue-{N}` on branch `feat/issue-{N}`
3. Generates `~/.cetana/tasks/{taskId}/mcp-config.json` pointing at the executor MCP server
4. Spawns `claude -p "<brief>"` with the mcp-config, stream-json output, permission mode `acceptEdits`
5. Appends `task.dispatched` + `task.spawned` events to JSONL
6. Posts a GitHub comment confirming dispatch
7. Returns `{ taskId, worktree, pid, issue }`

### `cetana.list_active_tasks` (Strategist-side)

**When to call:** Strategist wants to know what's running or blocked.

**Input:** `{}`

**Output:** Human-readable text listing running and blocked tasks. Blocked tasks include the pending question text so the Strategist can formulate a reply.

### `cetana.reply_to_blocked_task` (Strategist-side)

**When to call:** Strategist sees a blocked task and wants to unblock it.

**Input:**
```typescript
{
  task_id: string   // The taskId from dispatch_task's response
  reply: string     // Answer to the executor's question
}
```

**Side effects:**
1. Validates task exists and is blocked
2. Writes `~/.cetana/tasks/{taskId}/reply.json` with `{ reply, questionId }`
3. Appends `task.unblocked` event to JSONL
4. Updates in-memory state to `running`
5. (The executor's MCP server polls for reply.json and returns it to the agent)

### `cetana_request_input` (Executor-side — no dot prefix)

**When to call:** Executor agent is blocked on a decision and needs Principal input.

**Input:**
```typescript
{
  question: string   // The question to ask the principal
}
```

**Side effects:**
1. Reads `CETANA_TASK_ID` from env (set by the spawner in `mcp-config.json`)
2. Writes `~/.cetana/tasks/{taskId}/question.json`
3. Appends `task.blocked` event to JSONL
4. Polls `reply.json` every 1 second (timeout: 30 minutes)
5. On reply: cleans up both IPC files, appends `task.unblocked`, returns reply text to agent
6. On timeout: appends `task.failed`, returns error

**The load-bearing invariant:** The tool blocks synchronously from the agent's perspective. The agent's turn does not complete until the reply arrives. This is what makes cognitive continuity possible.

---

## 5. Filesystem Layout

```
~/.cetana/
├── config.json                    # Static config (github owner/repo/token, model defaults)
└── tasks/
    ├── {task-uuid}.jsonl          # JSONL event log per task (append-only)
    └── {task-uuid}/
        ├── mcp-config.json        # Per-task executor MCP config
        ├── question.json          # Written by executor server when blocked
        └── reply.json             # Written by strategist server to unblock

~/code/atta/
└── .worktrees/
    └── issue-{N}/                 # Git worktree per dispatched task

apps/cetana-ai/
└── coordinator/
    ├── src/
    │   ├── mcp-server-strategist.ts   # Long-running, Claude Desktop connects
    │   ├── mcp-server-executor.ts     # Per-task, spawned by claude -p
    │   ├── paths.ts                   # All filesystem path constants
    │   ├── config.ts                  # ~/.cetana/config.json loader
    │   ├── events.ts                  # CetanaEvent union + JSONL helpers
    │   ├── state.ts                   # In-memory StateManager
    │   ├── worktree.ts                # git worktree wrapper
    │   ├── github.ts                  # Octokit wrapper (3 functions)
    │   ├── claude-spawner.ts          # claude -p subprocess spawner
    │   └── tools/
    │       ├── dispatch-task.ts
    │       ├── list-active-tasks.ts
    │       ├── reply-to-blocked-task.ts
    │       └── request-input.ts
    └── tests/
        ├── events.test.ts
        ├── worktree.test.ts
        └── tools.test.ts
```

### Filesystem-based IPC

The strategist MCP server and executor MCP server communicate via the filesystem under `~/.cetana/tasks/{taskId}/`:

- Executor writes `question.json` → strategist reads it via `list_active_tasks` and surfaces to Principal
- Strategist writes `reply.json` → executor polls for it and returns the reply to the agent

This is intentional, not lazy. It has no network dependency, survives process restarts, is human-inspectable, and requires zero additional infrastructure. The same pattern was proven in Slice -1 (the prototype used `~/.cetana-prototype/` as the IPC directory).

---

## 6. V0 Scope vs. Deferred

### In V0

- Four MCP tools (dispatch_task, list_active_tasks, reply_to_blocked_task, cetana_request_input)
- Git worktrees per task (created on dispatch, cleaned up manually)
- JSONL append-only state logs
- GitHub Issues as task backing (fetch issue, post comments on dispatch/completion)
- In-memory StateManager with JSONL hydration on startup
- Filesystem-based IPC for question/reply handoff
- Two MCP server entry points from one codebase

### V1 (deferred until V0 proves daily-driver value)

- Tauri shell + dashboard + native notifications + menu bar status
- Auto-cleanup of merged worktrees
- `cancel_task`, `get_task_lifecycle`, `retry_task` MCP tools
- Cross-session state persistence improvements

### V2+ (deferred indefinitely)

- Remote dispatch via tunnel + auth
- Multi-user support
- Public-facing surface at `cetana.attalabs.dev`
- Anthropic Claude Apps marketplace integration
- Vāda Desktop CLI-subprocess providers

---

## 7. Open Questions for Actual Use

These are deliberately deferred until V0 has been used for real tasks.

- **What does `list_active_tasks` show after 50+ completed tasks accumulate?** The tool currently shows only running/blocked (status filter in `StateManager.list()`). If the Principal wants to see recent history, they'll need to tail the JSONL directly. Does this need a `list_all_tasks` tool? Defer.
- **What happens when a worktree creation fails?** (e.g., branch `feat/issue-{N}` already exists). Current behavior: throws. Should we recover? Defer until observed.
- **Should GitHub PR creation be automated on executor completion?** Currently the executor is briefed to open PRs itself. The coordinator doesn't do it. If executors consistently forget, add it to the `onExit` handler. Defer.
- **Does the 30-minute timeout on `cetana_request_input` need to be configurable?** For now it's hardcoded. Add to `config.json` when observed to be too short or too long.
- **How should the Strategist be reminded about blocked tasks?** Currently passive — Strategist must call `list_active_tasks`. Native notifications would require Tauri (V1). Workaround: the executor posts a GitHub comment when blocked, so the Principal can watch GitHub for activity.
