# Vāda — Claude Code Build Prompt (v2)

## Who You Are
You are building Vāda (vada.ai) — a deliberation engine. Read all attached spec documents before writing code. If a decision isn't covered, flag it — don't assume.

---

## Monorepo Context

Vāda lives inside the **Atta AI monorepo**.

| Product | Path | Domain | Status |
|---------|------|--------|--------|
| Herald AI | `apps/herald-ai/` | herald.ai | Active |
| Atta AI | `apps/atta-ai/` | atta.ai | Scaffold |
| Vitakka AI | `apps/vitakka-ai/` | vitakka.ai | Scaffold |
| **Vāda AI** | **`apps/vada-ai/`** | **vada.ai** | **YOU ARE BUILDING THIS** |

### Structure
```
atta-ai/
├── apps/
│   ├── herald-ai/web/         # Active
│   ├── atta-ai/web/           # Scaffold
│   ├── vitakka-ai/web/        # Scaffold
│   └── vada-ai/
│       ├── web/               # Next.js — the deliberation UI ← BUILD HERE
│       ├── mobile/            # Scaffold
│       └── mcp/               # Scaffold
├── packages/
│   ├── ui/                    # @atta/ui — shadcn/ui + Tailwind v4
│   ├── cms/                   # @atta/cms — Sanity
│   ├── db/                    # @atta/db — Drizzle client factory, column helpers
│   ├── auth/                  # @atta/auth — Clerk provider, middleware, hooks
│   └── typescript-config/
├── turbo.json
├── biome.json
└── CLAUDE.md                  # READ THIS FIRST
```

### Code Conventions
- Turborepo + Bun (NOT pnpm)
- TypeScript strict, no `any`
- Named exports, `type` imports
- Biome for linting/formatting (NOT ESLint/Prettier)
- shadcn/ui components, lucide-react icons
- Commit: `Type: Brief description` — never include Claude attribution
- `bun run dev:vada` starts on port 3003

---

## What Vāda Is

A deliberation engine with two modes:

**Deliberation Mode:** Full multi-agent room (4 or 6 agents), 3 rounds, Conclusion Protocol with Blind Critic audit. Structured JSON conclusion with terminal state (Clean/Revised/Unconverged).

**Sparring Mode:** Two-agent adversarial exchange. No Synthesizer, no conclusion protocol. Raw transcript. 3 volleys default, soft cap, 5 max.

NOT a chatbot. The Principal observes, does not participate.

---

## Tech Stack

- **Framework:** Mastra (TypeScript) — workflows via `.then()` chains
- **Frontend:** Next.js 16 (App Router, React 19)
- **Streaming:** SSE via Vercel AI SDK
- **Schema:** Zod for ALL structured outputs
- **Auth:** Clerk (from `@atta/auth`)
- **Database:** Neon Postgres + Drizzle (from `@atta/db`)
- **Styling:** Tailwind v4 + shadcn/ui (from `@atta/ui`)
- **Linting:** Biome
- **Hosting:** Vercel

---

## Team Presets

### The Crucible (Deliberation Mode)
Strategist + Critic + Devil's Advocate + Synthesizer. Full conclusion protocol.

### The War Room (Deliberation Mode)
Crucible + Researcher + Operator. Heavyweight analysis.

### The Sparring Match (Sparring Mode)
Two agents. Default: Strategist + Critic. Named configs: Acid Test (S+C), Paradigm Shift (S+DA), Feasibility Check (S+Op).
- 3 volleys default → "Continue sparring?" → 5 max
- "Push to The Crucible" button at bottom of transcript

---

## Agents

| Agent | Model | Temp | Function |
|-------|-------|------|----------|
| Strategist | Sonnet | 0.7 | Maps landscape, opportunity, risk |
| Critic (In-Room) | Sonnet | 0.7 | Attacks assumptions |
| Devil's Advocate | Sonnet | 0.7 | Challenges the frame |
| Synthesizer (In-Room) | Sonnet | 0.5 | Maps convergence/disagreement |
| Researcher | Sonnet | 0.7 | Grounds in evidence |
| Operator | Sonnet | 0.7 | Stress-tests execution |
| Synthesizer (Conclusion) | Sonnet | 0.2 | Schema-compliant JSON |
| Blind Critic | Sonnet* | 0.2 | Clean context audit |
| Synthesizer (Revision) | Sonnet | 0.2 | Targeted fix |

*Test Haiku for Blind Critic — binary classification task.

---

## Round Structure

