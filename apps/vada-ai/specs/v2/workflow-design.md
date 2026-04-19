# Vāda Workflow Design — State Machine to Mastra Workflow

Design document for Step 5: migrating `getNextCommand` from a pull-loop state machine to a Mastra Workflow.

Status: Design only. No implementation.

---

## Section 1 — State Machine → Workflow Mapping

### Current state machine

`getNextCommand(session)` is a switch on `session.state`. Each call returns one command to the browser, which executes it, POSTs the result to `/turn`, then calls `/next` again. State advances inside `recordTurn` (e.g. after the last Round 1 agent writes, `turn.ts` sets state to `ROUND_2`).

### Workflow step mapping

| Current state | Triggered by | Maps to Mastra step(s) | Step type |
|---|---|---|---|
| `PENDING` → `ROUND_1` | Session creation | Implicit workflow start | — |
| `ROUND_1` (4 agents) | Prior round completion | `round1_strategist`, `round1_critic`, `round1_devils_advocate`, `round1_synthesizer` | Sequential agent steps |
| `ROUND_2` (4 agents) | Round 1 completion | `round2_strategist`, `round2_critic`, `round2_devils_advocate`, `round2_synthesizer` | Sequential agent steps |
| `ROUND_3` (4 agents) | Round 2 completion | `round3_strategist`, `round3_critic`, `round3_devils_advocate`, `round3_synthesizer` | Sequential agent steps |
| `CONCLUDING` | Round 3 completion | `synthesize` | Conclusion step |
| `AUDITING` (first) | `synthesize` completion | `audit` | Verdict step |
| `REVISING` | `audit` objection | `revise` | Conclusion step |
| `AUDITING` (second) | `revise` completion | `reaudit` | Verdict step |
| `TERMINAL` | Any verdict PASS or post-reaudit | `terminal` | DB write step |

**Agent count:** 12 agent steps for Crucible (4 agents × 3 rounds), 18 for War Room (6 agents × 3 rounds). Workflow definition is parameterized by team composition at session start.

---

## Section 2 — Round Loop Structure

### The options

**Option A — Flat sequential steps (recommended)**

Name every agent-round pair as a discrete step: `round1_strategist`, `round1_critic`, etc. Dependencies chain within a round and across rounds:

```
round1_strategist → round1_critic → round1_devils_advocate → round1_synthesizer
                                                                       ↓
round2_strategist → round2_critic → round2_devils_advocate → round2_synthesizer
                                                                       ↓
round3_strategist → round3_critic → round3_devils_advocate → round3_synthesizer
                                                                       ↓
                                                                   synthesize
```

Each step receives the accumulated transcript as context (either from workflow context or by reading from DB). Each step writes its output to the DB transcript and passes it forward.

Pros: Mastra traces show every individual agent turn with latency and tokens. Step failures are precisely located. No Mastra-level looping construct needed. Simple DAG.

Cons: Workflow definition is verbose (12–18 steps). Team changes require a new workflow definition rather than a parameter change.

**Option B — Dynamic step generation**

Generate steps at workflow-creation time by iterating over `session.agents × [1, 2, 3]`. Avoids hardcoding but makes the workflow definition harder to read in traces.

**Decision:** Option A for Step 5. Flat 12-step DAG for Crucible, flat 18-step for War Room. Verbosity is acceptable at this scale and traces are cleaner. Dynamic generation is a Step 7+ concern if teams become configurable at runtime.

### Within-round sequencing

Round 2 and 3 agents each need the transcript up to the previous round. The step receives this as input from the prior step's output context, not by re-reading the DB. This keeps the workflow self-contained and makes traces reproducible.

---

## Section 3 — Conclusion Phase Chain

### The flow

```
synthesize
  ├─ parse fails → terminal(ERROR)
  └─ parse ok → audit
                  ├─ verdict PASS → terminal(CLEAN)
                  └─ verdict OBJECTION → revise
                                           ├─ parse fails → terminal(ERROR)
                                           └─ parse ok → reaudit → terminal(REVISED)
```

### Mastra representation

Mastra workflows support conditional routing via `.when()` on step output. The conclusion chain maps naturally:

```
synthesize.when(output.parseOk === false) → errorStep
synthesize.when(output.parseOk === true) → audit

audit.when(output.verdict === 'PASS') → terminal_clean
audit.when(output.verdict !== 'PASS') → revise

revise.when(output.parseOk === false) → errorStep
revise.when(output.parseOk === true) → reaudit

reaudit → terminal_revised
```

This requires `synthesize` and `revise` steps to emit a `parseOk` boolean in their output. The conditional branching is explicit and visible in Mastra's trace UI.

### Key invariant from current code

`reaudit` always terminates `REVISED`, even if the Blind Critic still objects. This is intentional — Vāda always delivers a team answer. The Critic's re-verdict is stored as `criticReVerdict` metadata, not as a gate. This invariant must be preserved in the workflow's `reaudit → terminal` edge.

