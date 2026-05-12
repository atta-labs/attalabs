# Cetana — Locked Architecture Specification

**Status:** draft
**Locked:** May 9, 2026
**Author:** Dani + Sonnet (Claude Code)
**Version:** V0

---

## 1. Purpose

Cetana is the Atta ecosystem's local Mac orchestration coordinator. Its name comes from Pāli (cetanā — volition, intention), following the ecosystem's naming convention: Pāli name = built by Atta.

Cetana is internal tooling. It lets Claude Desktop (the Team Leader, Strategist mode) dispatch Claude Code agents (Developers/Executors) into the Atta monorepo, watch them work, and unblock them when they hit decision points — all over MCP. It is the dispatch and escalation layer of the v3 operational model: Principal → Team Leader → Developer → Archivist.

Cetana's role in the v3 model:
- **Team Leader** uses Cetana's Strategist tools (`cetana.dispatch_task`, `cetana.list_active_tasks`, `cetana.reply_to_blocked_task`) to orchestrate Developers
- **Developer** uses Cetana's Executor tool (`cetana_request_input`) to escalate blocked decisions
- **Archivist** (future, V0.7+) is a GitHub Action triggered by PR events — not a Cetana component

For the full authority model and escalation routing, see `project-management/state-machine.md`.

Future public surface: `cetana.attalabs.dev`, if and only if V0 proves daily-driver value over two weeks of real use and a V1 build is justified.

**The problem V0 solves:** Copy-paste friction between Claude Desktop (Team Leader) and Claude Code CLI (Developer) was costing 30–60 minutes per iteration cycle. Cetana V0 reduces that to: type a brief in Claude Desktop, watch it run, reply when blocked, get notified on completion.

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

**When to call:** Team Leader is ready to hand off a task to a Developer agent.

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

**When to call:** Team Leader wants to know what's running or blocked.

**Input:** `{}`

**Output:** Human-readable text listing running and blocked tasks. Blocked tasks include the pending question text and severity (when provided) so the Team Leader can route appropriately.

### `cetana.reply_to_blocked_task` (Strategist-side)

**When to call:** Team Leader sees a blocked task and wants to unblock it.

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

**When to call:** Developer agent is blocked on a decision and needs input.

**Input:**
```typescript
{
  question: string    // The question to ask
  severity: 'execution' | 'strategy' | 'product'
}
```

The `severity` field signals who needs to resolve the escalation:
- `execution` — missing detail, deprecated dependency, flag not anticipated. Team Leader handles in Brief Author mode. GitHub label: `needs:execution-input`.
- `strategy` — brief assumes approach A but the codebase went a different direction. Team Leader handles in Strategist mode. GitHub label: `needs:strategy-input`.
- `product` — brief would require a Type 1 decision not specified in the brief. Principal must resolve at a ratification window. GitHub label: `needs:principal-input`.

**Side effects:**
1. Reads `CETANA_TASK_ID` from env (set by the spawner in `mcp-config.json`)
2. Writes `~/.cetana/tasks/{taskId}/question.json` (includes `severity`)
3. Appends `task.blocked` event to JSONL
4. Polls `reply.json` every 1 second (timeout: 30 minutes)
5. On reply: cleans up both IPC files, appends `task.unblocked`, returns reply text to agent
6. On timeout: appends `task.failed`, returns error

**The load-bearing invariant:** The tool blocks synchronously from the agent's perspective. The agent's turn does not complete until the reply arrives. This is what makes cognitive continuity possible.

> **Code follow-up:** The `severity` field is specced here but not yet implemented in `src/tools/request-input.ts`. Implementation is tracked as a follow-up task after this spec ships. See cetana-decisions.md D-016.

---

## 5. Severity Routing

When `cetana_request_input` is called with a severity, the routing is:

| Severity | Who resolves | GitHub label | TL mode |
|----------|-------------|--------------|---------|
| `execution` | Team Leader | `needs:execution-input` | Brief Author mode |
| `strategy` | Team Leader | `needs:strategy-input` | Strategist mode |
| `product` | Principal (at ratification window) | `needs:principal-input` | N/A — escalate |