### Round 1 — Orthogonal
- All agents generate **simultaneously**, see ONLY the question
- UI: **progressive reveal** — cards appear in grid as each completes, "waiting for N more..."
- 30s per-agent timeout. Error recovery: skip failed agent, flag, continue

### Round 2 — Adversarial
- **Sequential**. Each reads full raw R1 transcript (NO compaction)
- Stream word-by-word. `[TARGET: AgentName]` prefix for UI hooks
- Between rounds: check for Whispers/Directives/Stop

### Round 3 — Convergence
- Same as Round 2. Full R1+R2 transcript. Synthesizer speaks last

---

## Prompt Architecture — Composable

Final prompt = `[Base Posture + Permeability] + [Task Horizon] + [Round Modifier] + [Whisper Modifier] + [Universal Anchor]`

### The Universal Anchor (CRITICAL)
LLMs have recency bias. Append this as the LAST block of every in-room prompt:
```
CRITICAL REMINDER: The Principal's original question is: ${question}.
Your response must stay within your role. Do not exceed ${limit} words.
Do not summarize the entire conversation. Provide only your perspective for this round.
```
Without the anchor, agents drift from constraints within 2-3 rounds, especially weak models.

### Meta-Debate Killswitch
In the Devil's Advocate posture, include: "You must participate in the deliberation even if you disagree with the framing. You may challenge the frame as part of your argument, but you may NOT refuse to engage."

### See Tech Spec Section 10 for all prompt text (Base Postures, Task Horizons, Round Modifiers, Whisper Modifier, Conclusion Protocol prompts).

---

## Conclusion Protocol

### Step 1: Synthesizer Conclusion Mode (Temp 0.2)
Full transcript → structured JSON via Zod schema:
```typescript
const ConclusionSchema = z.object({
  recommendation: z.string(),      // Actionable. Format constraints apply HERE.
  key_condition: z.string(),        // The one assumption that must hold
  unresolved_points: z.array(z.object({
    point: z.string(),
    agents_involved: z.array(z.string())
  })),
  review_by: z.string(),            // ISO date from transcript time-sensitivity
  participants: z.array(z.object({
    agent: z.string(),
    version: z.string()
  }))
});
```
**Rule 5 (USER CONSTRAINTS):** If the Principal requested a format (e.g., "5 lines"), apply it to the recommendation string. Use `\n` for line breaks inside JSON strings.

### Step 2: Blind Critic (Temp 0.2)
**Clean context window** — ONLY question + conclusion JSON. No transcript.

**RULE 0:** Do NOT flag for being JSON. Evaluate formatting constraints against the recommendation field text only. Count `\n` as line breaks.

**LOGIC AUDIT:** Does the conclusion hold up on its own?

Output: `"PASS"` or `"FLAG: [Field] - [Objection]"`. Use **substring match** (forgiving audit — weaker models add filler).

### Step 3: Revision (if flagged)
Original JSON + specific objection → fix only the flagged part.

### Terminal States
| State | Meaning |
|-------|---------|
| **Clean** | Passed first time |
| **Revised** | Flagged → fixed → approved |
| **Unconverged** | Rejected twice. Honest signal, not error |

---

## Session State Machine

```typescript
enum SessionState {
  PENDING, ROUND_1, ROUND_2, ROUND_3,
  CONCLUDING, AUDITING, REVISING, TERMINAL
}
enum TerminalState { CLEAN, REVISED, UNCONVERGED }
```
Transitions are unidirectional. Errors move forward or to TERMINAL.

---

## Database (5 tables)

| Table | Key Fields |
|-------|------------|
| users | id, clerk_id (unique), email, created_at |
| sessions | id, user_id, question, agents[], state (enum), terminal_state, created_at, updated_at |
| transcript_entries | id, session_id, round, agent, content, target, order_in_round, created_at |
| interventions | id, session_id, type (enum), target, content, round, created_at |
| conclusions | id, session_id (unique), original_json, critic_verdict, revised_json, critic_re_verdict, terminal_state, review_by, created_at |

**Indexes:** (session_id, round, order_in_round) on transcript_entries. (user_id, created_at DESC) on sessions.

**Daily usage:** derived via `COUNT(*) FROM sessions WHERE user_id=? AND created_at >= today`. NOT a stored column.

**Incremental persistence:** Each agent response written to DB as it completes (for reconnection).

---

## Interventions

| Type | Timing | Target | UX |
|------|--------|--------|----|
| Whisper | Any time | Room (all) or Agent (one) | Invisible live, margin note in transcript |
| Directive | Between rounds | All agents | Preview + confirm |
| Stop | Instant | Session | Triggers conclusion protocol |