---

## Section 4 — State Persistence

### Current model

Every `getNextCommand` call reads the full session + transcript from the DB. State (session state string, transcript entries, conclusion JSON) lives entirely in the DB. The orchestrator is stateless — given the same DB row, it always returns the same next command.

This allows:
- Resume from any point: user reloads mid-deliberation, browser re-polls `/next`, orchestrator recomputes where it is
- Interruption safety: if a turn fails, the next `/next` call sees the same state and reissues the same command

### Workflow model options

**Option A — Workflow context carries transcript (pure workflow state)**

Each step receives the transcript as input from the prior step's output. The DB is written only at conclusion and terminal steps. Intermediate transcript entries live in Mastra's workflow context.

Pros: Traces contain all data — replay is possible without DB reads. Cleaner step contracts.

Cons: Payload grows with every turn (Crucible: ~12 × average turn text). Resume requires Mastra workflow-level checkpointing (does Mastra support this? — see Section 6). If the workflow instance is lost, resumability is gone.

**Option B — Hybrid (recommended for Step 5)**

Each agent step writes its output to the DB transcript (same as today). The workflow context carries only lightweight IDs and the current transcript cursor (which round, which agent). Steps read the transcript from the DB via a thin query.

Pros: Resume semantics preserved — DB remains the source of truth. Compatible with existing `/next` polling as a fallback. No transcript payload bloat.

Cons: DB reads per step (same as today — not a regression). Traces show step durations but not full transcript context.

**Decision:** Option B for Step 5. State persistence model stays DB-authoritative. This preserves the resume guarantee and makes the Mastra migration incremental — the browser can still fall back to the `/next` pull-loop if the workflow path fails.

---

## Section 5 — Error Handling

### Current model

- Browser: `retryWithBackoff` (3 attempts) with `classifyProviderError` determining retry eligibility
- Server: `turn.ts` handles `ERROR` terminal state when conclusion parsing fails (never surfaces raw output)

### Workflow model

**Agent step retries:** Mastra step-level `retryConfig` (`maxRetries: 3, delay: 1000`) replaces `retryWithBackoff`. Retry eligibility (recoverable vs. non-recoverable provider errors) should be expressed as a custom `onError` handler that rethrows non-recoverable errors immediately rather than retrying.

**Conclusion parse failures:** These are not retry candidates — if the model's output is unparseable, re-running the same prompt with the same context will likely produce the same malformed output. Parse failure should immediately route to the `ERROR` terminal step (see Section 7).

**Partial completion recovery:** If a workflow instance fails mid-run (infrastructure failure, not model failure), Option B's DB-first state persistence means a new workflow instance can pick up where the old one left off by reading the current DB state. This is equivalent to today's browser re-poll behavior.

---

## Section 6 — Open Questions

These must be answered before Step 5 implementation begins. The answers should come from reading Mastra's current source/docs rather than assuming from training data.

1. **Conditional branching API:** What is Mastra's exact `.when()` API for workflow steps? Does it branch on step output fields or on thrown errors? Is there a `switch`-equivalent for more than two branches?

2. **Workflow instance resumption:** If a Mastra workflow instance is interrupted (process crash, deployment), can it resume from the last completed step? If yes, what persistence backend does it require? If no, does Option B's DB-first approach fully mitigate this, or does the workflow need to be re-created from scratch?

3. **Dynamic workflow definition:** Mastra workflows are defined statically in code. For War Room (18 steps) vs. Crucible (12 steps), is the workflow definition per-team, or can step count be parameterized at workflow-creation time without defining a new class?

4. **Workflow input schema:** What is the correct type for workflow `inputData`? The workflow needs: `sessionId`, `question`, `agents: string[]`, `provider`, `modelId`. Does Mastra validate this against a schema at invocation time?

5. **Sub-workflow support:** Could the conclusion chain (synthesize → audit → [revise → reaudit]?) be cleanly expressed as a sub-workflow? Is there a runtime cost to sub-workflow composition?

---

## Section 7 — Interaction with Existing Containment Logic

### Why this section is load-bearing

The containment logic in `turn.ts` was the primary work of the 2026-04-19 pipeline-debugging session. It addresses two failure classes that produced user-visible regressions:

- **Truncated JSON:** Small models emit `{ "recommendation": "text...` — no closing brace. `closeTruncatedJson` closes and re-parses.
- **Salvage path removal:** The old code fell back to wrapping raw model output as `recommendation` when parsing failed. This surfaced truncated JSON, double-encoded escape sequences, and code blocks as "the team's answer." The containment rule now terminates as `ERROR` instead.

The Workflow migration cannot regress either of these behaviors.

### Where containment currently lives

All parsing and containment logic lives in `turn.ts:recordTurn`, specifically the `synthesize` and `revise` phase handlers:

