# Vada AI Web — Claude Code Instructions

The Next.js web app for Vada AI. Users submit a question, configure agents, and watch a live deliberation stream powered by a Mastra workflow. Sessions are persisted and resumable.

---

## Architecture

```
apps/vada-ai/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout (NextWebShell)
│   │   ├── (main)/                         # Clerk-protected shell (UserTopBar)
│   │   │   ├── (home)/                     # Landing page + home sections
│   │   │   ├── deliberate/                 # Start a new deliberation
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── DeliberateSection.tsx      # Top-level: benchmark toggle + form
│   │   │   │       ├── QuestionInputArea.tsx       # Question textarea + global model picker
│   │   │   │       ├── TeamCardGrid.tsx            # Preset cards + DELIBERATE button
│   │   │   │       ├── GlobalModelSelector.tsx     # Model picker popover
│   │   │   │       ├── useDeliberateForm.ts        # Form state + handleStart
│   │   │   │       └── useGlobalModelSelector.ts
│   │   │   ├── history/                    # Past sessions list
│   │   │   ├── settings/                   # API keys + agent model config
│   │   │   ├── trust/                      # BYOK architecture principles (page.tsx only)
│   │   │   └── science/                    # MDX article browser
│   │   ├── deliberation/[id]/             # Live deliberation view (no Clerk shell)
│   │   │   ├── page.tsx                   # Server: hydrates session → passes to client
│   │   │   └── components/
│   │   │       ├── DeliberationFeed.tsx    # Scrolling feed of RoundStrip sections
│   │   │       ├── RoundStrip.tsx          # Per-round: sphere row + selected speaker card
│   │   │       ├── useRoundStrip.ts        # Round-level derivations, copy/download
│   │   │       ├── useDeliberation.ts      # SSE consumer — opens /workflow/run, streams events
│   │   │       ├── useDeliberationScene.ts # Canvas + UI state derived from useDeliberation
│   │   │       ├── deriveAgentStates.ts    # Pure: (agentRoles, entries, streaming, round) → AgentState[]
│   │   │       ├── ConclusionPanel.tsx     # Final conclusion (rendered markdown, UNCONVERGED flag)
│   │   │       ├── markdown-components.tsx # Shared ReactMarkdown overrides
│   │   │       ├── transcript-export.ts    # Markdown serializers — whole transcript + per-round
│   │   │       └── useJudgeBenchmark.ts    # Benchmark judge evaluation hook
│   │   └── api/
│   │       ├── deliberation/start/         # POST — create session, return sessionId
│   │       ├── deliberation/[id]/workflow/run/  # POST start Mastra run + GET SSE stream
│   │       ├── deliberation/[id]/intervene/     # POST — whisper/directive/stop
│   │       ├── sessions/                   # GET — list sessions
│   │       ├── sessions/[id]/              # GET — fetch session state for hydration
│   │       ├── sessions/[id]/baseline/     # POST — store single-shot benchmark answer
│   │       ├── sessions/[id]/benchmark/    # GET — fetch benchmark comparison data
│   │       ├── sessions/[id]/judge/        # POST — run AI judge evaluation
│   │       ├── sessions/[id]/export/       # GET — download full session transcript
│   │       └── settings/                   # GET/POST — API keys + team model config
│   ├── engine/                            # Deliberation engine (server-only)
│   │   ├── agents.ts                      # Agent role definitions + configs
│   │   ├── orchestrator.ts                # Provider call + retry wrapper
│   │   ├── conclusion-rescue.ts           # Conclusion JSON repair/fallback
│   │   ├── turn-logic.ts                  # persistTurn — single DB write path for transcript
│   │   ├── types.ts                       # Shared engine types
│   │   ├── prompts/                       # Agent prompt composition
│   │   │   ├── compose.ts
│   │   │   ├── conclusion-prompts.ts
│   │   │   ├── postures.ts
│   │   │   ├── round-modifiers.ts
│   │   │   ├── task-horizons.ts
│   │   │   └── whisper-modifier.ts
│   │   └── workflow/                      # Mastra workflow
│   │       ├── crucible-workflow.ts        # Workflow definition (step graph)
│   │       └── steps.ts                   # Step implementations + getNextCommand state machine
│   ├── schemas/                           # Zod schemas (session, conclusion, intervention)
│   ├── components/                        # Shared UI (IdentityBanner, UserTopBar, etc.)
│   └── lib/                              # Shared utilities + context
├── scripts/                              # Dev verification scripts
│   └── test-crucible-workflow.ts          # Smoke test — runs full workflow via /workflow/run
├── drizzle.config.ts
└── package.json
```

