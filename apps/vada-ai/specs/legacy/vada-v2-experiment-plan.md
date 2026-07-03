# Vāda V2 — Experiment Plan (Execution)

Status: retired

**Status:** Ready for execution · April 21, 2026
**Companion to:** `vada-v2-specification.md`
**Test model:** Claude Haiku 4.5 (see spec §1.6 for rationale)
**Purpose:** concrete step-by-step execution plan. What gets built, in what order, by whom, with what success criteria.

---

## Execution principles

1. **One step at a time.** Do not parallelize Steps 1-4. Each step's result informs the next step's execution.
2. **Data before debate.** When Steps complete, analyze results before discussing interpretation. Don't pre-commit narratives.
3. **Kill gates.** If a step produces a kill signal (see spec §6), stop. Don't rationalize forward.
4. **Version everything.** Each step produces committed artifacts (data, prompts, code). Reproducibility matters more than speed.
5. **Sonnet implements, doesn't design.** Task specs are authoritative. Sonnet flags ambiguity rather than interpreting it.
6. **Haiku is the test model, not the implementer.** Sonnet writes code and infrastructure. Haiku runs the actual deliberations and baselines inside that infrastructure. Don't confuse the two roles.

---

## Roles during execution

- **Principal (Daniel):** reads results, makes kill/continue decisions, resolves ambiguity when Sonnet flags it.
- **Integrator/Critic (Claude Opus 4.7 in chat):** drafts tasks for Sonnet, reviews deliverables, applies pressure on implementation quality, holds thread across multi-day execution.
- **Implementer (Sonnet via Claude Code):** builds infrastructure, runs experiments (as orchestrator), produces data artifacts. Executes tasks as written.
- **Test subject (Claude Haiku 4.5):** runs inside Vāda's agents, baseline calls, and judge. The model whose output is being measured.
- **External advisors (Gemini, Grok, ChatGPT):** consulted when results are ambiguous or unexpected. Not in execution loop.

---

## Task sequence

### Task 1 — Lock dataset (Step 0) ✅ COMPLETE

**Status:** Committed as `4a9b649` on April 21, 2026

**Delivered:**
- `scripts/bench/corpus.v1.ts` — verbatim snapshot of V1 corpus
- `scripts/bench/corpus.v2.ts` — 15 questions + `v1_baseline_won` + `expected_vada_advantage`
- `scripts/bench/corpus.v2.reference.ts` — SQLite natural experiment reference case
- `scripts/bench/corpus.ts` — re-exports from v2 (existing importers unchanged)

**Validated:**
- Typecheck clean across all 22 packages
- Smoke test confirmed: length 15, T1 metadata correct
- T2 resolved as `v1_baseline_won: null` (skipped in V1 bench, smoke-test result not comparable)
- 7 confirmed V1 losses: T1, T3, T4, T5, B3, A1, A2
- 7 V1 wins: B2, E2, E3, P1, P2, P3, A3

**Ambiguities closed:**
- T2 null status, explicit in corpus file with inline comment
- SQLite reference session IDs left as TODO (transcripts/DB not accessible to Sonnet during this task)

---

### Task 2 — Build A0 vs A1 baseline ceiling test (Step 1)

**Scope:** establish what Haiku single-shot CAN do with strong prompting.

**Critical model note:** all calls in Task 2 use **Claude Haiku 4.5**. V1 bench used Sonnet; V2 is on Haiku. The Anthropic SDK model string is `claude-haiku-4-5-20251001`.

**Build:**

1. **Model configuration:**
   - Add `V2_MODEL` constant in a shared config file: `claude-haiku-4-5-20251001`
   - Do NOT hardcode model strings in scripts. Reference `V2_MODEL` everywhere in V2 code paths.
   - V1 model config stays separate for backward compatibility with V1 bench reproducibility.

