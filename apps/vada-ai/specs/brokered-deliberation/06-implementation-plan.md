# 06 — Implementation Plan

This document specifies the commit-by-commit plan to build Vāda Brokered V1. Executor (Sonnet) follows this plan, running test gates between commits.

**Prerequisite:** Task 1 (Mastra removal) completed. Task 2 (package physical moves to `apps/vada-ai/*`) may or may not be done — implementation is independent.

---

## Scope of V1

Build:
- `vada__deliberate` MCP tool with Shape A interface
- Strategist, Critic, Devil's Advocate personas (with system prompts from document 03)
- Domain Expert persona behind feature flag
- Partial failure handling
- Session persistence to `mcp_sessions` table
- Dashboard read path already exists at `/brokered/consultations` — leave alone

Do NOT build:
- Streaming responses
- `vada__record_synthesis` tool
- Reframer, Fatal Flaw Finder, or other experimental personas
- Rate limiting (add in hardening pass)
- Observability beyond current Langfuse defaults

---

## Pre-implementation checklist

Before writing any code:

- [ ] Read all five prior documents in this folder
- [ ] Confirm Task 1 (Mastra removal) is complete (all verify scripts pass)
- [ ] Confirm `@vada/mcp-server` current tool set (there should already be `vada__consult` or `vada__deliberate` from earlier work — check what exists)
- [ ] Read `.claude/skills/vada-mcp-server/SKILL.md` for current MCP server conventions
- [ ] Read `.claude/skills/executor-protocol/SKILL.md`

---

## Commit plan

### Commit 1 — Persona registry scaffolding

Create the persona registry infrastructure. No LLM calls yet, just the data structures.

**Files:**

- `packages/mcp-server/src/personas/types.ts` — TypeScript types for PersonaSpec, PersonaResponse, etc.
- `packages/mcp-server/src/personas/strategist.ts` — Strategist config with system prompt from doc 03
- `packages/mcp-server/src/personas/critic.ts` — Critic config
- `packages/mcp-server/src/personas/devils-advocate.ts` — Devil's Advocate config
- `packages/mcp-server/src/personas/domain-expert.ts` — Domain Expert config (parameterized template)
- `packages/mcp-server/src/personas/registry.ts` — Exports PERSONAS record + PersonaRole type

**Content of each persona file:**

```typescript
import type { PersonaSpec } from './types'

export const strategist: PersonaSpec = {
  role: 'strategist',
  displayName: 'The Strategist',
  description: 'Maps the decision landscape...',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 800,
  systemPrompt: `ROLE: The Strategist in a Vāda deliberation...
    [full system prompt from doc 03]`,
}
```

**Validation:**
- Typecheck 19/19
- No lint errors

**Commit message:**
```
Feat: Scaffold Vāda Brokered persona registry

Adds @vada/mcp-server persona infrastructure with four personas:
- Strategist: decision landscape, tradeoffs, long-term view
- Critic: logical rigor, assumptions, evidence
- Devil's Advocate: frame-breaking, opposite thesis
- Domain Expert: field-specific grounding (parameterized)

Each persona has a system prompt derived from reviewer introspection
rounds (see apps/vada-ai/specs/brokered/03-reviewer-personas.md).

No runtime behavior change — pure scaffolding. Next commits wire
these into the tool handler.
```

### Commit 2 — Tool schema and validation

Build the `vada__deliberate` tool schema with Zod validation. No dispatching yet — pure input validation that returns mock responses.

**Files:**

- `packages/mcp-server/src/tools/deliberate.ts` — schema + validation + placeholder handler
- Update `packages/mcp-server/src/server.ts` — register the tool

**Tool schema (from doc 02):**

```typescript
const DeliberateInputSchema = z.object({
  context: z.string().min(50),
  question: z.string().min(10),
  reviewers: z.array(ReviewerSpecSchema).min(2).max(5),
  session_title: z.string().optional(),
  current_leaning: z.string().optional(),
  stakes: z.string().optional(),
})

const ReviewerSpecSchema = z.object({
  role: z.enum(['strategist', 'critic', 'devils_advocate', 'domain_expert']),
  notes: z.string().min(20).optional(),
  domain: z.string().optional(),
}).refine(
  (spec) => spec.role !== 'domain_expert' || spec.domain !== undefined,
  { message: 'domain_expert role requires domain parameter' }
)
```

**Placeholder handler:**

Returns mocked responses so the tool can be invoked end-to-end without LLM calls. Used for schema validation testing.

