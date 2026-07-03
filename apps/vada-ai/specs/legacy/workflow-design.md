# Vāda Workflow Design — Implementation Notes

Status: retired

**Historical record of the Step 5 Mastra migration design phase.**
Design document written before implementation; implementation shipped April 2026.
*This doc is preserved as an engineering record, not a living spec. For current architecture, see `vada-v1-tech-spec.md`.*

---

## Status

- **Step 5** (Crucible workflow on Mastra): ✅ Shipped (commit 530a2a0, April 2026)
- **Step 5.5** (Langfuse observability): ✅ Shipped (commit 70b4bcd, April 21, 2026)
- **Step 6** (Browser migration + /trust rewrite): 🚧 In progress as of April 21, 2026
- **Step 8** (MCP for Researcher): Deferred to V2 Phase 2.1

---

## Section 1 — State Machine → Workflow Mapping

### Previous architecture

`getNextCommand(session)` was a switch on `session.state`. Each call returned one command to the browser, which executed it, POSTed the result to `/turn`, then called `/next` again. State advanced inside `recordTurn` (e.g., after the last Round 1 agent wrote, `turn.ts` set state to `ROUND_2`).

### Workflow step mapping (shipped)

| Previous state | Mastra step | Step type |
|----------------|-------------|-----------|
| `PENDING` → `ROUND_1` | Implicit workflow start | — |
| `ROUND_1` (4 agents) | `round1_strategist`, `round1_critic`, `round1_devils_advocate`, `round1_synthesizer` | Sequential |
| `ROUND_2` (4 agents) | `round2_*` | Sequential |
| `ROUND_3` (4 agents) | `round3_*` | Sequential |
| `CONCLUDING` | `synthesize` | Conclusion |
| `AUDITING` (first) | `audit` | Verdict |
| `REVISING` | `revise` | Conclusion |
| `AUDITING` (second) | `reaudit` | Verdict |
| `TERMINAL` | `terminal` | DB write |

**Crucible:** 12 agent steps + conclusion chain. **War Room** (deferred to later step): 18 agent steps via `.foreach()`-based refactor.

---

## Section 2 — Round Loop Structure (Decision: Flat)

**Chosen:** Flat sequential steps. Each agent-round pair is a discrete named step (`round1_strategist`, etc.).

**Why:** Mastra traces show every individual agent turn with latency and tokens. Step failures are precisely located. No Mastra-level looping construct needed. Simple DAG.

**Trade-off accepted:** workflow definition is verbose (12 steps for Crucible). Team changes require a new workflow definition rather than a parameter change. Acceptable for V1 Crucible scope.

**War Room (future):** will use three `.foreach(agentStep, { concurrency: 1 })` calls — one per round — where the input array is the session's agent list.

---

## Section 3 — Conclusion Phase Chain

### Flow (shipped)

```
synthesize
  ├─ parse fails → terminal(ERROR)
  └─ parse ok → audit
                  ├─ verdict PASS → terminal(CLEAN)
                  └─ verdict OBJECTION → revise
                                           ├─ parse fails → terminal(ERROR)
                                           └─ parse ok → reaudit → terminal(REVISED)
```

### Mastra API used: `.branch()`, not `.when()`

```typescript
.branch([
  [async ({ inputData }) => !inputData.parseOk, errorTerminalStep],
  [async ({ inputData }) => inputData.parseOk,  auditStep],
])
```

### Key invariant preserved

`reaudit` always terminates `REVISED`, even if the Blind Critic still objects. Intentional — Vāda always delivers a team answer. The Critic's re-verdict is stored as `criticReVerdict` metadata, not as a gate.

---

## Section 4 — State Persistence

**Chosen: Option B — DB-first hybrid.**

Each agent step writes its output to the DB transcript. Workflow context carries only lightweight IDs and the current transcript cursor. Steps read the transcript from the DB.

**Rationale:**
- Preserves resume semantics (DB remains source of truth)
- Compatible with existing `/next` pull-loop as fallback
- No transcript payload bloat
- Mid-workflow crashes are recoverable — new workflow run reads current DB state and continues

---

## Section 5 — Error Handling

### Retries

Mastra step-level `retryConfig: { attempts: 3, delay: 1000 }`. Retry eligibility (recoverable vs non-recoverable) is expressed by rethrowing non-recoverable errors inside the `execute` function.

### Conclusion parse failures

Not retry candidates. Parse failure routes immediately to `ERROR` terminal state via containment logic in `executeConclusionTurn` (see Section 7).

### Partial completion recovery

If workflow instance fails mid-run, DB-first state persistence means a new workflow instance picks up from current DB state. Equivalent to original browser re-poll behavior.

### Mastra framework errors