2. **Script: `apps/vada-ai/web/scripts/bench/v2/baseline-ceiling.ts`**
   - Takes corpus as input
   - For each question, runs two baseline variants on Haiku:
     - **A0:** current V1 baseline prompt ("Answer the user's question directly. No framing, no caveats.")
     - **A1:** Grok's V-Baseline-Rich prompt (full text in `vada-v2-specification.md` §9.1)
   - N=3 runs per variant per question
   - Writes results to DB with new fields:
     - `baseline_variant: 'A0' | 'A1'`
     - `test_model: 'claude-haiku-4-5-20251001'`

3. **Judge extension: check existing judge route compatibility**
   - Current judge: `apps/vada-ai/web/src/app/api/benchmark/judge/route.ts:26-38`
   - Audit: does the existing `JUDGE_SYSTEM_PROMPT` accept arbitrary comparison pairs, or does it hardcode "Response A = Vāda, Response B = baseline"?
   - If flexible: use as-is with Haiku model parameter (switch judge model to Haiku for V2 consistency)
   - If hardcoded: create a new route `judge/v2-route.ts` that handles A0-vs-A1 direct comparison with neutral framing
   - Report findings to Principal before proceeding if audit shows significant rework needed

4. **Analysis script: `apps/vada-ai/web/scripts/bench/v2/analyze-step-1.ts`**
   - Aggregates results
   - Outputs: win rate A0 vs A1, judge reasoning summary, variance across N=3
   - Also flags any persona-drift or schema-compliance issues observed on Haiku (this is a V2-specific check — Haiku may produce different failure modes than Sonnet did)

**Deliverable:** 3-4 files committed, step 1 run executed on Haiku, analysis output generated.

**Success criteria:**
- All 15 questions run cleanly for both variants on Haiku
- N=3 per configuration captured with variance
- Analysis clearly states: "A1 beats A0 in X/15 cases, ties in Y, loses in Z. Judge consistently cites [pattern] in A1 wins."
- No Haiku-specific compliance failures (malformed outputs, refusals, etc.); if any occur, flag explicitly

**Estimated time:** 4-6 hours (building) + 45 min (running, Haiku speed) + 1 hour (analysis)

**Estimated cost:** ~$1 (Haiku pricing, 15 questions × 2 variants × N=3 = 90 calls)

**Decision point after Task 2:**
- If A1 >> A0: proceed to Task 3. A1 is our real baseline for Step 4.
- If A1 ≈ A0: flag. Rich prompting doesn't improve over naive on Haiku. Unusual — could indicate Haiku has a ceiling for prompt engineering below Sonnet's. Investigate before proceeding.
- If A1 < A0: very unusual. Likely prompt bug or schema validation failure. Debug before proceeding.

**Commit message:**
```
V2 Step 1: A0 vs A1 baseline ceiling test on Haiku 4.5

Tests whether strong prompting alone produces output quality
improvement over naive baseline on the V2 test model (Haiku).
A1 uses the rich prompt designed to emulate full orchestration
in a single call (per Grok's Round 3 delegation).

Establishes A1 as the real baseline for Step 4 existential test.

Test model: claude-haiku-4-5-20251001
Results: [A1 wins X/15, ties Y, loses Z]
```

---

### Task 3 — Build A0 vs B0 orchestration-alone test (Step 2)

**Scope:** test orchestration contribution independent of schema, on Haiku.

**Critical note:** B0 means "current V1 Vāda workflow, but with Haiku swapped in for Sonnet as the agent model." This is the first time the full Vāda orchestration runs on Haiku. **Watch for persona collapse.**

**Build:**

1. **Model swap in Vāda workflow:**
   - Current code likely hardcodes Sonnet. Parameterize the agent model.
   - Add workflow parameter: `agent_model: string` defaulting to `V2_MODEL` (Haiku)
   - V1 reproducibility preserved by passing Sonnet model string explicitly when running V1 code paths