**Validation:**
- Typecheck
- Smoke test: invoke tool with valid input → returns mock, with invalid input → returns validation error

**Commit message:**
```
Feat: vada__deliberate tool schema and validation

Registers the vada__deliberate MCP tool with strict Zod validation.
Validates: context ≥50 chars, question ≥10 chars, 2-5 reviewers,
domain_expert requires domain parameter.

Handler returns mocked responses in this commit — actual LLM
dispatch in commit 3.

Tool is discoverable in Claude Desktop but not yet functional.
```

### Commit 3 — Reviewer dispatch and response assembly

Wire the actual LLM dispatch. Each reviewer runs in parallel, with timeout handling. Partial failures return gracefully.

**Files:**

- `packages/mcp-server/src/dispatch.ts` — parallel reviewer dispatcher with timeout
- `packages/mcp-server/src/tools/deliberate.ts` — updated to use real dispatch

**Implementation notes:**

- Use `resolveModel` from `@atta/models` to get the LLM provider client
- Use `Promise.allSettled` for parallel dispatch (not `Promise.all` — we want partial success)
- 15s timeout per reviewer via `AbortController`
- Build each reviewer's full prompt: system prompt + brief construction from input

**Brief construction:**

```
[User-provided context]

Question: [user-provided question]

[If current_leaning] Current thinking: [current_leaning]

[If stakes] Stakes: [stakes]

[If per-reviewer notes] Specific request for you: [notes]
```

**Response assembly:**

```typescript
{
  status: allSuccess ? 'complete' : someSuccess ? 'partial' : 'failed',
  session_id: '...',
  session_url: 'https://vada.ai/s/...',
  responses: [
    { role, status: 'success' | 'timeout' | 'error', response?, error_message? }
  ],
  total_latency_ms,
  total_cost_cents,
}
```

**Validation:**
- Typecheck
- Smoke test: invoke with real API key + real context, confirm all reviewers return
- Smoke test with fake API key for one provider, confirm partial failure returns correctly

**Commit message:**
```
Feat: Parallel reviewer dispatch with partial failure handling

vada__deliberate now makes real LLM calls. Each reviewer runs in
parallel with 15s timeout. Partial failures return gracefully:
successful reviewers' responses still reach the caller even if
one times out.

Uses Promise.allSettled + AbortController for clean timeout.
Returns status: 'complete' | 'partial' | 'failed' with per-reviewer
status markers.
```

### Commit 4 — Session persistence

Write each deliberation to the `mcp_sessions` table for dashboard viewing.

**Files:**

- `packages/mcp-server/src/persistence.ts` — session logger
- `packages/mcp-server/src/tools/deliberate.ts` — calls persistence before/after dispatch

**Schema (should exist from earlier work, verify):**

```sql
mcp_sessions:
  id              uuid primary key
  user_id         text
  tool_name       text
  created_at      timestamp
  duration_ms     int
  cost_cents      int
  transcript      jsonb  -- stores briefs and responses
  terminal_state  text   -- 'complete' | 'partial' | 'failed'
  session_title   text
```

**Writes two records:**

1. Before dispatch: initial record with `status: 'running'`, briefs, no responses yet
2. After dispatch: update with `status`, responses, latencies, final cost

Writes are best-effort — a failed DB write should not fail the tool call. Log the error; return responses to caller anyway.

**Validation:**
- Typecheck
- Smoke test: invoke tool, query DB, confirm row with expected shape
- Smoke test: simulate DB write failure, confirm tool still returns responses

**Commit message:**
```
Feat: Persist Brokered deliberations to mcp_sessions

Writes each vada__deliberate call to the mcp_sessions table for
audit and dashboard viewing. Records briefs, responses, latencies,
cost, and terminal state.

Writes are best-effort — failed persistence does not fail the tool
call. Caller always gets responses even if dashboard data is lost.

Visible in existing /brokered/consultations dashboard.
```

### Commit 5 — Persona tool description

Update the tool description surfaced to Claude. This is what shapes Claude's usage behavior and is where we teach it how to use Vāda well.

**Files:**

- `packages/mcp-server/src/tools/deliberate.ts` — update tool `description` field

**Content:**

Full tool description from doc 02, section "Tool description (shown to Caller Claude)". This is a long text block (~1200 words) that teaches Claude:

- When to invoke Vāda
- When NOT to invoke Vāda
- The reviewer roster and what each does
- How to write briefs (good vs bad)
- Reviewer selection guidance
- What to expect back
- How to synthesize responses
- How to handle partial failures