---

## Route Structure

```
src/app/
├── page.tsx                          # Landing / presets / question input
├── deliberation/[id]/page.tsx        # Live + archived (check session state)
├── history/page.tsx                  # Past sessions list
├── api/
│   ├── deliberation/
│   │   ├── start/route.ts            # POST — create session, start workflow
│   │   └── [id]/
│   │       ├── stream/route.ts       # GET — SSE stream
│   │       └── intervene/route.ts    # POST — whisper/directive/stop
│   └── sessions/
│       ├── route.ts                  # GET — list past sessions
│       └── [id]/
│           ├── route.ts              # GET — full session detail
│           └── export/route.ts       # GET — human-readable conclusion
├── sign-in/[[...sign-in]]/
├── sign-up/[[...sign-up]]/
└── layout.tsx
```

**Important:** `deliberation/[id]/page.tsx` handles BOTH live and archived sessions. Check state: if TERMINAL, render archive. If anything else, connect to SSE.

---

## Streaming UX

### SSE Event Types
```typescript
type SSEEvent =
  | { type: 'agent_start'; agent: string; round: number }
  | { type: 'agent_token'; agent: string; token: string }
  | { type: 'agent_complete'; agent: string; round: number; content: string }
  | { type: 'agent_error'; agent: string; error: string }
  | { type: 'round_complete'; round: number }
  | { type: 'loading_state'; message: string }
  | { type: 'conclusion_start' }
  | { type: 'conclusion_complete'; terminal_state: string }
  | { type: 'state_change'; state: SessionState }
  | { type: 'done' }
```

### Round 1: Progressive reveal (cards in grid as they complete)
### Rounds 2-3: Sequential streaming, word-by-word
### Cognitive Loading States: "Critic is reading the Strategist's position..."
### Targeted Quotes: `[TARGET: AgentName]` — regex match, hide tag, render visual hook
### Conclusion: Visual shift — feed dims, distinct panel, structured fields, state badge

---

## Cost Guardrails

- Daily session limit: 10 deliberations/day default
- Show "You have N deliberations remaining today" before starting
- No dollar amounts. Simple daily reset

---

## Technical Risks & Solutions

| Risk | Solution |
|------|----------|
| Streaming JSON brittle | [TARGET:] metadata tagging, not streamed JSON |
| Serverless timeout | SSE keeps connection alive on Vercel Pro |
| Round 1 bottleneck | Progressive reveal + per-agent timeout |
| Consensus hallucination | Blind Critic + schema-enforced unresolved_points |
| Agent failure mid-round | Skip, flag, continue. Don't abort |
| Context drift (weak models) | Universal Anchor at end of every prompt |
| Meta-debate derailing | Killswitch in Devil's Advocate posture |
| JSON Paradox | Format rules apply to recommendation string only. \n for breaks |
| Blind Critic filler | Forgiving audit — substring match for PASS/FLAG |

---

## What You Are NOT Building

- Knowledge × Role matrix — V2
- Audit model — designed, deferred
- Vitakka integration — conceptually defined
- Agent marketplace — not in V1
- Pricing — undecided
- Cross-session synthesis — V1 sessions independent

---

## Implementation Order

0. Set up `apps/vada-ai/web/` — wire auth, @atta/ui, verify `bun run dev:vada`
1. Zod schemas — ConclusionSchema, SessionState, InterventionType, AgentConfig
2. Database tables — 5 tables with Drizzle, indexes
3. Mastra workflow skeleton — Round1 → Round2 → Round3 → Conclusion → BlindCritic → Revision → Terminal
4. Prompt composition — compose() with Universal Anchor. Prompts are VERBATIM from spec
5. Single-agent test — one Strategist responding correctly
6. Round 1 parallel + progressive reveal
7. Round 2 sequential streaming with [TARGET] parsing
8. Conclusion Protocol — full loop including Blind Critic
9. Interventions — Whisper routing, Directive injection, Stop trigger
10. Session persistence + reconnection
11. Conclusion export
12. Team presets + Sparring Mode
13. Cost guardrails
14. UI polish — Cognitive Loading States, Targeted Quote hooks, Conclusion Reveal

Test each component independently (Dr. Miradi Practice #28).

---

## V1 Success Criteria

**Key Condition:** First five users reach conclusion in under three minutes and report output meaningfully different from asking a single AI.

**Terminal State KPI:** ~60% Clean, ~30% Revised, ~10% Unconverged.

**Review By:** 60 days after first user session.