2. **Script: `apps/vada-ai/web/scripts/bench/v2/orchestration-alone.ts`**
   - Takes V1 losses subset (7 questions: T1, T3, T4, T5, B3, A1, A2) + SQLite reference
   - For each question:
     - **A0:** naive single-shot Haiku (reuse from Task 2)
     - **B0:** V1 Vāda with agent_model = Haiku (flat schema, current prompts, current 3 rounds, in-round Synthesizer)
   - N=3 runs per variant per question
   - Writes to DB with test_model field

3. **Persona collapse detection:**
   - Manual inspection of 2-3 B0 transcripts from Haiku runs
   - Check: do Strategist, Critic, Devil's Advocate, Synthesizer maintain distinct voices across rounds?
   - Flag if agents blur into same output style/content
   - This is V1 spec §14 Persona Collapse test extended to Haiku

4. **Analysis script: `apps/vada-ai/web/scripts/bench/v2/analyze-step-2.ts`**
   - Aggregates results
   - Computes information gain metric: count unique conditional branches, triggers, caveats in each output
   - Outputs: win rate, info gain delta, variance
   - Includes persona collapse inspection notes

**Deliverable:** files committed, step 2 run executed, analysis output.

**Success criteria:**
- B0 run uses V1 Vāda workflow unmodified except for agent_model parameter
- Information gain metric computed automatically, not manually
- Analysis clearly states whether orchestration alone helps on Haiku
- Persona integrity on Haiku explicitly confirmed or flagged

**Estimated time:** 3-4 hours (building) + 30 min (running, Haiku speed)

**Estimated cost:** ~$2

**Decision point after Task 3:**
- Informs Step 4 interpretation
- If B0 > A0 meaningfully: orchestration has independent contribution (good for thesis)
- If B0 ≈ A0: orchestration alone doesn't help — schema fix will be doing most of the work
- If B0 < A0: orchestration is net-negative before schema — schema fix is damage control, not unlock
- **If persona collapse detected on Haiku:** STOP. Do not proceed to Step 3. Haiku may be below the capability floor for V1's cognitive quarantine mechanism. Options: (a) adjust prompts for Haiku, (b) re-test V2 on Sonnet (higher cost), or (c) document as empirical finding for Step 11 (capability ladder).

**Commit message:**
```
V2 Step 2: A0 vs B0 orchestration-alone test on Haiku 4.5

Tests whether V1 Vāda workflow (flat schema, current prompts)
beats naive single-shot when run on Haiku. Isolates orchestration
contribution from schema improvements. Diagnostic for Step 4
interpretation.

Test model: claude-haiku-4-5-20251001
Persona collapse check: [passed / flagged / failed]
Results: [B0 vs A0 on 7 V1 losses + SQLite]
```

---

### Task 4 — Build Step 3 (schema fix + strengthened prompts)

**Scope:** implement the consensus first commit from all three reviewers. Pure build task, no runs yet.

**Model note:** The workflow must work identically on Sonnet and Haiku. Build model-agnostic, test on Haiku first.

**Build:**

1. **Rich Conclusion schema** (`packages/engine/src/schemas/conclusion.ts`):

```typescript
import { z } from 'zod'

export const ConclusionSchemaV2 = z.object({
  recommendation: z.string(),
  key_condition: z.string(),
  conditional_branches: z.array(z.object({
    condition: z.string(),
    path: z.string(),
    signals: z.string()
  })).default([]),
  important_caveats: z.array(z.string()).default([]),
  unresolved_tensions: z.array(z.object({
    point: z.string(),
    position_a: z.string(),
    position_b: z.string()
  })).default([]),
  review_trigger: z.string()
})

export type ConclusionV2 = z.infer<typeof ConclusionSchemaV2>
```

Keep V1 schema co-existing (`ConclusionSchemaV1`) for reproducibility of V1 runs on Sonnet.

