---
name: vada-engine
description: Vāda deliberation engine architecture — agents, rounds, streaming, session management, and resume logic
---

# Vāda Engine — Deliberation System

## Context

The Vāda engine runs multi-agent deliberation sessions. Sessions stream via SSE. The engine supports both fresh starts and resuming incomplete sessions. Each agent can use a different model (per-agent ModelConfig).

---

## Architecture

```
API: POST /api/deliberation/start        → Creates session, returns sessionId
API: GET  /api/deliberation/[id]/stream  → SSE stream, drives the engine

Engine layers:
  agents.ts           → Agent definitions + role configurations
  pending-keys.ts     → Key-based state tracking (what's been emitted)
  prompts/compose.ts  → Message composition for each agent

Round flow (applies to every preset — Crucible, War Room, Sparring):
  Round 1 → Round 2 → Round 3 (agents debate)
  → CONCLUDING (Synthesizer produces structured JSON)
  → AUDITING (Blind Critic audits)
  → CLEAN or REVISING (→ re-audit → CLEAN or UNCONVERGED)
```

Sparring teams lack a Synthesizer agent, but the conclusion phase still runs —
the orchestrator falls back to the session's default model for synthesis +
audit. Every team ends with a conclusion; `SPARRING_COMPLETE` is a legacy
terminal state only present on pre-2026-04-18 sessions.

---

## Rules

### Session State
- Sessions persist to DB — always fetch fresh session state at stream start
- **MUST** check session status before deciding to start fresh vs resume
- Resume = replay already-emitted keys, then continue from last checkpoint

```ts
// In stream route
const session = await getSessionById(id)
if (!session) return new Response('Not found', { status: 404 })

const isResume = session.status === 'IN_PROGRESS' && session.pendingKeys.length > 0
```

### Pending Keys
- Keys track which parts of the workflow have been emitted
- **MUST** use peek functions (non-consuming) when checking resume state — don't dequeue during inspection
- `peekKey(key)` — check if key exists without removing it
- `consumeKey(key)` — removes key, marking step as consumed

```ts
// ✅ Non-consuming check for resume
const hasRound1 = peekKey(session.pendingKeys, 'round-1-complete')

// ❌ Don't consume during inspection — breaks resume logic
const hasRound1 = consumeKey(session.pendingKeys, 'round-1-complete')
```

### Per-Agent Model Config
- Each agent can use a different Claude model
- ModelConfig is stored in session as `agentModels` JSON
- **MUST** thread ModelConfig through the full engine pipeline — don't hardcode model per agent

```ts
// In session
type AgentModels = Record<AgentRole, ModelConfig>
type ModelConfig = { model: string; apiKey?: string }

// In round builder
function buildRoundOneAgents(agentModels: AgentModels) {
  return AGENT_ROLES.map(role => ({
    role,
    model: agentModels[role] ?? DEFAULT_MODEL_CONFIG
  }))
}
```

### Streaming (SSE)
- Stream route handles both fresh start and resume via unified workflow driver
- Replay completed steps to client on resume (non-streaming, fast replay)
- Continue streaming from last incomplete step

### Every team ends with a conclusion
- Since 2026-04-18, every preset (Crucible, War Room, Sparring) runs the conclusion protocol.
- Sparring teams lack a Synthesizer agent → orchestrator falls back to the session's default model for synthesize + audit.
- `SPARRING_COMPLETE` is a legacy terminal state — still present on pre-2026-04-18 sessions and rendered fine, but the current engine never produces it.

---

## File Structure

```
src/engine/
├── agents.ts                    # Agent role definitions + configs
├── pending-keys.ts              # Key management (peek, consume, emit)
├── prompts/
│   ├── compose.ts               # Message assembly per agent/round
│   └── conclusion-prompts.ts    # Prompts for conclusion phase
└── conclusion/
    ├── blind-critic.ts          # Blind critic phase
    ├── revision.ts              # Revision phase
    └── synthesizer.ts           # Final synthesis

src/app/api/deliberation/
├── start/route.ts               # POST — create session
└── [id]/stream/route.ts         # GET — SSE stream driver
```

---

## Anti-patterns

- ❌ Hardcoding model names per agent — use per-agent ModelConfig from session
- ❌ Consuming pending keys during resume inspection — use peek
- ❌ Assuming fresh start when stream begins — always check session status
- ❌ Modifying system prompts for agents without explicit user instruction
- ❌ Duplicating fresh/resume logic — use unified workflow driver
