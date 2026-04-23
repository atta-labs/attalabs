# Vāda · V1 Technical Specification

**vada.ai**
*From the Pali: the act of deliberating toward a conclusion.*

Version 4 — April 2026 (markdown, replacing v3 docx)
Built in deliberation: Daniel (Principal) · Claude Opus (Critic/Synthesizer) · Gemini Pro (Strategist/Operator)

---

## 1. Product Definition

Vāda is a deliberation engine. Multiple AI agents with distinct behavioral roles deliberate a question across multiple rounds, producing a structured conclusion that names both what was resolved and what was not. The user is the **Principal** — the person the deliberation is for.

Vāda is not a chatbot. The Principal does not talk to the agents; the agents talk to each other. Vāda is not an automation tool. It helps people think through decisions that deserve more than one perspective.

### 1.1 The Deliberation Layer

Vāda sits above the Execution Layer. Execution tools assume the plan is the right plan. Vāda challenges the plan before resources are committed — stress-tests assumptions, attacks the frame, surfaces disagreements.

### 1.2 V1 Scope — Closed-Room

V1 is a Closed-Room Deliberation: no external tool access, no web browsing, no code execution, no MCP.

**Important caveat discovered April 21, 2026:** closed-room V1 means Vāda's agents reason purely from training data. This is identified as a primary product limitation (see `vada-product-thesis.md` Challenge 2). V2 experiments will test the impact of tool access. V1 ships without tools for measurement discipline, not as a permanent architecture decision.

### 1.3 Product Modes

- **Deliberation Mode:** Full multi-agent room (4 or 6 agents), three rounds, Conclusion Protocol with Blind Critic audit
- **Sparring Mode:** Two-agent adversarial exchange, raw transcript only, no conclusion

---

## 2. The V1 Agent Set

### 2.1 Cognitive Quarantine

Each agent runs as a separate LLM instance with its own system prompt. Structural separation prevents Persona Collapse (where a single model simulating multiple perspectives converges toward consensus within ~2,000 tokens).

### 2.2 Agent Roles

- **Strategist** — maps opportunity and risk
- **Critic** — finds flaws in proposed plans
- **Devil's Advocate** — challenges whether the question itself is right
- **Synthesizer** — identifies convergence and irreducible disagreement
- **Researcher** (War Room) — grounds claims in evidence
- **Operator** (War Room) — stress-tests execution feasibility

### 2.3 Model Configuration

V1 locks all agents to Claude Sonnet 4.6. Multi-model Architectural Cognitive Diversity is a V2 research target.

**Why single-model V1:**
- Conclusion Protocol requires strict JSON schema compliance
- Different providers handle schema differently
- V1 must ship with stable conclusion pipeline
- Per-agent BYOK UI is V2 scope

---

## 3. Team Presets

### 3.1 The Crucible
Strategist + Critic + Devil's Advocate + Synthesizer. Full Conclusion Protocol.

### 3.2 The War Room
Crucible + Researcher + Operator. Full Conclusion Protocol.

### 3.3 The Sparring Match
Two agents (default: Strategist + Critic). Max 5 volleys. Raw transcript only. "Push to Crucible" button opens full deliberation with sparring transcript as context.

---

## 4. Round Structure

### 4.1 Round 1 — Orthogonal

Agents generate independently with only the Principal's question as context. UI shows progressive reveal as each completes.

### 4.2 Round 2 — Adversarial

Agents generate sequentially. Each reads full Round 1 transcript plus preceding Round 2 responses. `[TARGET: AgentName]` metadata tags enable UI attack-links.

### 4.3 Round 3 — Convergence

Same structure as Round 2. Full transcript from Rounds 1 and 2. Synthesizer speaks last.

### 4.4 Inter-Round Context

Raw transcript, never compacted. Compaction removes the friction surface. At ~500 words/agent × 4 agents, Round 1 is ~3,000 tokens — well below context thresholds.

---

## 5. The Conclusion Protocol

### 5.1 Conclusion Schema (Zod-enforced)

```typescript
const ConclusionSchema = z.object({
  recommendation: z.string(),
  key_condition: z.string(),
  unresolved_points: z.array(z.object({
    point: z.string(),
    position_a: z.string(),
    position_b: z.string(),
  })),
  review_by: z.string(),
})
```

**V1 bench learning (April 21, 2026):** the single `recommendation` string field forces Synthesizer over-compression. V2 Experiment 1.B considers schema refinement with richer structure.

### 5.2 The Blind Critic

Invoked in clean context. Sees only the original question and the Synthesizer's JSON. Two audits:

**RULE 0 (Constraint Audit):** If Principal requested specific format, evaluate ONLY the recommendation field's text. Do not flag for being JSON.

**Logic Audit:** Does the conclusion hold up? Are claims unsupported? Has the Synthesizer papered over disagreement?

**Output:** `PASS` or `FLAG: [field] - [objection]`

