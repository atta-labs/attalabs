---
name: vada-engine
description: Vāda deliberation engine architecture — Mastra workflow, agents, rounds, SSE streaming, session states, and write path rules
---

# Vāda Engine — Deliberation System

## Context

The Vāda engine runs multi-agent deliberation sessions using a Mastra workflow. The browser POSTs to `/api/deliberation/[id]/workflow/run`, which starts the workflow server-side and streams progress back via SSE. Sessions persist to DB. Reconnecting clients open a new SSE connection and receive replayed state through the DB poll loop — no special resume protocol needed.

BYOK: the user's API key is sent in the POST body of the workflow/run request. It is held in server memory for the duration of the workflow run, passed to provider calls, and never written to any storage.

---

## Architecture

```
API: POST /api/deliberation/start             → Creates session, returns sessionId
API: POST /api/deliberation/[id]/workflow/run → Starts Mastra workflow (fire-and-forget or sync)
API: GET  /api/deliberation/[id]/workflow/run?stream=true → SSE stream (works for both fresh + reconnect)

Mastra workflow (engine/workflow/crucible-workflow.ts):
  runRound1 → runRound2 → runRound3 → runConclusion → runAudit → [runRevision →] terminal

Engine layers:
  orchestrator.ts      → Provider call + retry wrapper (wraps Anthropic/OpenAI/etc.)
  turn-logic.ts        → persistTurn — the only function that writes transcript entries to DB
  conclusion-rescue.ts → Conclusion JSON repair when model output is malformed
  agents.ts            → Agent role definitions + configs
  prompts/             → Prompt composition per agent/round/intervention
  workflow/steps.ts    → Step implementations + getNextCommand state machine
```

Session state progression:
```
PENDING → ROUND_1 → ROUND_2 → ROUND_3 → CONCLUDING → AUDITING → TERMINAL (CLEAN)
                                                              ↘ REVISING → TERMINAL (REVISED or UNCONVERGED)
```

---

## Rules

### Workflow Start Guard — Never Remove

The `/workflow/run` route checks `session.state === 'PENDING'` before calling `run.start()`. This prevents duplicate workflow runs when a client reconnects or reloads mid-deliberation.

```ts
const shouldStart = initial.state === 'PENDING'
if (shouldStart) {
  const wf = mastra.getWorkflow('crucible')
  const run = await wf.createRun()
  run.start({ inputData: { sessionId, apiKey } }).catch(() => {})
}
// SSE poll loop always opens — serves both fresh start and reconnect
```

### persistTurn is the Single Write Path

All workflow steps write agent turns through `persistTurn` in `turn-logic.ts`. The SSE poll loop discovers new entries via DB reads.

```ts
// ✅ All workflow steps call this
await persistTurn(sessionId, agentRole, round, message)

// ❌ Never write transcript entries directly to the DB
await db.insert(transcriptEntries).values({ ... })
```

### SSE Emission Order

Within each poll cycle: `agent_completed` events are emitted **before** `state_changed`. The client appends the message before updating the round indicator — this matches expected UX ordering. Do not change this order.

### Per-Agent Model Config

Each agent can use a different model. Provider and modelId are stored on the session and must be threaded through the full engine pipeline.

```ts
// Session stores the global provider + modelId
// agentModels JSON stores per-agent overrides (future)
// Never hardcode a model name inside a step — always read from session
```

### getNextCommand is Live State-Machine Logic

`getNextCommand` in `workflow/steps.ts` is the state-machine backbone — it reads session state from DB and returns the next command for each step. It is not dead code. All 12 workflow steps call it to interpret the current session state and determine what action to take.

### Every Team Ends with a Conclusion

Since 2026-04-18, every preset (Crucible, War Room, Sparring) runs the full conclusion protocol. `SPARRING_COMPLETE` is a legacy terminal state — still present on pre-2026-04-18 DB rows and rendered correctly by the UI, but the current engine never produces it.

---

## Session States

| State | Meaning |
|-------|---------|
| `PENDING` | Session created, workflow not yet started |
| `ROUND_1` / `ROUND_2` / `ROUND_3` | Agents debating in the named round |
| `CONCLUDING` | Synthesizer producing structured conclusion JSON |
| `AUDITING` | Blind critic evaluating the conclusion |
| `REVISING` | Synthesizer revising after critic rejection |
| `TERMINAL` | Deliberation complete — check `terminalState` for outcome |

Terminal states (set on the `terminalState` column when `state = TERMINAL`):

| Terminal State | Meaning |
|----------------|---------|
| `CLEAN` | Critic accepted the first-pass conclusion |
| `REVISED` | Critic rejected; revised conclusion accepted |
| `UNCONVERGED` | Revision also rejected; best available shown |
| `SPARRING_COMPLETE` | Legacy — pre-2026-04-18 sessions only |

---

## SSE Event Types

The browser's `useDeliberation.ts` hook consumes these from `/workflow/run?stream=true`:

| Type | Payload | Effect |
|------|---------|--------|
| `state_changed` | `{ state: SessionState }` | Updates round indicators and loading spinners |
| `agent_completed` | `{ agent: string; round: number; message: string }` | Appends transcript entry |
| `terminal` | `{ terminalState: string; conclusion: object }` | Closes stream, renders conclusion panel |
| `keepalive` | `{}` | No-op — prevents connection timeout every 15s |
| `error` | `{ message: string }` | Infra-level failure (not model errors) |

---

## File Structure

```
src/engine/
├── agents.ts                    # Agent role definitions + configs
├── orchestrator.ts              # Provider call + retry wrapper
├── conclusion-rescue.ts         # Conclusion JSON repair/fallback
├── turn-logic.ts                # persistTurn — DB write path for all transcript entries
├── types.ts                     # Shared engine types
├── prompts/
│   ├── compose.ts               # Message assembly per agent/round
│   ├── conclusion-prompts.ts    # Prompts for conclusion phase
│   ├── postures.ts              # Agent posture modifiers
│   ├── round-modifiers.ts       # Round-specific prompt modifiers
│   ├── task-horizons.ts         # Task horizon modifiers
│   └── whisper-modifier.ts      # Intervention whisper injection
└── workflow/
    ├── crucible-workflow.ts      # Mastra workflow definition (step graph)
    └── steps.ts                  # Step implementations + getNextCommand state machine

src/app/api/deliberation/
├── start/route.ts                      # POST — create session
└── [id]/workflow/run/route.ts          # POST start + GET SSE stream driver
```

---

## Anti-patterns

- ❌ Hardcoding model names per agent — use per-agent ModelConfig from session
- ❌ Starting a Mastra run without checking `session.state === 'PENDING'` — causes duplicate runs on reconnect
- ❌ Writing transcript entries outside of `persistTurn` — breaks SSE poll discovery
- ❌ Modifying agent system prompts without explicit user instruction
- ❌ Removing or reordering the `agent_completed` / `state_changed` emission order in the SSE loop
- ❌ Treating `getNextCommand` as dead code — it is the live state-machine backbone for all 12 steps