2. **Updated Synthesizer conclusion prompt** (`packages/engine/src/prompts/conclusion-prompts.v2.ts`):
   - Replace "Keep it concise prose" with "Preserve structural richness from the transcript"
   - Add explicit instruction: "Retain conditional branches, stress-test warnings, decision heuristics, and reframings that agents raised in the deliberation. These belong in the conditional_branches and important_caveats fields, not compressed into the recommendation prose."
   - Preserve the Mode Change instruction
   - Preserve the commit-to-a-position requirement for `recommendation` field
   - **Tune for Haiku:** Haiku may need more explicit instructions than Sonnet. Write prompts literally and unambiguously rather than relying on inference.

3. **Updated Blind Critic prompt** (`packages/engine/src/prompts/blind-critic.v2.ts`):
   - Add Richness gate: compare conclusion output to transcript, flag if valuable content was stripped
   - Keep Constraint, Decisiveness, and Logic gates unchanged
   - Blind Critic now receives transcript for richness check (still blind for other gates — processes transcript only in richness evaluation, not decisiveness)

4. **Stronger role prompts** (`packages/engine/src/prompts/postures.v2.ts`):
   - Critic: add "If you destroy a premise, propose the structurally superior alternative" (sharpen existing instruction)
   - Devil's Advocate: add "Your alternative framing must be concrete and actionable, not abstract. Name the option the Principal hasn't considered."
   - Again: literal instructions, test on Haiku