### 5.3 Revision Protocol

If flagged: Synthesizer receives original JSON + specific objection. Fixes only the flagged issue. Blind Critic reviews revision.

### 5.4 Terminal States

- **Clean** — Blind Critic passed first audit
- **Revised** — Synthesizer revised after objection; reaudit occurred
- **Unconverged** — honest signal that the question did not yield a confident answer
- **Error** — parse failure or pipeline error (V1 bench: 0 across 14 runs)

---

## 6. Principal Intervention Model

### 6.1 The Whisper

Asynchronous context injection. Any moment. Does not interrupt current agent. Room Whisper (all agents) or Agent Whisper (specific agent).

### 6.2 The Directive

Synchronous pivot. Between rounds only. Safety interlock: one-sentence preview, Principal confirms.

### 6.3 The Stop

Instantaneous. Aborts current generation. Triggers Conclusion Protocol on existing transcript.

---

## 7. Streaming UX (Post-Step-6)

### 7.1 Layout

Single vertical timeline. Not parallel columns.

### 7.2 Round 1

Progressive reveal. Cards appear as each agent completes, with "waiting for N more..." indicator.

### 7.3 Rounds 2-3

Post-Step-6 uses step-completion granularity (SSE events from `/workflow/run`). Each agent's response appears fully-formed when the step completes. Per-agent "thinking..." spinner shown during in-flight generation.

**UX regression from pre-Step-6:** token-by-token streaming was lost in the Mastra migration. Token-level streaming is a V2 UX enhancement followup.

### 7.4 Conclusion Reveal

Visual shift. Deliberation feed dims. Conclusion appears in distinct panel with terminal state badge.

---

## 8. Session Persistence

### 8.1 State Machine

```
PENDING → ROUND_1 → ROUND_2 → ROUND_3 → CONCLUDING → AUDITING → TERMINAL
                                                          ↓
                                                      REVISING → AUDITING(2) → TERMINAL
```

Unidirectional transitions.

### 8.2 Mid-Session Reconnection

Every agent response written to DB immediately. If client disconnects mid-deliberation, Mastra workflow continues server-side. On reconnect, browser fetches session state and renders up to current progress.

### 8.3 Cost Guardrails

Daily session limit per user (default: 10/day). Indicator: "You have N deliberations remaining today."

---

## 9. Prompt Library

### 9.1 Composition

```
Final prompt = [Base Posture + Permeability] + [Task Horizon] + [Round Modifier] + [Whisper Modifier] + [Universal Anchor]
```

### 9.2 Base Postures

**The Strategist**
Map the landscape. Identify opportunity, risk, path forward. Permeability: not defensive — acknowledge flaws immediately.

**The Critic**
Find what is wrong. Attack assumptions. Permeability: if destroying a premise and a superior alternative exists, propose it.

**The Devil's Advocate**
Challenge whether the question itself is right. Meta-Debate Killswitch: must participate even when disagreeing with framing.

**The Synthesizer (In-Room)**
Draw threads together. Do NOT force consensus. Map borders of agreement AND irreducible disagreement with equal care.

**The Researcher**
Ground claims in evidence and precedent.

**The Operator**
Stress-test execution feasibility.

### 9.3 Task Horizon

Standard agents: do NOT summarize or write concluding recommendation. Provide specific perspective on current state only.

### 9.4 Round Modifiers

- Round 1: first encounter. Do not address other agents.
- Rounds 2-3: read prior transcript. Address friction. Begin attacks with `[TARGET: AgentName]`.

### 9.5 The Universal Anchor

```
CRITICAL REMINDER: The Principal's original question is: [QUESTION].
Your response must stay within the bounds of your role.
Do not exceed [TOKEN_LIMIT] words.
Do not summarize the entire conversation.
Provide only your perspective for this round.
```

Appended to end of every composed prompt. LLMs have recency bias — constraints at the start are forgotten by the time the model generates. The anchor solves this.

### 9.6 Conclusion Protocol Prompts

**Synthesizer — Conclusion Mode (Temp 0.2):**
Produces JSON matching ConclusionSchema.
- No conversational filler
- If room did not reach unified recommendation, explicitly state the failure
- unresolved_points must be specific and named
- review_by based on time-sensitivity
- If format requested, apply to recommendation field's text with `\n` for line breaks

**V2 refinement target (Experiment 1.A):** prompt update to preserve conditional branches, caveats, and decision-support scaffolding rather than compressing to single verdict.

**Blind Critic — Auditor (Temp 0.2):**
Sees only Principal's question and final Conclusion JSON.
- RULE 0: do not flag for being JSON. Evaluate recommendation field's text only.
- Logic audit: does conclusion hold? Claims supported? Consensus genuine?
- Output: `PASS` or `FLAG: [field] - [objection]`

**Synthesizer — Revision Mode (Temp 0.2):**
Receives original conclusion + objection. Revises only flagged logic/formatting.

