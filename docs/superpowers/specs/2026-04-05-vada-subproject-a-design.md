# Vada AI — Sub-project A: Foundation + Agent Engine

**Date:** 2026-04-05
**Scope:** App setup, shared packages (@atta/db, @atta/auth), database schema, Mastra workflow, prompt composition, SSE streaming, and minimal UI to run a full deliberation end-to-end.

**Source of truth:** `apps/vada-ai/specs/Vada_V1_TechSpec_Final.docx` and `apps/vada-ai/specs/Vada_Human_v2.docx`. Decisions in this spec override the originals where they differ (see Section 0).

---

## 0. Decisions That Override the Original Spec

These were agreed during design review (2026-04-05):

- **Mastra** for orchestration (confirmed — use it)
- **Sonnet** for all agents. Start Blind Critic with Sonnet, test Haiku later
- **Progressive reveal** for Round 1 — show cards as agents complete, not simultaneous
- **One Neon database, separate Postgres schemas** per product (`herald`, `vada`, `vitakka`)
- **`@atta/db`** = shared Drizzle tooling (connection factory, column helpers). Each app owns its schema
- **`@atta/auth`** = shared Clerk setup (provider, middleware, hooks). Each app has its own Clerk keys
- **Daily session limit** (10) derived from query, not stored counter
- **Session state machine** as explicit enum
- **Error recovery**: skip failed agent, continue with remaining
- **Mid-session reconnection**: incremental transcript persistence (DB write per agent turn)
- **Per-agent timeout**: 30s in Round 1
- **No interventions in Sub-project A** — Whisper/Directive/Stop deferred to Sub-project B

---

## 1. Shared Packages

### 1.1 `@atta/db` — `packages/db/`

Shared database tooling. NOT shared schema. Each product owns its tables in its own Postgres schema.

```
packages/db/
├── src/
│   ├── client.ts          # createDb(url, { schema }) → typed Drizzle client
│   ├── helpers.ts          # timestamps(), primaryId() column helpers
│   └── index.ts            # Public exports
├── package.json            # @atta/db — deps: drizzle-orm, @neondatabase/serverless
├── CLAUDE.md
├── README.md
└── tsconfig.json
```

**`createDb(connectionString, options)`**
- Returns a Drizzle client connected to Neon
- `options.schema` sets the Postgres `search_path` (e.g., `'vada'`)
- Each app calls this with `process.env.DATABASE_URL` and its schema name

**Column helpers:**
- `primaryId()` → UUID primary key with `gen_random_uuid()` default
- `timestamps()` → `{ created_at: timestamp DEFAULT now(), updated_at: timestamp DEFAULT now() }`

**Drizzle config and migrations stay local to each app** (e.g., `apps/vada-ai/web/drizzle.config.ts`).

### 1.2 `@atta/auth` — `packages/auth/`

Shared Clerk setup. Each product has its own Clerk keys and its own local users table.

```
packages/auth/
├── src/
│   ├── provider.tsx        # ClerkProvider wrapper
│   ├── middleware.ts        # clerkMiddleware helper for route protection
│   ├── hooks.ts             # Re-exports useUser, useAuth from @clerk/nextjs
│   └── index.ts
├── package.json            # @atta/auth — deps: @clerk/nextjs
├── CLAUDE.md
├── README.md
└── tsconfig.json
```

- No user data crosses products
- Clerk is the shared identity layer — match on `clerk_id` across DBs if cross-product queries are ever needed

---

## 2. Vada Database Schema

All tables live in the `vada` Postgres schema. Drizzle migrations managed locally at `apps/vada-ai/web/`.

### Enums

```typescript
const sessionState = pgEnum('session_state', [
  'PENDING', 'ROUND_1', 'ROUND_2', 'ROUND_3',
  'CONCLUDING', 'AUDITING', 'REVISING', 'TERMINAL'
])

const terminalState = pgEnum('terminal_state', ['CLEAN', 'REVISED', 'UNCONVERGED'])

const interventionType = pgEnum('intervention_type', ['WHISPER', 'DIRECTIVE', 'STOP'])
```

### Tables

**`users`** — Minimal. Daily usage derived, not stored.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| clerk_id | varchar UNIQUE NOT NULL | |
| email | varchar NOT NULL | |
| created_at | timestamp | DEFAULT now() |

Daily session count: `SELECT COUNT(*) FROM sessions WHERE user_id = ? AND created_at >= today`