If Mastra workflow engine itself crashes, session remains in last valid DB state. User retries via `/next` pull-loop fallback (still in place).

---

## Section 6 — Mastra API Decisions (Resolved)

### Conditional branching

**Answer:** `.branch()`, not `.when()`. Array of `[conditionFn, step]` pairs. First truthy match wins.

### Workflow resumption

**Answer:** Mastra supports resumption only from explicit `suspend()` checkpoints. Agent steps do not call `suspend()`. Mid-run crash leaves no Mastra snapshot.

**Mitigation:** DB-first persistence (Section 4) covers this fully.

### Dynamic workflow definition

**Answer:** Mastra workflows are statically defined. Use `.foreach(step, { concurrency: 1 })` for data-driven iteration (War Room in future step).

### Workflow input schema

**Shipped:**
```typescript
inputSchema: z.object({
  sessionId: z.string(),
  question:  z.string(),
  agents:    z.array(z.string()),
  provider:  z.string(),
  modelId:   z.string(),
  apiKey:    z.string(), // added during /workflow/run implementation
})
```

### Sub-workflows

**Used:** conclusion chain is a sub-workflow. Isolates synthesize → audit → revise → reaudit logic. Shares DB session context via `sessionId` passed through workflow input.

---

## Section 7 — Interaction with Containment Logic

**Chosen: Option B — Containment as `executeConclusionTurn` in `@atta/orchestration`.**

Extracted parsing logic from `turn.ts` into `@atta/orchestration`. Exposed `executeConclusionTurn` alongside `executeAgentTurn`. Mastra synthesize step calls this function and branches on `result.ok`.

### Function signature (shipped)

```typescript
export async function executeConclusionTurn(
  systemPrompt: string,
  userPrompt: string,
  ctx: DeliberationContext
): Promise<ConclusionResult>

type ConclusionResult =
  | { ok: true; conclusion: Conclusion; coerced: boolean }
  | { ok: false; error: 'SYNTHESIS_FAILED_UNPARSEABLE' | 'REVISION_FAILED_UNPARSEABLE' }
```

### Transcript persistence

**Direct DB write, not HTTP loopback.** Mastra workflow steps call `persistTurn()` directly (extracted from `turn.ts:recordTurn` into `apps/vada-ai/web/src/engine/turn-logic.ts`).

The `/api/deliberation/[id]/turn` route handler also calls `persistTurn()` (preserving browser pull-loop fallback). `turn.ts` is a thin route adapter; business logic lives in `turn-logic.ts`.

**Why not HTTP loopback:** would add round-trip per agent turn, require auth (Clerk token in workflow step), fail silently on dev server restart. Direct DB write is simpler, faster, more reliable.

### Browser pull-loop compatibility

`/next` and `/turn` routes preserved for now. Step 9 removes them after Step 6 browser migration is verified.

### Regression test gate (passed)

Canonical regression case (session `4697f15c` — shopping cart question) produces CLEAN terminal state on Mastra workflow. Gate passed before Step 5 shipped.

---

## Post-Implementation Additions (not in original design)

### Token accounting fix (April 21, 2026 — commit 2ef5638)

Workflow path was bypassing `bumpDeliberationMetrics`, causing `deliberationTokensInput/Output = 0` in `benchmark_metrics`. Fix: added token/elapsed fields to `TurnPayload`; moved `bumpDeliberationMetrics` call into `persistTurn` as single source of truth; workflow steps pass token data through.

### Langfuse observability (April 21, 2026 — commit 70b4bcd)

Integrated `@mastra/langfuse` 1.1.3 at Mastra instance level. Langfuse exporter reads env vars. SensitiveDataFilter configured to redact apiKey, cookie, token, and other credential fields. Verified `apiKey: [REDACTED]` in span inputs.

### Synthesizer over-compression finding (April 21, 2026)

V1 bench revealed the Synthesizer produces cleaner but less useful conclusions than single-shot baseline on decidable questions. Not an implementation bug — an architectural design limitation. V2 Experiment 1.A targets this.

---

## Relationship to V2

This document describes V1's shipped architecture. V2 experiments (documented in `vada-v2-specification.md`) may change:
- Conclusion schema (Experiment 1.B)
- Synthesizer prompts (Experiment 1.A)
- Round structure (Experiment 1.C)
- Tool access within agents (Challenge 2)
- Model diversity (Phase 3)

The workflow infrastructure documented here is the platform. V2 experiments are variants built on it.

---

## Related Documents

- `vada-v1-tech-spec.md` — current V1 spec (authoritative)
- `vada-v2-specification.md` — V2 experiment roadmap
- `vada-v1-bench-results.md` — April 21 bench data
- `vada-science-of-deliberation.md` — theoretical foundation
- `vada-product-thesis.md` — strategic framing
- `followups.md` — deferred work