**Validation:**
- Typecheck
- Install in Claude Desktop, inspect tool description rendering
- Invoke with realistic brief, confirm Claude produces good brief

**Commit message:**
```
Feat: Comprehensive tool description for vada__deliberate

Expands the MCP tool description from schema-only to include
full usage guidance: when to invoke, how to write briefs, how
to synthesize responses. This is what teaches any Claude
instance how to use Vāda well.

Description content derived from reviewer rounds 1-4
(apps/vada-ai/specs/brokered/02-mcp-tool-interface.md).

Size: ~1200 words. Long by MCP conventions, but critical for
orchestration quality.
```

### Commit 6 — Feature flag for Domain Expert

Gate Domain Expert behind an environment flag so it ships code-ready but disabled by default.

**Files:**

- `packages/mcp-server/src/personas/registry.ts` — conditional export based on flag

**Implementation:**

```typescript
const DOMAIN_EXPERT_ENABLED = process.env.VADA_DOMAIN_EXPERT === 'true'

export const PERSONAS: Record<string, PersonaSpec> = {
  strategist,
  critic,
  devils_advocate: devilsAdvocate,
  ...(DOMAIN_EXPERT_ENABLED ? { domain_expert: domainExpert } : {}),
}
```

If user requests `domain_expert` when flag is off, return validation error.

**Validation:**
- Typecheck
- Smoke test with flag off: domain_expert request returns validation error
- Smoke test with flag on: domain_expert dispatches correctly

**Commit message:**
```
Feat: Gate Domain Expert behind VADA_DOMAIN_EXPERT flag

Ships Domain Expert persona code but disabled by default. Enable
via env var for early testing. Roster default stays at Strategist
+ Critic + Devil's Advocate until Domain Expert is validated in
production use.
```

### Commit 7 — Tests and smoke scripts

End-to-end verification scripts.

**Files:**

- `packages/mcp-server/scripts/smoke-deliberate.ts` — runs one real deliberation, reports results
- `packages/mcp-server/scripts/smoke-partial-failure.ts` — simulates one reviewer failing
- `packages/mcp-server/scripts/smoke-all-personas.ts` — runs each persona separately, confirms system prompts produce expected structure

**Commit message:**
```
Test: Smoke scripts for vada__deliberate end-to-end validation

Adds three smoke scripts:
- smoke-deliberate.ts: full deliberation with all three core personas
- smoke-partial-failure.ts: validates graceful handling of reviewer failure
- smoke-all-personas.ts: validates each persona's output format matches spec

These complement the existing verify-* scripts (Autonomous testing).
```

---

## Verification checklist after all commits

- [ ] All seven commits land in HEAD ancestry
- [ ] Typecheck 19/19 passes
- [ ] Biome clean
- [ ] Smoke tests all pass:
  - [ ] `smoke-deliberate.ts` — full deliberation completes
  - [ ] `smoke-partial-failure.ts` — partial failure handled
  - [ ] `smoke-all-personas.ts` — persona outputs match spec
  - [ ] Existing `verify-crucible-port.ts`, `verify-sparring-port.ts`, `verify-baselines.ts` all still pass (don't regress Autonomous)
- [ ] Manual Claude Desktop test:
  - [ ] Tool appears in Claude Desktop's MCP tools panel
  - [ ] Tool description renders correctly
  - [ ] Invoking tool with valid input returns responses
  - [ ] Invoking with invalid input returns structured error
  - [ ] Sessions appear in `/brokered/consultations`

---

## Post-V1 followups (not this task)

Flag these as separate tasks for later:

- **Streaming responses** — user sees partial progress during 20s wait
- **`vada__record_synthesis`** — Caller Claude records its synthesis for analytics
- **Rate limiting** — per-user hourly/daily limits
- **V2 remote HTTP** — deployment for claude.ai custom connectors
- **Additional personas** — Reframer, Fatal Flaw Finder (validate with production data first)
- **Cross-provider model assignment** — different LLM per persona (DeepSeek for Critic, etc.)
- **Observability improvements** — richer Langfuse traces, dashboard analytics on deliberation quality

---

## What to report after implementation

For each commit:
- Hash
- `git show --stat`
- Ancestry verification
- Smoke test results

Overall:
- Total files changed, lines added
- Typecheck + Biome final state
- Full list of smoke test passes
- Manual Claude Desktop test results
- Any decisions made not explicit in the prompt
- Any surprises
- Open followups

**Stop after verification. Do not proceed to additional work.**
