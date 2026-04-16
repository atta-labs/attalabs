# Vada AI Web — Claude Code Instructions

The Next.js web app for Vada AI. Users submit a question, configure agents, and watch a live deliberation stream. Sessions are persisted and resumable.

---

## Architecture

```
apps/vada-ai/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Landing page
│   │   ├── layout.tsx                      # Root layout (NextWebShell + UserTopBar)
│   │   ├── deliberate/                     # Start a new deliberation
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       └── QuestionInput.tsx       # Question + agent/model config UI
│   │   ├── deliberation/[id]/             # Live deliberation view
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── CenterViewport.tsx      # Canvas + feed layout
│   │   │       ├── DeliberationFeed.tsx    # Scrolling round/message feed
│   │   │       ├── RoundView.tsx           # Single round with agent spheres
│   │   │       ├── MessageCard.tsx         # Individual agent message
│   │   │       ├── SynthesisCard.tsx       # Synthesis message display
│   │   │       ├── ConclusionPanel.tsx     # Final conclusion display
│   │   │       └── useDeliberation.ts      # SSE stream hook
│   │   ├── history/                        # Past sessions
│   │   │   └── components/SessionCard.tsx
│   │   ├── sign-in/, sign-up/
│   │   └── api/
│   │       ├── deliberation/start/         # POST — create session + start deliberation
│   │       │   └── route.ts
│   │       ├── deliberation/[id]/stream/   # GET — SSE stream driver
│   │       │   └── route.ts
│   │       └── sessions/[id]/             # GET — fetch session state
│   │           └── route.ts
│   ├── components/
│   │   ├── AgentBadge.tsx
│   │   ├── UserTopBar.tsx
│   │   └── StickyHeaderTopBar.tsx
│   ├── db/
│   │   ├── schema.ts                      # Drizzle schema (sessions, rounds, messages)
│   │   └── queries.ts
│   └── engine/                            # Deliberation engine
│       ├── agents.ts                      # Agent role definitions
│       ├── workflow.ts                    # Unified workflow driver (fresh + resume)
│       ├── stream.ts                      # SSE stream utilities
│       ├── pending-keys.ts               # Key tracking (peek, consume, emit)
│       ├── retry.ts                       # Retry logic
│       ├── rounds/                        # Round execution
│       ├── prompts/                       # Agent prompt composition
│       └── conclusion/                   # Conclusion phase (blind-critic, revision, synthesizer)
├── drizzle.config.ts
└── package.json
```

---

## Critical Rules

### RULE #1: Engine changes require explicit instruction

Do not modify agent prompts, round logic, or the workflow driver without explicit instruction. The deliberation flow is intentional and tuned.

### RULE #2: Sessions are always checked before streaming

The stream route always fetches fresh session state to determine fresh start vs resume. Never assume a session is new.

```ts
const session = await getSessionById(id)
const isResume = session.status === 'IN_PROGRESS' && session.pendingKeys.length > 0
```

### RULE #3: Pending keys — peek before consuming

During resume inspection, use peek functions only. Consuming a key marks it done.

```ts
peekKey(session.pendingKeys, 'round-1-complete')   // ✅ inspect
consumeKey(session.pendingKeys, 'round-1-complete') // ✅ mark done — only when actually progressing
```

### RULE #4: Per-agent model config threads everywhere

Each agent can use a different model. `ModelConfig` is stored as `agentModels` JSON in the session and must be threaded through the entire engine pipeline.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/deliberation/start` | POST | Create session, store agentModels config, kick off workflow |
| `/api/deliberation/[id]/stream` | GET | SSE — drives the deliberation engine, handles fresh + resume |
| `/api/sessions/[id]` | GET | Fetch session state (status, rounds, messages) |

---

## Session States

| Status | Meaning |
|--------|---------|
| `IN_PROGRESS` | Actively streaming or resumable |
| `COMPLETE` | Full deliberation finished (conclusion generated) |
| `SPARRING_COMPLETE` | Stopped after sparring rounds (no conclusion) |
| `ERROR` | Failed, not resumable |

---

## Specifications

Specs live at the product level, not the surface level.

| Spec | Path | Purpose |
|------|------|---------|
| Use Cases (v0) | [../specs/v0/Vada_Use_cases.md](../specs/v0/Vada_Use_cases.md) | Original use case definitions |
| Science of Vada (v0) | [../specs/v0/science_of_vada.md](../specs/v0/science_of_vada.md) | Deliberation philosophy and methodology |
| Claude Code Prompt (v1) | [../specs/v1/Vada_Claude_Code_Prompt_v2.md](../specs/v1/Vada_Claude_Code_Prompt_v2.md) | Implementation spec for Claude Code |

---

## Related Documentation

- [Vada AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
- [.claude/skills/vada-engine/SKILL.md](../../../.claude/skills/vada-engine/SKILL.md) — Engine architecture and rules
- [packages/ui/CLAUDE.md](../../../packages/ui/CLAUDE.md) — UI component library
- [packages/cms/CLAUDE.md](../../../packages/cms/CLAUDE.md) — CMS theme system