1. `parseConclusionJson(raw)` — strict Zod validation against `ConclusionSchema`
2. `parseConclusionLenient(raw, agents)` — multi-attempt coercion: strip markdown fences, `extractJson`, `repairJson`, `closeTruncatedJson`, handle stringified-JSON wrapper, handle provider-specific encoding defects (Gemini double-encoding)
3. If both fail → write `{ error: 'SYNTHESIS_FAILED_UNPARSEABLE' }` + `ERROR` terminal state. No salvage.

Audit verdict parsing uses `classifyVerdict(raw)` — simpler (looks for `PASS` token in the model's response text).

### Three options for containment placement in the Workflow

**Option A — Containment inside workflow steps**

The `synthesize` step runs the LLM call, then calls `parseConclusionJson` / `parseConclusionLenient` inline. If parsing fails, the step emits `{ parseOk: false }` and the conditional branch routes to an `errorTerminal` step that writes the `ERROR` state to DB.

```
synthesize step:
  1. call executeAgentTurn (Mastra)
  2. parseConclusionJson(output.text)
  3. if strict fails: parseConclusionLenient(output.text, agents)
  4. if both fail: return { parseOk: false, error: 'SYNTHESIS_FAILED_UNPARSEABLE' }
  5. if ok: return { parseOk: true, conclusion: parsedConclusion }
```

Pros: All conclusion logic is in one place. Traces show containment decisions per step.

Cons: Steps become complex — LLM call + multi-level parsing + DB write logic. The parsing code duplicates across `synthesize` and `revise` steps.

**Option B — Containment as `executeConclusionTurn` in `@atta/orchestration` (recommended)**

Extract a new function alongside `executeAgentTurn`:

```typescript
// packages/orchestration/src/index.ts (new export)
export async function executeConclusionTurn(
  systemPrompt: string,
  userPrompt: string,
  ctx: DeliberationContext
): Promise<ConclusionResult>

// ConclusionResult:
type ConclusionResult =
  | { ok: true; conclusion: Conclusion; coerced: boolean }
  | { ok: false; error: 'SYNTHESIS_FAILED_UNPARSEABLE' | 'REVISION_FAILED_UNPARSEABLE' }
```

The Mastra `synthesize` step calls `executeConclusionTurn` and branches on `result.ok`. All parsing and fallback logic lives inside `executeConclusionTurn`, hidden behind the same framework-agnostic boundary as `executeAgentTurn`.

Pros: Clean step contracts. Parsing logic is centralized and testable outside Mastra. Same boundary discipline as the agent steps — no implementation details cross the orchestration package boundary.

Cons: Requires extracting parsing functions (`parseConclusionJson`, `parseConclusionLenient`, `closeTruncatedJson`, etc.) from `turn.ts` into `@atta/orchestration`. These functions currently import `ConclusionSchema` from `@/schemas` — that import needs to move or be injected.

**Option C — Mastra structured output**

If Mastra workflow steps support a Zod `output` schema, the `synthesize` step could declare `ConclusionSchema` as its expected output and let Mastra auto-retry or auto-fail on schema violation.

**Investigation finding:** Mastra's `Agent.generate()` supports `output` Zod schemas for structured generation (the agent is instructed to produce JSON matching the schema). However, this is an instruction-level hint — it does not guarantee JSON compliance from the model. The model may still emit malformed JSON wrapped in markdown, or truncate mid-object. The multi-level fallback in `parseConclusionLenient` handles these real-world failure modes that a simple Zod schema rejection cannot recover from. Mastra structured output can be used as a first-pass improvement but cannot replace the lenient parser.

**Verdict:** Option C alone is insufficient. It could be used in combination with Option B (try Mastra structured output first, fall back to lenient parsing if the output schema validation fails), but this adds complexity without a clear gain for Step 5. Revisit in Step 7+ when evaluating whether structured output meaningfully reduces parse failure rates.

### Recommended approach for Step 5

Use **Option B**. Extract parsing functions from `turn.ts` into `@atta/orchestration/conclusion-parser.ts` (internal, not part of the public API). Expose `executeConclusionTurn` as a public export alongside `executeAgentTurn`. The Mastra workflow steps call this function. The `turn.ts` `recordTurn` continues to handle all DB writes (transcript entries, conclusion rows, state transitions) — it is not replaced, only the LLM invocation and parsing are extracted.

This means Step 5 has two sub-deliverables:
1. Extract `parseConclusionJson`, `parseConclusionLenient`, and helpers into `@atta/orchestration`
2. Implement the Mastra Workflow using `executeAgentTurn` + `executeConclusionTurn`

The `turn.ts` DB logic remains as the single authority for what gets persisted and how state advances. The workflow calls `/turn` (or its internal equivalent) after each step — same as the browser does today.

### Regression test gate

Before Step 5 ships, the canonical regression case (session `4697f15c` — shopping cart question) must produce `CLEAN` or `REVISED` terminal state, not `ERROR` or `UNCONVERGED`. Run the 4a verification script against the new workflow path with the shopping cart question as a smoke test.