---

## 10. Benchmark Comparison Feature

V1 includes opt-in benchmark comparison. Shipped April 2026.

**Per session with benchmark enabled:**
- Deliberation runs normally
- Baseline: single API call with prompt "Answer the user's question directly. No framing, no caveats."
- Judge: compares both responses, produces diagnosis

**Diagnosis taxonomy:**
- VADA_WON / BASELINE_WON / TIE / NEGLIGIBLE_DIFFERENCE / PIPELINE_FAILURE

**Use:** baseline for V2 experiments. All V2 architecture variants measured against the same 15 bench questions.

See `vada-v1-bench-results.md` and `vada-v2-specification.md`.

---

## 11. Technology Stack

- **Monorepo:** Turborepo + Bun
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Orchestration:** Mastra (TypeScript), workflows via `.then()` chains
- **Streaming:** SSE from `/api/deliberation/[id]/workflow/run`
- **Observability:** Langfuse (workflow/step-level spans, apiKey redacted via SensitiveDataFilter)
- **Schema:** Zod for all structured outputs
- **Auth:** Clerk (from `@atta/auth`)
- **Database:** Neon Postgres + Drizzle ORM (from `@atta/db`)
- **Styling:** Tailwind CSS v4 + shadcn/ui (from `@atta/ui`)
- **Linting:** Biome
- **Hosting:** Vercel

---

## 12. Database Schema

Five tables scoped to vada-ai in `@atta/db`:

- **users** — Clerk linkage
- **sessions** — deliberation metadata, state, terminal state
- **transcript_entries** — per-agent-per-round outputs with tokens/elapsed
- **conclusions** — synthesized JSON + audit verdict + revised JSON
- **benchmark_metrics** — opt-in: baseline answer, judge response, diagnosis

**Indexes:**
- `(session_id, round, order_in_round)` on transcript_entries
- `(user_id, created_at DESC)` on sessions

---

## 13. Privacy — BYOK Architecture

### 13.1 Post-Step-6 Model

API keys stored in user's browser (passkey-encrypted IndexedDB or session-only memory). At deliberation time, browser sends apiKey to server via `POST /api/deliberation/[id]/workflow/run` as part of request body.

Server:
- Uses apiKey to invoke LLM providers during the workflow
- Holds apiKey in memory for request duration
- Never persists to any storage layer
- Redacts apiKey from all observability traces
- Discards when workflow request completes

### 13.2 Privacy Properties

- No database column for keys
- No logs contain keys
- No server persistence
- Keys transit server only during single deliberation request

See `vada-byok-principles.md`.

---

## 14. Technical Risks (as of April 21, 2026)

| Risk | Status |
|------|--------|
| Persona Collapse | Mitigated by Cognitive Quarantine. Verified with Sonnet. Small models (Qwen 14B) fail this. |
| JSON parse failures | Mitigated by containment (strict + lenient). 0 failures in V1 bench. |
| Synthesizer over-compression | **Active issue** — V1 bench identified. V2 Experiment 1.A addresses. |
| apiKey leakage | Mitigated: SensitiveDataFilter + no persistence. |
| Typecheck OOM | Temporary: 8GB heap. Long-term cleanup needed. |
| Clerk token expiry mid-run | Per-script fix in place. |

---

## 15. Deferred to Post-V1

- Per-agent model configuration (BYOK UI)
- Architectural Cognitive Diversity (multi-model agents)
- Tool access (web search, MCP) — V2 Challenge 2
- Cross-session synthesis — Vitakka scope
- Mobile app
- Team collaboration

---

## 16. V1 Success Criteria

**Key condition:** First users reach conclusion in under three minutes and report output meaningfully different from single AI.

**Terminal distribution target:** Healthy mix of Clean (majority), Revised (some), Unconverged (occasional).

**V1 Bench Baseline (April 21, 2026):** 7 VADA_WON / 7 BASELINE_WON on 14 questions. Current position: research baseline, not validated consumer product. V2 experiments target meaningful improvement.

**Honest framing:** V1 is the baseline for research. See `vada-product-thesis.md`.

---

## 17. Pedigree of Thought

This specification was produced through multi-session deliberation between Daniel (Principal), Claude Opus 4.6 (Critic/Synthesizer), and Gemini Pro (Strategist/Operator), with reference to Dr. Maryam Miradi's *AI Agents: 50 Real-World Best Practices*.

Every architectural decision survived adversarial review. The Blind Critic emerged from combining hallucination mitigation with the conclusion protocol. The Meta-Debate Killswitch and Universal Anchor were discovered during implementation.

The Synthesizer over-compression problem was discovered April 21, 2026 by Vāda Bench V1 — the product's own measurement system surfacing its own flaw. This is the bench doing what it was designed to do.

---

**Vāda · vada.ai · V1 Technical Specification v4 · April 2026**
*From the Pali: the act of deliberating toward a conclusion.*