**`sessions`** — One per deliberation.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| question | text NOT NULL | |
| agents | text[] NOT NULL | e.g., `['strategist', 'critic', 'devils_advocate', 'synthesizer']` |
| state | session_state | DEFAULT 'PENDING' |
| terminal_state | terminal_state NULLABLE | Denormalized from conclusions for fast list queries |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**`transcript_entries`** — Persisted incrementally (one DB write per agent turn).
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → sessions | |
| round | int NOT NULL | 1, 2, or 3 |
| agent | varchar NOT NULL | |
| content | text NOT NULL | Full agent response |
| target | varchar NULLABLE | Parsed from `[TARGET: AgentName]` |
| order_in_round | int NOT NULL | |
| created_at | timestamp | DEFAULT now() |

**`interventions`** — Whispers, Directives, Stops (Sub-project B populates this, schema defined now).
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → sessions | |
| type | intervention_type NOT NULL | |
| target | varchar NULLABLE | 'all' or agent name |
| content | text NULLABLE | null for STOP |
| round | int NOT NULL | |
| created_at | timestamp | DEFAULT now() |

**`conclusions`** — Full audit trail with original + revised JSON.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → sessions UNIQUE | |
| original_json | jsonb NOT NULL | Full ConclusionSchema |
| critic_verdict | varchar NOT NULL | "PASS" or "FLAG: [Field] - [Objection]" |
| revised_json | jsonb NULLABLE | Only if flagged and revised |
| critic_re_verdict | varchar NULLABLE | Second review if revised |
| terminal_state | terminal_state NOT NULL | CLEAN, REVISED, or UNCONVERGED |
| review_by | date NULLABLE | From conclusion JSON |
| created_at | timestamp | DEFAULT now() |

---

## 3. Zod Schemas

Location: `apps/vada-ai/web/src/schemas/`

### `conclusion.ts`
```typescript
const ConclusionSchema = z.object({
  recommendation: z.string(),
  key_condition: z.string(),
  unresolved_points: z.array(z.object({
    point: z.string(),
    agents_involved: z.array(z.string()),
  })),
  review_by: z.string(),  // ISO date
  participants: z.array(z.object({
    agent: z.string(),
    version: z.string(),
  })),
})
```

### `session.ts`
```typescript
const SessionState = z.enum([
  'PENDING', 'ROUND_1', 'ROUND_2', 'ROUND_3',
  'CONCLUDING', 'AUDITING', 'REVISING', 'TERMINAL',
])

const TerminalState = z.enum(['CLEAN', 'REVISED', 'UNCONVERGED'])

const InterventionType = z.enum(['WHISPER', 'DIRECTIVE', 'STOP'])
```

### `agent.ts`
```typescript
const AgentRole = z.enum([
  'strategist', 'critic', 'devils_advocate', 'synthesizer',
  'researcher', 'operator',
])

const AgentConfig = z.object({
  role: AgentRole,
  name: z.string(),       // Display name
  temperature: z.number(),
})
```

---

## 4. Agent Engine

### 4.1 Directory Structure

```
apps/vada-ai/web/src/engine/
├── workflow.ts               # Main Mastra workflow definition
├── rounds/
│   ├── round-one.ts          # Parallel execution, per-agent timeout (30s)
│   ├── round-two.ts          # Sequential, streaming, transcript context
│   └── round-three.ts        # Sequential, streaming, full transcript
├── conclusion/
│   ├── synthesizer.ts        # Conclusion Mode (Sonnet, temp 0.2, Zod-enforced)
│   ├── blind-critic.ts       # Clean context audit (Sonnet, temp 0.2)
│   └── revision.ts           # Targeted fix if flagged (Sonnet, temp 0.2)
├── prompts/
│   ├── postures.ts           # Base postures + permeability rules (verbatim from spec 9.1)
│   ├── task-horizons.ts      # Standard vs Synthesizer horizon (spec 9.2)
│   ├── round-modifiers.ts    # Round 1/2/3 modifiers (spec 9.3)
│   ├── whisper-modifier.ts   # Dynamic whisper injection (spec 9.4)
│   ├── conclusion-prompts.ts # Conclusion/Blind Critic/Revision prompts (spec 9.5)
│   └── compose.ts            # compose(agent, round, whispers?) → final system prompt
├── agents.ts                 # Agent definitions (4 core + 2 optional, with temps)
└── stream.ts                 # SSE emitter — wraps engine output into typed SSE events
```

### 4.2 Agent Definitions

```typescript
const DEFAULT_ROOM = [
  { role: 'strategist', name: 'Strategist', temperature: 0.7 },
  { role: 'critic', name: 'Critic', temperature: 0.7 },
  { role: 'devils_advocate', name: "Devil's Advocate", temperature: 0.7 },
  { role: 'synthesizer', name: 'Synthesizer', temperature: 0.5 },
]

const OPTIONAL_AGENTS = [
  { role: 'researcher', name: 'Researcher', temperature: 0.7 },
  { role: 'operator', name: 'Operator', temperature: 0.7 },
]
```

All in-room agents use **Sonnet**. Conclusion/Revision/Blind Critic use **Sonnet at temp 0.2**.