The Team Leader monitors `needs:execution-input` and `needs:strategy-input` labels. The Principal monitors `needs:principal-input` only.

`list_active_tasks` surfaces severity alongside the question text so the Team Leader can immediately identify which mode to switch to and whether to escalate before replying.

---

## 6. Brief Validation Gate (V0.7 stub — not yet implemented)

A brief validation gate runs via GitHub Actions on PR open events. In V0.7, this is a stub that exits 0. In V1, it checks:

- Brief has a tier field (`tier: 0`, `tier: 1`, or `tier: 3`)
- If `tier: 3`, a `principal_delegate:` field is present or the PR targets main
- If the brief references a locked decision (e.g., "uses approach X"), that the lock is acknowledged with `Conforms to lock: D-###`
- If the brief challenges a lock, `Challenges lock: D-###` is present and the decision log shows PENDING ratification

For the current stub implementation, see `.github/workflows/archivist.yml` (brief-validation job exits 0).

The full gate logic is tracked as a future task. See cetana-decisions.md D-017.

---

## 7. Filesystem Layout

```
~/.cetana/
├── config.json                    # Static config (github owner/repo/token, model defaults)
└── tasks/
    ├── {task-uuid}.jsonl          # JSONL event log per task (append-only)
    └── {task-uuid}/
        ├── mcp-config.json        # Per-task executor MCP config
        ├── question.json          # Written by executor server when blocked (includes severity)
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

- Executor writes `question.json` → strategist reads it via `list_active_tasks` and surfaces to Team Leader
- Strategist writes `reply.json` → executor polls for it and returns the reply to the agent

This is intentional, not lazy. It has no network dependency, survives process restarts, is human-inspectable, and requires zero additional infrastructure. The same pattern was proven in Slice -1 (the prototype used `~/.cetana-prototype/` as the IPC directory).

---

## 8. V0 Scope vs. Deferred

### In V0 (shipped May 10, 2026)

- Four MCP tools (dispatch_task, list_active_tasks, reply_to_blocked_task, cetana_request_input)
- Git worktrees per task (created on dispatch, cleaned up manually)
- JSONL append-only state logs
- GitHub Issues as task backing (fetch issue, post comments on dispatch/completion)
- In-memory StateManager with JSONL hydration on startup
- Filesystem-based IPC for question/reply handoff
- Two MCP server entry points from one codebase
- `cetana_request_input` schema includes `severity` field (code follow-up in next PR)

### V0.7 stubs (docs + CI scaffolding)

- `scripts/verify-docs.ts` — exits 0; V1 adds real checks
- `.github/workflows/archivist.yml` — three no-op jobs (brief-validation, post-merge, daily-drift)
- Brief validation gate specced but not implemented (see Section 6)

### V1 (deferred until V0 proves daily-driver value)

- Tauri shell + dashboard + native notifications + menu bar status
- Auto-cleanup of merged worktrees
- `cancel_task`, `get_task_lifecycle`, `retry_task` MCP tools
- Cross-session state persistence improvements
- Severity routing implementation in `request-input.ts` + GitHub label posting
- Brief validation gate real implementation in Archivist action

### V2+ (deferred indefinitely)

- Remote dispatch via tunnel + auth
- Multi-user support
- Public-facing surface at `cetana.attalabs.dev`
- Anthropic Claude Apps marketplace integration
- Vāda Desktop CLI-subprocess providers

---

## 9. Open Questions for Actual Use

These are deliberately deferred until V0 has been used for real tasks.

- **What does `list_active_tasks` show after 50+ completed tasks accumulate?** The tool currently shows only running/blocked (status filter in `StateManager.list()`). If the Principal wants to see recent history, they'll need to tail the JSONL directly. Does this need a `list_all_tasks` tool? Defer.
- **What happens when a worktree creation fails?** (e.g., branch `feat/issue-{N}` already exists). Current behavior: throws. Should we recover? Defer until observed.
- **Should GitHub PR creation be automated on executor completion?** Currently the executor is briefed to open PRs itself. The coordinator doesn't do it. If executors consistently forget, add it to the `onExit` handler. Defer.
- **Does the 30-minute timeout on `cetana_request_input` need to be configurable?** For now it's hardcoded. Add to `config.json` when observed to be too short or too long.
- **How should the Team Leader be reminded about blocked tasks?** Currently passive — Team Leader must call `list_active_tasks`. Native notifications would require Tauri (V1). Workaround: the executor posts a GitHub comment when blocked, so the Principal can watch GitHub for activity.
- **How does severity appear in `list_active_tasks` output?** Currently the tool output is plain text. Severity field should be clearly surfaced to make routing immediate. Implement alongside severity routing code follow-up.

---

## 10. V0.5 — CLI Surface

**Status:** target
**Target:** implement after V0 is validated in first real-world dispatch

### Purpose

V0.5 adds a CLI surface that makes the coordinator usable without Claude Desktop. In V0, the only way to interact with Cetana is through Claude Desktop's MCP tool interface. Every status check, reply to a blocked task, and dispatch requires opening Claude Desktop. For terminal sessions this creates friction: task status is invisible unless you ask Claude Desktop, and unblocking a task requires context-switching to a chat interface.

The CLI surface solves this with five composable commands:
- `cetana init` — one-time setup, writes `~/.cetana/config.json` interactively
- `cetana watch` — live-tails active task progress (streams `task.progress` events from all active JSONL logs)
- `cetana status` — point-in-time view of running, blocked, and recently completed tasks
- `cetana abort <taskId>` — kills a running task, appends `task.failed`, cleans up IPC files
- `cetana reply <taskId> "<reply>"` — unblocks a blocked task; same semantics as `cetana.reply_to_blocked_task`

These commands surface the same operations as the MCP tools. The CLI is a thin client over the same coordinator modules — no parallel implementation. See D-022.

### V0.5 CLI ladder (5 incremental PRs)

The CLI ships incrementally. Each step is a self-contained PR with a working, verified deliverable. No step begins until the previous step is merged and verified in at least one real task.

#### Step 1 (F5) — Scaffold + init ✅ SHIPPED (May 12, 2026)

PR #39 (initial implementation), PR #42 (install command fix), PR #43 (abort path hang fix).

The `cetana` binary at `apps/cetana-ai/cli/` ships with five commands working as a thin client over `@atta/cetana-coordinator`:

- `cetana init` — interactive setup with hierarchical config (local `.cetana.json` overrides global `~/.cetana/config.json`). Detects repo via `git rev-parse`, confirms `gh auth status`, writes config, runs StateManager smoke test. No manual JSON editing required.
- `cetana dispatch <issue-number>` — fetches issue body as brief, creates worktree at `.worktrees/issue-N`, spawns Claude Code subprocess, starts JSONL event log.
- `cetana list` — terse list with heartbeat-based CRASHED detection (PID liveness check via `process.kill(pid, 0)`).
- `cetana reply <task-id> "<message>"` — one-line reply form (editor integration is F9).
- `cetana logs <task-id> [--follow] [--since]` — raw JSONL event stream.

**Install gate (D-021) verified end-to-end by Principal on May 12, 2026:**
```bash
cd apps/cetana-ai/cli && bun link
cetana init    # interactive setup, no manual JSON editing
cetana list    # confirms StateManager wiring
echo n | cetana init    # confirms abort path exits cleanly
```

**Bugs discovered post-merge and fixed:**
- PR #42: README documented `bun --cwd apps/cetana-ai/cli link` which Bun does not support. Corrected to `cd apps/cetana-ai/cli && bun link`.
- PR #43: `cetana init` abort path hung because `process.stdin.resume()` left the readline open. Fixed with `process.stdin.destroy()` on the abort branch. Regression test added.

Both discoveries surfaced D-025 (install gate path coverage requirement).

**Step 2 (F6) — `cetana watch`** — **Status: ready to dispatch**

Streams `task.progress` events from all active JSONL logs to stdout in real time. Equivalent to running `tail -f` on all active task files simultaneously. Blocked tasks are displayed with their pending question, severity, and time-blocked.

**Step 3 (F7) — `cetana status`** — **Status: blocked on F6**

Point-in-time summary: running tasks (pid, issue, elapsed), blocked tasks (question text, severity, time-blocked), recently completed tasks (within last 24 hours). Same underlying data as `cetana.list_active_tasks` output. Blocked tasks display severity so routing is immediate.

**Step 4 (F8) — `cetana abort` + `cetana resume`** — **Status: blocked on F7**

`cetana abort <taskId>` kills the claude subprocess (if running), writes a `task.failed` event to JSONL, removes IPC files. `cetana resume <taskId> "<amended-brief>"` re-dispatches a previously failed or aborted task. The same worktree is reused; a new task ID is generated. The original task's JSONL log is retained as the audit trail.

**Step 5 (F9) — `cetana reply` (reply ergonomics)** — **Status: blocked on F8**

`cetana reply <taskId> "<reply>"` writes `reply.json` and appends `task.unblocked`, unblocking the Developer without opening Claude Desktop. This completes the full orchestration loop from the terminal: `cetana watch` (monitor) → `cetana reply` (unblock) → `cetana watch` (continue monitoring).

### Architecture constraint (D-022)

The CLI is a thin client. All five commands call the same functions from the existing coordinator modules (`paths.ts`, `config.ts`, `events.ts`, `state.ts`, `worktree.ts`) and tool handlers. No business logic lives in the CLI layer. No parallel implementation of state management, IPC, or JSONL handling. The CLI entry point reads from and writes to the same filesystem paths as the MCP server entry points.

If the CLI and MCP servers would need to diverge (different state interpretation, different IPC paths), that is a signal that the coordinator module needs refactoring — not that the CLI should carry its own logic.

### User flow (5 commands, one terminal, agent does the work)

After F5 ships, the canonical user flow is:

1. **`cetana init`** — once, ever. Detects repo, writes config, smoke-tests connection.
2. **`cetana dispatch <issue-number>`** — when work needs doing. Reads issue body as brief, spawns Claude Code in fresh worktree, starts JSONL log.
3. **`cetana list`** — check what's running. Shows ongoing, blocked, or crashed tasks with any pending questions inline.
4. **`cetana reply <task-id> "<message>"`** — when an agent escalates via `cetana_request_input`. Your answer unblocks the agent; cognitive continuity preserved.
5. **Review PR on GitHub** — when the agent opens a PR. Standard GitHub workflow.

What the Principal does NOT do:
- No Claude Desktop config editing (MCP server remains but isn't required for CLI workflow)
- No worktree management — Cetana creates and tracks them
- No JSONL parsing manually (`cetana logs` is there if needed)
- No re-explaining context when replying — the escalation primitive preserves task state
- No setting up GitHub labels per task — Cetana applies based on severity routing

The brief is the most important artifact. The agent is only as good as the brief.

### V1 UI dogfood gate (D-023, Lock: YES)

After V0.5 ships, the V1 UI (Tauri shell + dashboard + native notifications + menu bar status) is gated on three objective conditions being met during real use:

1. **≥20 tasks** dispatched through Cetana total (V0 + V0.5 combined)
2. **≥3 tasks running concurrently** at some point
3. **Documented "wish this were visual" moments** — specific situations where the CLI surface is actively insufficient, written up with concrete examples (not "dashboards are nicer" — "I was managing 3 concurrent tasks and could not parse the watch output")

All three must be met. Starting from the date F9 (Step 5 — `cetana reply`) merges to main, a 4-week dogfood window begins. If after 4 weeks the gate is not met, V1 is deferred indefinitely. The point: V1 must be built on observed friction, not assumed preference. D-006 (No UI in V0) established the principle; D-023 formalizes the evaluation criteria.

For the V1 scope if the gate passes, see Section 8 (V1 deferred items).