5. **Workflow integration** (`packages/engine/src/workflows/crucible.ts`):
   - Add schema version flag (v1 / v2)
   - Add agent_model parameter (already added in Task 3, confirm it's wired)
   - V2 schema uses new V2 prompts
   - V1 schema uses current V1 prompts
   - Parameter controlled at workflow invocation

6. **Schema parse failure tracking:**
   - Instrument workflow to count schema parse failures per run
   - Log whether Haiku produces valid JSON matching `ConclusionSchemaV2`
   - This becomes a V2-specific metric for capability floor monitoring

**Deliverable:** all files committed, smoke test on one question to verify Haiku can produce valid V2 schema output.

**Success criteria:**
- Type-check passes
- V1 path still works on Sonnet (regression check — run one V1 bench question, confirm result matches V1 results)
- V2 path produces valid JSON matching new schema on Haiku smoke test (one question, one run)
- Schema parse failure rate = 0% on smoke test

**Estimated time:** 6-8 hours

**Commit message:**
```
V2 Step 3 build: Rich Conclusion schema + V2 prompts + Haiku support

Adds ConclusionSchemaV2 with conditional_branches, important_caveats,
unresolved_tensions, review_trigger. V2 conclusion prompt preserves
structure over compression. Blind Critic gains Richness audit gate.
Role prompts strengthened for Critic and Devil's Advocate.

V1 schema and prompts preserved for backward compatibility and
V2 experiment comparison.

Workflow parameterized: agent_model + schema_version. Defaults to
Haiku 4.5 + V2 schema for V2 experiments. V1 Sonnet path preserved.

Smoke test on Haiku: [valid V2 schema / parse rate 100%]
```

---

### Task 5 — Execute Step 3 (B0 vs B1 comparison)

**Scope:** run the schema fix test on Haiku.

**Build:**

1. **Script: `apps/vada-ai/web/scripts/bench/v2/schema-fix-test.ts`**
   - Takes full 15-question corpus
   - For each question:
     - **B0:** V1 Vāda workflow with Haiku + flat schema (reuse Task 3 infrastructure)
     - **B1:** V2 Vāda workflow with Haiku + rich schema + V2 prompts (Task 4 build)
   - N=3 runs per variant per question
   - Writes to DB
   - Tracks schema_parse_failure_rate per variant

2. **Analysis script: `apps/vada-ai/web/scripts/bench/v2/analyze-step-3.ts`**
   - Aggregates results
   - Specifically checks: did the 7 V1 losses flip on Haiku?
   - Computes structural richness metric: count of branches, caveats, tensions per output
   - Reports schema parse failure rate (Haiku-specific metric)

**Deliverable:** step 3 data.

**Success criteria:**
- All 15 questions run cleanly for both variants on Haiku
- Schema parse failure rate <5% (if higher, Haiku can't produce the rich schema reliably — major finding)
- Analysis clearly states: "B1 wins X/15, ties Y, loses Z compared to B0. Of the 7 V1 losses (measured on Sonnet), [N] flipped to VADA_WON on Haiku with rich schema."

**Estimated time:** 1-2 hours (building) + 45 min (running on Haiku) + 1 hour (analysis)

**Estimated cost:** ~$2

**Decision point after Task 5:**
- Expected: 3-4 flips. Acceptable: 2-5 flips.
- If >5 flips: schema fix exceeded expectations. Continue with confidence.
- If 0-1 flips: schema wasn't the bottleneck on Haiku. Pause. Revisit diagnosis before Step 4.
- If schema parse failure rate >5%: Haiku can't handle the rich schema reliably. Options: (a) simplify schema, (b) move to Sonnet for V2, (c) document as capability floor finding.
- If losses become wins AND wins become losses: something broke. Debug before Step 4.

**Commit message:**
```
V2 Step 3 run: Schema fix produces [N] VADA_WON flips on Haiku

B0 vs B1 comparison on 15-question corpus. V2 schema +
strengthened prompts tested against V1 flat schema baseline,
both running on Haiku 4.5.

Test model: claude-haiku-4-5-20251001
Schema parse failure rate: [X%]
Results: [summary].
```

---

### Task 6 — Execute Step 4 + Step 4.5 in parallel

**Scope:** the existential test + Grok's ablation, both on Haiku.

**Build:**

1. **Script: `apps/vada-ai/web/scripts/bench/v2/existential-test.ts`**
   - Takes V1 losses subset (7 questions) + SQLite reference
   - For each question, runs three comparisons on Haiku:
     - **A1 vs B1:** main existential test
     - **A1 vs B0-original:** Grok's ablation
     - **B0-original vs B1:** schema contribution isolation
   - N=5 runs per variant per question for A1 and B1 (higher N for statistical confidence on existential question)
   - N=3 for B0-original (reuse existing data if available from Task 3)

2. **Analysis script: `apps/vada-ai/web/scripts/bench/v2/analyze-step-4.ts`**
   - Three-way comparison output
   - Maps results to interpretation grid (spec §3 Step 4)
   - Computes cost ratio (tokens, latency)
   - Computes information gain: unique elements in B1 not in A1

**Deliverable:** Step 4 data.

**Success criteria:**
- All three comparisons run cleanly on Haiku
- Interpretation grid applied without ambiguity
- Clear statement of outcome: validated / needs redefinition / falsified

**Estimated time:** 2-3 hours (building) + 1 hour (running on Haiku) + 2 hours (analysis)

**Estimated cost:** ~$3 combined (Haiku pricing)

**Decision point after Task 6:**

Apply the locked interpretation grid:

| Result | Meaning | Action |
|---|---|---|
| B1 > A1 meaningfully | Orchestration adds real value | Continue to Task 7 (Step 5 Cold Reader) |
| B1 ≈ A1, B1 lower variance | Reliability system | Continue to Task 9 (Step 6 variance) to confirm |
| B1 ≈ A1, B1 higher info gain | Decision-support system | Continue to Task 9 to characterize |
| B1 ≈ A1, no other gains | Redundant | Stop. Pivot or kill. |
| B1 < A1 | Harmful | Stop. Reassess fundamentals. |

Additionally, from Step 4.5:

- If A1 > B0-original AND A1 ≈ B1: orchestration never added non-redundant value. Thesis falsified regardless of B1 performance. Schema was the only improvement, and schema is replicable in single-shot prompting.

**Commit message:**
```
V2 Step 4 + 4.5 run: Existential test + ablation on Haiku

Main result: [B1 > A1 meaningfully / B1 ≈ A1 / B1 < A1]
Ablation result: [orchestration contributes independently / schema is sole source of gains]

Interpretation: [thesis validated / needs redefinition / falsified]

Test model: claude-haiku-4-5-20251001
Next: [Task 7 / pivot planning / stop / re-test on Sonnet]
```

---

### Task 7 — Conditional: Step 5 Cold Reader (gated on Task 6)

**Only runs if Task 6 shows B1 > A1 meaningfully OR B1 has reliability advantage.**

**Scope:** test Gemini's Cold Reader architecture against in-round Synthesizer, both on Haiku.

**Build:**

1. **Cold Reader workflow node** (`packages/engine/src/workflows/cold-reader.ts`):
   - New workflow step replacing in-round-Synthesizer conclusion mode
   - Takes transcript, question
   - Stateless invocation with curated payload (per Gemini's spec)
   - Strips round-modifiers, UI tags, socialization context
   - Uses agent_model parameter (Haiku by default)

2. **Workflow parameter** (`packages/engine/src/workflows/crucible.ts`):
   - Flag: `synthesis_mode: 'in_round' | 'cold_reader'`
   - Controls whether Synthesizer participates in Rounds 1-3 (in_round) or only synthesizes from transcript (cold_reader)

3. **Script: `apps/vada-ai/web/scripts/bench/v2/cold-reader-test.ts`**
   - V1 losses + SQLite
   - B1 (in-round) vs B2 (cold reader), both on Haiku
   - N=5 per configuration

4. **Analysis script**

**Deliverable:** Task 7 data.

**Decision point:** if B2 > B1 meaningfully, adopt Cold Reader as default architecture.

**Estimated time:** 6-8 hours (build) + 1 hour (run on Haiku) + 1 hour (analysis)

**Estimated cost:** ~$2

---

### Task 8 — Conditional: Step 5.5 Curator/Selection (gated on Task 6)

**Only runs if Task 6 validates thesis.**

**Scope:** test selection (Curator) vs synthesis (Synthesizer) on task-type breakdown, both on Haiku.

**Build:**

1. **Curator implementation** (`packages/engine/src/workflows/curator.ts`):
   - Stateless agent receives transcript
   - Identifies standout agent response
   - Returns that agent's recommendation verbatim
   - Populates warnings/tensions from other agents
   - Uses agent_model parameter (Haiku)

2. **Workflow parameter extended:** `synthesis_mode: 'in_round' | 'cold_reader' | 'curator'`

3. **Script: `apps/vada-ai/web/scripts/bench/v2/curator-test.ts`**
   - Full 14-question corpus (not just losses) for task-type breakdown
   - B1 vs B3 (Curator), both on Haiku
   - N=5

4. **Analysis script:** breaks down results by category (Technical vs Ethical/Personal)

**Decision point:** map results to Gemini's prediction. If Curator dominates Technical and Synthesizer dominates Ethical/Personal, Vāda needs hybrid routing architecture.

**Estimated time:** 4-6 hours + 1 hour + 1 hour

**Estimated cost:** ~$2

---

### Task 9+ — Remaining conditional steps

Tasks 9-12 (Steps 6, 7, 8, 11) depend on Task 6-8 outcomes. Specs defined after decision points reached.

**Task 9 preview (Step 6 variance + worst-case + S6.1 sensitivity):**
- Run A1, B1, B2, B3 at N=5 across full corpus on Haiku
- Measure output variance, decision variance, worst-case score
- Determines if reliability advantage exists even when peak matches
- **Sub-experiment S6.1 (sensitivity testing, added from Miradi #48):** 5-question subset × 3 perturbed input variants × N=3 through B1 and A1 on Haiku. Measures output stability under trivial input perturbations.

**Task 10 preview (Step 7 judge robustness):**
- Re-score Task 6 outputs with cross-model judge (Gemini Pro or GPT-5 if available)
- This is the one step that intentionally uses a non-Haiku judge
- Measure disagreement with Haiku same-model judge
- Flags bias if present

**Task 11 preview (Step 8 epistemic independence):**
- Gated on thesis survival
- E1-E5 experiments with de-correlation mechanisms on Haiku
- E5 (model diversity) tests Haiku + Sonnet + Gemini mix

**Task 12 preview (Step 11 capability ladder):**
- Post-V2, conditional on thesis validation
- Run reduced bench (5 questions, N=3) across: Opus 4.7, Sonnet 4.6, Haiku 4.5, GPT-4o-mini, Llama 70B, Llama 8B, Qwen 14B
- Ollama for open-weight models — slow but doable, ~1 week of overnight runs
- Determines the capability floor for Vāda orchestration
- Answers the model-agnosticism claim empirically

---

## Aggregate metrics to track

Across all tasks, capture:

- Cost per step (actual vs projected on Haiku pricing)
- Time per step (actual vs projected on Haiku speed)
- Cumulative spend (target: under $35 through Task 12)
- Reproducibility checks: re-run one question N=3 at end of each step to verify stability
- **Haiku-specific: schema parse failure rate, persona collapse indicators, refusal rate**

---

## Failure modes to watch

### "Interpretation creep"

After results arrive, resist the urge to reinterpret the locked decision grid. If B1 ≈ A1, that's B1 ≈ A1 — not "well, A1 was given unfair advantage" or "we should have used a different judge."

### "Sunk cost pressure"

Each completed step creates investment. Step 4 kill signal must still be respected even after spending time on Steps 1-3. The protocol is designed so Steps 1-3 produce value independent of Step 4 outcome (better understanding of baseline, schema fix is real improvement, data for future experiments).

### "Analysis paralysis"

If a step's results are ambiguous, run one targeted additional experiment (e.g., higher N, different judge) rather than endless analysis. Data resolves ambiguity faster than argument.

### "Scope creep"

Conditional tasks (7-12) don't start until Task 6 completes. Don't build Cold Reader infrastructure speculatively before the existential gate is passed.

### "Model conflation"

Easy mistake: running V2 scripts against Sonnet because that's what V1 used. Every V2 script must explicitly set model = Haiku. If a script defaults silently to Sonnet, results are invalid. Add runtime assertion: log the model used at start of every run.

### "Haiku-vs-Sonnet confusion"

Sonnet writes the code. Haiku runs the deliberations. If you hear "Sonnet ran the bench," something's wrong — Sonnet is the implementer, Haiku is the test subject.

---

## When to consult external reviewers

- **After Task 6 analysis:** results go to Gemini/Grok/ChatGPT with specific interpretation question. Not for validation — for critique of the interpretation.
- **Before any redefinition of thesis:** if Task 6 shows B1 ≈ A1 and we're considering reliability-product redefinition, external reviewer check before committing to pivot.
- **If unexpected results:** any step producing results outside expected range (e.g., Task 5 shows 0 flips, or Task 1 shows A1 ≈ A0) gets reviewer consultation before proceeding.
- **If Haiku-specific failures:** if Haiku shows persona collapse, high schema parse failure, or refusals that Sonnet wouldn't produce, this is a capability-floor finding worth flagging to reviewers before continuing V2 on Haiku or pivoting to Sonnet.

---

## Commit granularity

One commit per task. Tasks produce:
- Infrastructure code (one commit)
- Execution run (separate commit with data artifacts)
- Analysis output (separate commit with results document)

Preserves ability to roll back specific changes without losing data.

---

## Ready to execute

Task 1 (Step 0) complete. Task 2 (Step 1, A0 vs A1 on Haiku) is next.

Task 2 task specification for Sonnet provided separately by the Integrator when you request it in chat.

Principal approves each task's results before advancing to next.

---

**End of experiment plan.**