### 4.3 Prompt Composition

`compose()` concatenates per the spec's Section 9.6 matrix:

```typescript
function compose(agent: AgentConfig, round: number, whispers?: Intervention[]): string {
  const parts = [
    getPosture(agent.role),          // Base + Permeability (spec 9.1)
    getTaskHorizon(agent.role),      // Standard or Synthesizer variant (spec 9.2)
    getRoundModifier(round),         // Round 1/2/3 rules (spec 9.3)
  ]
  if (whispers?.length) {
    parts.push(getWhisperModifier()) // Only when principal_notes exist (spec 9.4)
  }
  return parts.join('\n\n')
}
```

All prompts are **verbatim from the tech spec** — stored as template literals, not generated.

### 4.4 Mastra Workflow

Single workflow with this chain:

```
START
  → createSession (DB write, state → PENDING)
  → Round1 (parallel agents, 30s timeout, state → ROUND_1)
    → persist each agent response incrementally
    → emit SSE events as agents complete
  → Round2 (sequential agents, streaming, state → ROUND_2)
    → context: question + full Round 1 transcript (raw, no compaction)
    → each agent streams word-by-word → SSE
    → persist each response on completion
  → Round3 (sequential agents, streaming, state → ROUND_3)
    → context: question + full Rounds 1+2 transcript (raw)
    → Synthesizer speaks last
    → persist each response on completion
  → ConclusionMode (state → CONCLUDING)
    → Synthesizer at temp 0.2 → Zod-validated JSON
    → persist original_json
  → BlindCritic (state → AUDITING)
    → clean context: question + original_json ONLY
    → output: "PASS" or "FLAG: ..."
    → persist critic_verdict
  → IF flagged:
    → Revision (state → REVISING)
    → persist revised_json
    → BlindCritic re-review
    → persist critic_re_verdict
  → Terminal State (state → TERMINAL)
    → determine: CLEAN (passed first time) / REVISED (flagged, fixed, passed) / UNCONVERGED (rejected twice)
    → persist terminal_state on both conclusions and sessions tables
    → emit conclusion_complete SSE event
DONE
```

### 4.5 Error Recovery

- **Agent fails mid-round:** Skip it, emit `agent_error` event, continue with remaining agents. Flag the absent voice in the transcript. The Synthesizer works with what the room produced.
- **Zod validation fails on conclusion:** Terminal state → UNCONVERGED. Surface the validation error.
- **SSE connection drops:** Session state and transcript are persisted incrementally. Client reconnects, fetches transcript so far, resumes SSE stream.

### 4.6 Round 1 — Progressive Reveal

All 4 agents generate in parallel. As each completes:
1. Persist the response to `transcript_entries`
2. Emit `agent_complete` SSE event with full content
3. Frontend renders the card immediately

30s per-agent timeout. If an agent times out, emit `agent_error`. When all agents have completed or timed out, emit `round_complete` and proceed to Round 2.

### 4.7 Rounds 2-3 — Sequential Streaming

Agents generate one at a time. Each agent:
1. Receives the full raw transcript from prior rounds as context (no compaction)
2. Streams word-by-word → `agent_token` SSE events
3. On completion: parse `[TARGET: AgentName]` from output, persist to `transcript_entries` with target field, emit `agent_complete`

Between agents, emit `loading_state` event with cognitive loading message (e.g., "Critic is reading the Strategist's position...").

---

## 5. SSE Event Types

```typescript
type SSEEvent =
  | { type: 'agent_start'; agent: string; round: number }
  | { type: 'agent_token'; agent: string; token: string }
  | { type: 'agent_complete'; agent: string; round: number; content: string }
  | { type: 'agent_error'; agent: string; error: string }
  | { type: 'round_complete'; round: number }
  | { type: 'loading_state'; message: string }
  | { type: 'conclusion_start' }
  | { type: 'conclusion_complete'; terminal_state: TerminalState }
  | { type: 'state_change'; state: SessionState }
  | { type: 'done' }
```

---

## 6. Route Structure

```
apps/vada-ai/web/src/app/
├── page.tsx                          # Landing / new deliberation
├── deliberation/
│   └── [id]/
│       └── page.tsx                  # Live deliberation + conclusion (dual-mode)
├── history/
│   └── page.tsx                      # Past sessions list
├── api/
│   ├── deliberation/
│   │   ├── start/route.ts            # POST — create session, start Mastra workflow
│   │   └── [id]/
│   │       ├── stream/route.ts       # GET — SSE stream
│   │       └── intervene/route.ts    # POST — whisper/directive/stop (Sub-project B)
│   └── sessions/
│       ├── route.ts                  # GET — list past sessions
│       └── [id]/
│           ├── route.ts              # GET — full session with transcript
│           └── export/route.ts       # GET — human-readable conclusion
├── sign-in/[[...sign-in]]/
├── sign-up/[[...sign-up]]/
└── layout.tsx                        # Root layout (ClerkProvider, fonts, theme)
```