---

## Critical Rules

### RULE #1: Engine changes require explicit instruction

Do not modify agent prompts, round logic, or workflow steps without explicit instruction. The deliberation flow is intentional and tuned.

### RULE #2: Workflow route guards against duplicate runs

The `/workflow/run` route checks `session.state === 'PENDING'` before starting the Mastra workflow. This prevents duplicate runs on page reload or SSE reconnect. Never remove this guard.

```ts
const shouldStart = initial.state === 'PENDING'
if (shouldStart) {
  const wf = mastra.getWorkflow('crucible')
  const run = await wf.createRun()
  run.start({ inputData: { sessionId, apiKey } }).catch(() => {})
}
// Always open SSE poll loop — serves both fresh starts and reconnects
```

### RULE #3: persistTurn is the single write path

All workflow steps write agent turns through `persistTurn` in `turn-logic.ts`. The SSE poll loop discovers new entries via DB reads. Never write transcript rows directly outside of `persistTurn`.

### RULE #4: Per-agent model config threads everywhere

Each agent can use a different model. Provider and modelId are stored on the session and must be threaded through the full engine pipeline — never hardcode a model per agent role.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/deliberation/start` | POST | Create session, return sessionId |
| `/api/deliberation/[id]/workflow/run` | POST + GET SSE | Start Mastra workflow + stream events |
| `/api/deliberation/[id]/intervene` | POST | Send whisper/directive/stop intervention |
| `/api/sessions` | GET | List user's sessions |
| `/api/sessions/[id]` | GET | Fetch session state for page hydration |
| `/api/sessions/[id]/baseline` | POST | Store single-shot benchmark answer |
| `/api/sessions/[id]/benchmark` | GET | Fetch benchmark comparison data |
| `/api/sessions/[id]/judge` | POST | Run AI judge evaluation |
| `/api/sessions/[id]/export` | GET | Download full session transcript |
| `/api/settings` | GET/POST | API keys + preferences |
| `/api/settings/team-models` | POST | Save per-agent model config |

---

## Session States

| State | Meaning |
|-------|---------|
| `PENDING` | Session created, workflow not yet started |
| `ROUND_1` | Agents debating in round 1 |
| `ROUND_2` | Agents debating in round 2 |
| `ROUND_3` | Agents debating in round 3 |
| `CONCLUDING` | Synthesizer producing structured conclusion JSON |
| `AUDITING` | Blind critic evaluating the conclusion |
| `REVISING` | Synthesizer revising after critic rejection |
| `TERMINAL` | Deliberation complete — check `terminalState` for outcome |

**Terminal states** (set on the `terminalState` column when `state = TERMINAL`):

| Terminal State | Meaning |
|----------------|---------|
| `CLEAN` | Critic accepted the first-pass conclusion |
| `REVISED` | Critic rejected; revised conclusion accepted |
| `UNCONVERGED` | Revision also rejected; best available conclusion shown |
| `SPARRING_COMPLETE` | Legacy — pre-2026-04-18 sessions only; current engine never produces this |

---

## SSE Event Types

`useDeliberation.ts` opens `/api/deliberation/[id]/workflow/run?stream=true` and consumes these events:

| Type | Payload | Effect |
|------|---------|--------|
| `state_changed` | `{ state: SessionState }` | Updates round indicators and loading spinners |
| `agent_completed` | `{ agent: string; round: number; message: string }` | Appends transcript entry |
| `terminal` | `{ terminalState: string; conclusion: object }` | Closes stream, renders conclusion panel |
| `keepalive` | `{}` | No-op — prevents connection timeout every 15s |
| `error` | `{ message: string }` | Infra-level failure (not model errors) |

Emission order within each poll cycle: `agent_completed` before `state_changed` — message appears before round indicator updates.

---

## Specifications

Specs live at the product level, not the surface level.

| Spec | Path | Purpose |
|------|------|---------|
| Use Cases (v0) | [../specs/v0/Vada_Use_cases.md](../specs/v0/Vada_Use_cases.md) | Original use case definitions |
| Science of Vada (v0) | [../specs/v0/science_of_vada.md](../specs/v0/science_of_vada.md) | Deliberation philosophy and methodology |

---

## Related Documentation

- [Vada AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
- [.claude/skills/vada-engine/SKILL.md](../../../.claude/skills/vada-engine/SKILL.md) — Engine architecture and rules
- [packages/ui/CLAUDE.md](../../../packages/ui/CLAUDE.md) — UI component library
- [packages/cms/CLAUDE.md](../../../packages/cms/CLAUDE.md) — CMS theme system