7 API routes, 3 pages.

### API Contracts

**`POST /api/deliberation/start`**
- Body: `{ question: string, agents: string[] }`
- Returns: `{ session_id: string }`
- Creates session in DB, kicks off Mastra workflow in background, returns immediately
- Checks daily session limit (10) before starting

**`GET /api/deliberation/[id]/stream`**
- SSE stream of typed events (see Section 5)
- Client connects via `EventSource`
- If session is already complete, returns full transcript as batch events then `done`

**`GET /api/sessions`**
- Returns: `{ sessions: Array<{ id, question, terminal_state, state, created_at }> }`
- Ordered by created_at desc

**`GET /api/sessions/[id]`**
- Returns: Full session + transcript_entries + interventions + conclusion
- Used for: reconnection (mid-session), archived viewing, and detail page

**`GET /api/sessions/[id]/export`**
- Returns: Human-readable formatted text of the conclusion
- Renders structured fields as prose, includes terminal state label

**`POST /api/deliberation/[id]/intervene`** — Defined but not implemented in Sub-project A.

---

## 7. Frontend (Minimal for Sub-project A)

### Pages

**`page.tsx` — Landing**
- Question input (single text field, "What do you want to figure out?")
- Default agent room shown (4 agents pre-selected)
- "Customize your room" secondary action (toggle Researcher/Operator on/off)
- "Start Deliberation" → POST `/api/deliberation/start` → redirect to `/deliberation/[id]`
- Auth gate — must be signed in
- Daily limit indicator: "You have N deliberations remaining today"

**`deliberation/[id]/page.tsx` — Dual-Mode Page**

This page handles both live and archived sessions based on session state:

- **If state !== TERMINAL:** Live mode. Connect to SSE stream, render timeline progressively
- **If state === TERMINAL:** Archived mode. Fetch full session from `/api/sessions/[id]`, render complete transcript + conclusion

Live mode:
- On mount: fetch session from `/api/sessions/[id]` to get any transcript so far (reconnection case)
- Then connect to SSE stream for remaining events
- Round 1: Cards appear progressively as `agent_complete` events arrive. "Waiting for N more..." indicator
- Rounds 2-3: Streaming text entries, word-by-word via `agent_token` events
- Conclusion: When `conclusion_complete` arrives, deliberation section dims, conclusion panel appears with structured fields and terminal state badge (Clean/Revised/Unconverged)

Archived mode:
- Full transcript rendered statically
- Conclusion panel at bottom with terminal state badge
- If REVISED: "View objection and revision" expandable showing original_json, critic_verdict, revised_json

**`history/page.tsx` — Past Sessions**
- Chronological list of past sessions
- Each entry: question (truncated), terminal state badge, date
- Click → `/deliberation/[id]`

### Components

```
src/components/
├── deliberation/
│   ├── QuestionInput.tsx       # Text field + agent selector + start button
│   ├── Timeline.tsx            # Vertical feed container
│   ├── AgentCard.tsx           # Round 1 card (agent name, posture color, content)
│   ├── StreamingEntry.tsx      # Rounds 2-3 streaming text with agent header
│   ├── StateIndicator.tsx      # Current session state badge
│   └── ConclusionPanel.tsx     # Structured conclusion display with terminal state
├── session/
│   ├── SessionList.tsx         # History list
│   └── SessionCard.tsx         # List entry (question, state, date)
└── shared/
    └── AgentBadge.tsx          # Agent name + color indicator
```

---

## 8. What Is NOT in Sub-project A

- Intervention UI (Whisper, Directive, Stop) — Sub-project B
- Cognitive Loading States (beyond basic "loading" text) — Sub-project C
- Targeted Quote visual hooks (connecting attacks to targets) — Sub-project C
- Whisper display in transcript — Sub-project B
- Conclusion export formatting — the API route is defined but rich formatting is Sub-project C
- UI polish (animations, transitions, conclusion reveal animation) — Sub-project C
- Cost guardrails beyond the daily limit check — Sub-project C

---

## 9. Verification

Sub-project A is complete when:
1. `@atta/db` and `@atta/auth` packages exist and are used by Vada
2. `bun run dev:vada` starts on port 3003
3. A user can sign in, type a question, start a deliberation
4. 4 agents generate Round 1 positions in parallel, cards appear progressively
5. Rounds 2-3 stream sequentially with `[TARGET]` tags parsed
6. Conclusion protocol runs (Synthesizer → Blind Critic → terminal state)
7. Completed session is viewable from history
8. Mid-session reconnection works (close tab, reopen, see transcript so far + resume stream)
