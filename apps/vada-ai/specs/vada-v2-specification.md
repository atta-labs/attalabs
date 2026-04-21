# Vāda V2 Specification

**Status:** Draft · April 21, 2026
**Supersedes:** All prior V2 draft documents
**Test model:** Claude Haiku 4.5 (see §1.6 for rationale)
**Based on:**
- V1 bench results (50/50 split on Sonnet, Synthesizer over-compression diagnosis)
- Three rounds of external review by Claude Opus 4.7, Gemini Pro, Grok, and ChatGPT
- Cross-reference with Dr. Maryam Miradi's *AI Agents: 50 Real-World Best Practices* (practitioner guide, 400+ agents deployed), which independently arrived at several of V1's architectural choices — cited throughout where relevant as external validation

---

## 1. Thesis (refined)

### 1.1 Original V1 thesis

> Vāda orchestrates multiple AI agents with distinct roles across multiple rounds, producing structured output that single-shot LLM invocations cannot achieve.

### 1.2 V1 bench outcome

50/50 split against single-shot baseline (7 VADA_WON / 7 BASELINE_WON / 0 ties on 14 questions). Mechanically sound (0 pipeline failures). No consistent advantage demonstrated.

V1 bench used **Claude Sonnet 4.6** across all roles (agents, baseline, judge).

Failure pattern identified: the Synthesizer over-compresses deliberation content (conditional branches, stress-test warnings, decision heuristics) into tight final verdicts. The tightness reads as decisiveness but strips the content that made deliberation worth running.

### 1.3 Refined thesis (post four-model consensus)

**N+1 orthogonally orchestrated prompts can outperform N prompts up to a task-dependent plateau, typically 3–5 prompts. Beyond the plateau, context dilution, sycophancy amplification, and probability smoothing degrade quality. Linear self-review chaining is mechanically flawed. Orthogonal friction — where step N+1 is structurally constrained to disagree with step N — is the mechanism that produces genuine gains.**

This thesis is consistent with V1's architectural intent (orthogonal roles, adversarial rounds, audit layer) but has not been empirically validated against single-shot with equivalent prompt engineering.

### 1.4 The existential question

Does Vāda's orchestrated deliberation produce output that a well-prompted single-shot call of the same model cannot achieve? V2 answers this before any further product development.

### 1.5 Survival conditions

V2 experiments will validate, redefine, or falsify the thesis. Three possible outcomes:

- **B1 > A1 meaningfully:** thesis validated. Orchestration has teeth. Proceed with product development.
- **B1 ≈ A1:** thesis needs redefinition. Vāda becomes a reliability/variance/worst-case-behavior product, not a peak-output product. Different measurement required.
- **B1 < A1:** thesis falsified. Orchestration is net-negative value. Pivot or stop.

Where A1 = well-prompted single-shot, B1 = post-schema-fix Vāda.

### 1.6 Model agnosticism — aspiration and bounded testing

**Architectural intent:** Vāda's orchestration is a capability layer above the model. Role prompts and structural friction should improve outputs of any sufficiently capable model, not just frontier models. The orchestration logic (cognitive quarantine, adversarial rounds, blind audit, structured conclusion) has no mathematical dependency on model size — it's prompt engineering + workflow orchestration, agnostic to whether Haiku, Sonnet, Opus, GPT-4o, Llama 70B, or Qwen 14B runs the individual roles.

**V2 test model: Claude Haiku 4.5.**

Reasons for shifting from Sonnet (V1) to Haiku (V2):

- **Speed:** Haiku produces deliberations in ~30-45 seconds vs Sonnet's ~120-140s. V2 runs many experiments; Haiku cuts total wall-clock time by ~3x.
- **Cost:** Haiku is ~5x cheaper per token than Sonnet. Full V2 protocol on Haiku: ~$12-15 total vs ~$57 on Sonnet.
- **Mid-capability representativeness:** Haiku sits in the middle of the capability spectrum — strong enough to maintain role integrity (unlike Qwen 14B, which fails Persona Collapse per V1 spec §14), weak enough that orchestration gains (if real) should be more visible than on Sonnet, where the base model already handles complex reasoning well.
- **Harder test:** if orchestration adds value on Haiku, it likely adds value on Sonnet and Opus. The opposite (working on Opus, failing on Haiku) is not guaranteed. Testing on the weaker model is the more falsifiable experiment.

**V1 bench was Sonnet. V2 bench is Haiku.** This is a deliberate shift. V2 results are not directly comparable to V1's 50/50 Sonnet split. V2 establishes its own baseline (Haiku naive single-shot vs Haiku + rich prompt vs Haiku + Vāda).

**Empirical constraint on full model-agnosticism:**

Some capability threshold exists below which Vāda's orchestration fails to execute — not because of the thesis being wrong, but because agents lose role integrity. V1 spec §14 documents: *"Persona Collapse — Mitigated by Cognitive Quarantine. Verified with Sonnet. Small models (Qwen 14B) fail this."* Below a capability floor, agents can't maintain distinct role personas across rounds; the orchestration structure stops executing faithfully.

Other capability-dependent failure modes:
- **Schema compliance:** producing valid nested JSON with `conditional_branches`, `important_caveats`, `unresolved_tensions`. Smaller models may return malformed JSON or miss fields.
- **Structural opposition maintenance:** holding adversarial posture across rounds rather than drifting into agreement.
- **Instruction-following depth:** obeying role-specific constraints (Critic must attack, Devil's Advocate must reframe).

**V2 does not test the capability floor directly.** V2 answers the existential question using Haiku as the reference model. Capability floor testing is Step 11 (post-V2, conditional on thesis validation):

- Reduced bench (5 questions, N=3) through progressively smaller models
- Models: Opus 4.7, Sonnet 4.6, Haiku 4.5, GPT-4o-mini, Llama 70B, Llama 8B, Qwen 14B
- For each: model-X-Vāda vs model-X-single-shot
- Determines minimum model where orchestration produces improvement

**Product implication of Step 11 results:**
- Floor = Haiku: Vāda works on commercial API models broadly (positive story)
- Floor = Sonnet: Vāda is frontier-tier product only
- Floor = Llama 70B: Vāda works on open-weight tier
- Floor = Llama 8B or below: truly universal orchestration layer (strongest product story)

**Why Ollama-with-local-models is not in V2 core:** slow (minutes per deliberation vs seconds), not because the thesis is frontier-only. Step 11 makes this explicit — Ollama testing is deferred for practical time reasons, not excluded philosophically.

The long-term aspiration: Vāda works for any sufficiently capable model. The empirical work: finding that "sufficiently" threshold.

---

## 2. Variables

Five independent variables. Experiments toggle one at a time.

### V1 — Output Representation (Schema)

- **Flat:** `recommendation: string` (V1 current)
- **Structured:** `conditional_branches`, `important_caveats`, `unresolved_tensions`, `review_trigger` (V2 target)

Tests: information preservation vs compression.

### V2 — Synthesis Architecture

- **In-Round Synthesizer:** current V1. Synthesizer participates in Rounds 1-3, then enters conclusion mode.
- **Cold Reader:** stateless invocation. Receives transcript + question only. No round-level context.
- **Curator/Selection:** stateless. Identifies standout agent response, returns it verbatim as recommendation. Other agents populate warnings/dissent.

Tests: synthesis pollution (attention bias), blending vs selection.

### V3 — Orchestration Presence

- **Single-shot:** one LLM call with prompt
- **Multi-agent:** Vāda's Crucible (4 agents × 3 rounds + synthesis + audit)

Tests: core orchestration thesis.

### V4 — Prompt Power (Baseline only)

- **Naive:** "Answer the user's question directly. No framing, no caveats."
- **Rich:** explicit instruction to produce conditional branches, caveats, triggers, heuristics (source: Round 3 delegated prompt, §9.1)

Tests: redundancy — does prompting alone produce what orchestration produces?

### V5 — Judge Type (measurement layer)

- **Same-model judge:** Claude Haiku 4.5 (V2 default — consistent with V2 test model)
- **Cross-model judge:** different provider (Gemini Pro or GPT-5 if accessible)

Tests: evaluation bias, not system performance.

**Note on V1 judge vs V2 judge:** V1 bench used a locked Sonnet judge. V2 uses a Haiku judge for internal consistency (same model across agents, baseline, and judge). V1 results (7/7 Sonnet) and V2 results (Haiku) are not directly cross-comparable. This is intentional — V2 establishes its own baseline on Haiku.

---

## 3. Protocol

**All steps use Claude Haiku 4.5 unless explicitly noted otherwise.** Step 7 adds cross-model judge. Step 11 explicitly tests multiple models (capability ladder).

### Step 0 — Lock dataset

**Purpose:** prevent mid-experiment dataset drift.

**Actions:**
- Freeze the 15-question V1 bench corpus (no additions, no removals)
- Add stratification metadata (category, difficulty, `v1_baseline_won`, `expected_vada_advantage`)
- Document SQLite natural experiment question as reference case

**Deliverable:** versioned corpus file committed to repo. No changes accepted during Steps 1-7.

**Status:** ✅ COMPLETE (commit `4a9b649`, April 21, 2026)

---

### Step 1 — Establish prompting ceiling (Haiku)

**Purpose:** define the real baseline. A0 is naive Haiku single-shot. A1 is what Haiku CAN do with strong prompting.

**Comparison:** A0 vs A1 on full 15-question corpus.

**Setup:**
- **Model: Claude Haiku 4.5** for both variants and judge
- A0: current V1 baseline prompt ("Answer the user's question directly. No framing, no caveats.")
- A1: rich prompt from Round 3 delegation (source in §9.1)
- N=3 per question per configuration

**Metric:** judge comparison (A0 vs A1 directly)

**Expected outcome:** A1 significantly > A0. Establishes A1 as the real baseline for Step 4.

**Decision rule:** if A1 ≈ A0 (rich prompting produces no improvement over naive), flag unusual result. Could indicate Haiku has a lower ceiling for prompt engineering than expected. Proceed with A1 as-is but note limitation.

**Estimated cost:** ~$1

---

### Step 2 — Does orchestration alone help? (Haiku)

**Purpose:** test orchestration contribution independent of schema improvements.

**Comparison:** A0 vs B0 on 7 V1-loss questions + SQLite reference.

**Setup:**
- **Model: Claude Haiku 4.5** for agents, baseline, judge
- A0: naive single-shot (Haiku)
- B0: current V1 Vāda with Haiku swapped in for Sonnet (flat schema, current prompts, current 3 rounds, in-round Synthesizer)
- N=3 per question

**Metric:** judge comparison + information gain count (unique conditional branches, triggers, caveats)

**Expected outcome:** if B0 ≈ A0 (Vāda flat doesn't meaningfully beat naive single-shot), orchestration alone provides little value. If B0 > A0, orchestration has independent contribution separable from schema.

**Decision rule:** this is diagnostic, not gating. Result informs Step 4 interpretation. If B0 < A0, orchestration was net-negative before schema fix — schema fix is damage control, not unlock.

**Haiku compatibility check:** V1 spec §14 confirms Sonnet maintains Persona Collapse prevention. Haiku should also maintain role integrity (it's more capable than Qwen 14B, which fails). If Haiku shows persona collapse in Step 2 (agents drifting into same voice), flag immediately — the architecture needs adjustment before proceeding, or V2 results will be invalid for Haiku and must be re-run on Sonnet.

**Estimated cost:** ~$2

---

### Step 3 — Schema fix + role prompt strengthening

**Purpose:** implement the consensus first commit from all three reviewers.

**Build:**

1. **Rich Conclusion schema:**

```typescript
const ConclusionSchemaV2 = z.object({
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
```

2. **Updated Synthesizer conclusion prompt:** preserve structure over compression. Explicit instruction to retain conditional branches, stress-test content, heuristics from transcript. Source: Gemini's Round 1 framing + ChatGPT's Round 3 rewrite suggestions.

3. **Updated Blind Critic prompt:** add richness audit gate. Check whether valuable upstream content was preserved vs stripped. Blind Critic now receives transcript for richness check (while still blind to deliberation for decisiveness check).

4. **Stronger role prompts (basic orthogonality):**
   - Critic: must propose alternative when destroying a premise (not just attack)
   - Devil's Advocate: must output concrete alternative framing (not just question the frame)

**Comparison:** B0 vs B1 on full 15-question corpus (Haiku).

**Metric:** judge comparison, information gain, VADA_WON delta

**Expected outcome:** +3-4 VADA_WON flips on V1 losses if schema was the bottleneck.

**Decision rule:** if B1 ≈ B0 (no improvement from schema fix), the problem isn't compression. Deeper issue with roles, rounds, or architecture. Revisit diagnosis.

**Haiku-specific note:** rich schema compliance may be harder for Haiku than Sonnet. If schema parse failures spike in Step 3, flag — may need lenient parsing with retry, or simpler schema variant. Track `schema_parse_failure_rate` as a metric.

**Estimated cost:** ~$2

---

### Step 4 — The existential test (Haiku)

**Purpose:** answer the redundancy question. Does orchestration add anything beyond rich prompting?

**Comparison:** A1 vs B1 on 7 V1-loss questions + SQLite reference.

**Setup:**
- **Model: Claude Haiku 4.5** throughout
- A1: rich-prompted single-shot (Step 1 output)
- B1: Vāda with rich schema + strengthened prompts (Step 3 output)
- N=5 per question per configuration
- Same judge (Haiku)

**Metrics:**
- Judge comparison (primary)
- Information gain (unique elements in B1 not in A1)
- Structural richness (count of branches, caveats, triggers)
- Cost ratio (tokens, latency)

**Interpretation grid (locked before running):**

| Result | Meaning | Action |
|---|---|---|
| B1 > A1 meaningfully | Orchestration adds real value | Continue to Step 5 |
| B1 ≈ A1, B1 lower variance | Reliability system | Redefine product around consistency |
| B1 ≈ A1, B1 higher info gain | Decision-support system | Redefine around breadth |
| B1 ≈ A1, no other gains | Redundant | Pivot or kill |
| B1 < A1 | Harmful | Stop, reassess fundamentals |

**Estimated cost:** ~$2

---

### Step 4.5 — Parallel ablation (Grok's addition)

**Purpose:** separate schema contribution from orchestration contribution.

**Comparison:** A1 vs B0-original on 7 V1-loss questions (Haiku throughout).

**Setup:**
- **Model: Claude Haiku 4.5**
- A1: rich-prompted single-shot
- B0-original: Vāda before schema fix (flat schema, original prompts, Haiku)
- N=3 per question
- Runs in parallel with Step 4, not after

**Metric:** judge comparison + structural richness

**Purpose:** if A1 beats B0-original but B1 beats A1, the improvement came from BOTH schema AND orchestration. If A1 beats both B0-original and B1, orchestration was never non-redundant value — schema was the only improvement, and schema is replicable in single-shot prompting.

**Decision rule:** this is Grok's cleanest test of the original thesis. If A1 > B0-original meaningfully, the multi-agent layer never added non-redundant value. Thesis in its current form is falsified regardless of B1 performance.

**Estimated cost:** ~$1

---

### Step 5 — Cold Reader isolation (conditional on Step 4 passing)

**Purpose:** test Gemini's attention-bias hypothesis. Does pulling the Synthesizer out of the rounds improve synthesis?

**Comparison:** B1 vs B2 on 7 V1-loss questions + SQLite (Haiku).

**Setup:**
- **Model: Claude Haiku 4.5**
- B1: rich schema, in-round Synthesizer (Step 3 output)
- B2: rich schema, Cold Reader Synthesizer (new implementation per Gemini's Round 3 spec)
- N=5 per question

**Cold Reader implementation:** stateless invocation. Receives curated payload (raw agent turns extracted from transcript, Principal's question) with no round-modifiers, UI tags, or socialization context. System prompt explicitly states "You were NOT part of this room. You are an external auditor."

**Metric:** judge comparison, decision quality, variance across N=5 runs

**Decision rule:** if B2 > B1 meaningfully, attention-bias pollution is real. Adopt Cold Reader as default architecture. If B2 ≈ B1, pollution is not a significant factor (or is already addressed by schema fix).

**Estimated cost:** ~$2

---

### Step 5.5 — Curator/Selection variant (Gemini's Step 10)

**Purpose:** test whether selection preserves standout candidates better than synthesis blending.

**Comparison:** B1 vs B3 on 7 V1-loss questions + Ethical/Personal subset (Haiku).

**Setup:**
- **Model: Claude Haiku 4.5**
- B1: rich schema, Synthesizer (blending approach)
- B3: rich schema, Curator (selection approach)
- N=5 per question
- Full 14-question corpus recommended (not just losses) to test Gemini's task-type hypothesis

**Curator implementation:** stateless agent. Receives transcript. Identifies agent with most actionable, risk-aware response. Returns that agent's recommendation verbatim. Uses other agents only for warnings/dissent population.

**Metric:** judge comparison, Technical vs Ethical/Personal breakdown

**Expected outcome (Gemini's prediction):** Curator dominates Technical (where standout candidates exist). Synthesizer dominates Ethical/Personal (where blending captures multi-perspective value).

**Decision rule:** if prediction holds, Vāda needs hybrid architecture — task-type routing between Synthesizer and Curator. If Curator dominates everywhere, Vāda's fundamental architecture should be selection, not synthesis. If Synthesizer dominates everywhere, synthesis is correct and Gemini's hypothesis is wrong.

**Estimated cost:** ~$2

---

### Step 6 — Variance and worst-case behavior

**Purpose:** test whether orchestration produces reliability advantage even if peak output doesn't differ.

**Runs:** A1, B1, B2, B3 across full 14-question corpus (Haiku).

**Setup:** N=5 per configuration per question. Same temperature settings.

**Metrics:**

- **Output variance:** semantic similarity across runs (embedding distance)
- **Decision variance:** % of runs where final decision changes
- **Worst-case score:** min quality across runs
- **Compression ratio:** useful_elements / tokens

**Decision rule:** if B* has meaningfully lower variance or better worst-case than A1 even when peak matches, reliability thesis survives.

**S6.1 — Sensitivity sub-experiment (added from Miradi #48):**

Test whether Vāda produces more stable outputs under tiny input perturbations than baseline.

- Subset of 5 questions (mix of V1-wins and V1-losses)
- 3 perturbed variants per question: add/remove a period, rephrase slightly, change pronoun
- Run each variant through B1 and A1 at N=3 (Haiku)
- Measure output similarity across perturbations

**Rationale:** if Vāda is more stable under trivial input changes than single-shot, that's a reliability advantage independent of peak output. Supports redefinition path where Vāda becomes a reliability-product.

**Estimated cost:** ~$3 (Step 6 + S6.1 combined, Haiku pricing)

---

### Step 7 — Judge robustness

**Purpose:** test measurement integrity.

**Setup:** same outputs from Steps 4-5, re-scored with cross-model judge (Gemini Pro or GPT-5 if API available). **This step intentionally uses a non-Haiku judge** to detect Haiku self-preference bias.

**Metric:** agreement rate with Haiku locked judge. Divergence cases flagged for analysis.

**Decision rule:** if cross-model judge disagrees substantially with Haiku same-model judge, there's measurement bias. Re-evaluate previous conclusions under both judges. Report both sets of results in findings.

**Estimated cost:** ~$2

---

### Step 8 — Epistemic independence (gated on Step 4 passing)

**Purpose:** test whether de-correlation mechanisms improve orchestration.

**Only runs if B1 > A1 OR B1 has meaningful reliability advantage over A1.** Skip otherwise — no point optimizing a system that hasn't proven its existence.

**Model:** Haiku throughout, except E5 (model diversity) which is the explicit exception.

**Experiments:**

- **E1 — Temperature variance:** B1 with mixed temps (0.2 / 0.5 / 0.9 / 1.1) across agents
- **E2 — Sampling diversity:** different seeds, nucleus/top-p variation per agent
- **E3 — Communication topology:** pairwise-only, hierarchical tree vs current full mesh
- **E4 — Role orthogonality enforcement (structural):** Critic proposes incompatible alternative model, Devil's Advocate outputs mutually exclusive framing
- **E5 — Model diversity (optional, highest-cost):** mix 2-3 different models across agents (Haiku + Sonnet + Gemini Flash or similar)

**Metrics (new for this phase):**

- **Diversity Quality Ratio:** useful_unique_points / total_unique_points (distinguishes signal from noise)
- **Convergence Stability:** how quickly agents collapse to same view across rounds

**Decision rule:**

| Outcome | Meaning |
|---|---|
| Independence ↑ info gain AND stable | Real leverage — adopt |
| Independence ↑ variance only | Noise injection — reject |
| Independence no effect | Redundant complexity — reject |
| Independence needed to beat A1 | Weak base architecture — revisit roles/rounds |

**Estimated cost:** ~$3

---

### Step 9 — Task-type stratification

**Purpose:** build routing logic based on where Vāda wins.

**Setup:** expand corpus to 30-50 questions balanced by category. Run stratified bench on Haiku.

**Metric:** win-rate per category (Technical, Business, Ethical, Personal, Ambiguous)

**Decision rule:** if task-type pattern holds at larger N, implement routing. Principal asks question → system detects category → routes to Vāda or single-shot based on expected value.

---

### Step 10 — User Agency (Friction Probe)

**Purpose:** implement Gemini's "poke the friction" interaction model.

**Gated on:** thesis validated in Step 4 + product direction chosen.

**Build:**
- Tension cards render `unresolved_tensions` in UI as interactive elements
- Three Principal actions: Pivot (re-synthesize with constraint), Deepen (spawn Sub-Crucible on specific tension), Settle (accept risk and proceed)
- Sub-Crucible: 2-round focused deliberation on one friction point by relevant agents

**Metric:** user decision quality with vs without Friction Probe access. Requires user testing, not bench.

---

### Step 11 — Model capability ladder (post-V2, pre-Phase-3)

**Purpose:** determine the capability floor where Vāda orchestration produces improvement. **This is the model-agnosticism empirical test.**

**Gated on:** V2 thesis surviving on Haiku (Step 4 outcome).

**Setup:**
- Reduced bench: 5 questions (stratified across categories)
- N=3 per model per configuration
- For each model, run both: model-X single-shot (rich prompted, A1-style) vs model-X Vāda (B1 architecture)

**Models (in order of testing):**

- **Claude Opus 4.7:** ceiling check — does Vāda still add value on frontier models?
- **Claude Sonnet 4.6:** original V1 model (V1 comparison point)
- **Claude Haiku 4.5:** V2 reference model (should reproduce V2 results)
- **GPT-4o-mini or equivalent:** cross-provider commercial tier
- **Llama 3.1 70B (via Ollama):** open-weight mid-tier
- **Llama 3.1 8B (via Ollama):** open-weight small
- **Qwen 14B (via Ollama):** known persona-collapse case (confirms threshold)

**Metric:** for each model, does Vāda beat single-shot? Map the floor.

**Expected outcome:** Vāda produces improvement down to some capability floor, below which either persona collapse or schema compliance fails. The floor identifies Vāda's market positioning.

**Cost:** ~$15 additional (most cost in Opus + Ollama time, not API spend).

**Timeline:** ~1 week, mostly Ollama deliberations running overnight.

**Why this step exists:** answers the model-agnosticism claim empirically. Vāda's architectural intent is model-agnostic (§1.6). Step 11 measures where that intent breaks down in practice.

---

## 4. Budget

| Phase | Estimated cost | Cumulative |
|---|---|---|
| Step 0 (dataset lock) | $0 | $0 |
| Step 1 (A0 vs A1, Haiku) | ~$1 | $1 |
| Step 2 (A0 vs B0, Haiku) | ~$2 | $3 |
| Step 3 (B0 vs B1, Haiku) | ~$2 | $5 |
| Step 4 (A1 vs B1, Haiku) | ~$2 | $7 |
| Step 4.5 (ablation, Haiku) | ~$1 | $8 |
| Step 5 (Cold Reader, Haiku) | ~$2 | $10 |
| Step 5.5 (Curator, Haiku) | ~$2 | $12 |
| Step 6 + S6.1 (variance, Haiku) | ~$3 | $15 |
| Step 7 (judge robustness, cross-model) | ~$2 | $17 |
| Step 8 (conditional, Haiku) | ~$3 | $20 |
| Step 11 (capability ladder, mixed models) | ~$15 | $35 |

**Total projected: ~$35 through capability ladder.** Dramatically lower than Sonnet-based V2 (~$57+) due to Haiku pricing.

**Savings rationale:** Haiku's input/output token pricing is ~5x cheaper than Sonnet. Full V2 protocol on Haiku costs less than a single V1 bench run on Sonnet.

---

## 5. Timeline

Steps 0-4.5 are the existential gate. Estimated 2-3 days of focused work on Haiku (faster than Sonnet estimates due to Haiku's lower wall-clock time).

- **Day 1 morning:** Step 0 ✅, Step 1 execution
- **Day 1 afternoon:** Step 2 execution + Step 3 build (schema + prompts + Blind Critic)
- **Day 2:** Step 3 execution, Step 4 execution
- **Day 3:** Step 4.5 execution, analysis of Steps 4+4.5 results
- **Decision point:** continue to Steps 5+ or pivot

Steps 5-7 gated on Step 4 outcome. Steps 8-11 conditional on thesis survival.

**Haiku timeline advantage:** each deliberation ~30-45 seconds vs Sonnet's ~120-140s. Full 15-question bench at N=3 runs in ~45 minutes on Haiku vs ~3 hours on Sonnet.

---

## 6. Kill criteria

**Thesis killed if:**

- Step 4 shows B1 < A1 meaningfully (orchestration is net-negative on Haiku)
- Step 4.5 shows A1 > B0-original AND A1 ≈ B1 (schema alone accounts for all gains — orchestration was never non-redundant)
- Step 6 shows no variance/reliability advantage when peak matches
- Step 2 shows Haiku fails Persona Collapse prevention. Orchestration doesn't execute on Haiku. Does NOT invalidate the thesis, but invalidates V2 Haiku data — would force re-test on Sonnet to distinguish "thesis wrong" from "Haiku below capability floor."

**Thesis survives (redefined) if:**

- Step 4 shows B1 ≈ A1 but B1 lower variance OR higher info gain OR better worst-case
- Requires product redefinition around reliability/decision-support rather than peak output

**Thesis validated if:**

- Step 4 shows B1 > A1 meaningfully on Haiku
- Step 6 confirms result holds across variance runs
- Step 7 confirms result survives cross-model judge
- Step 11 (later) shows the result generalizes — ideally Sonnet confirms, Llama 70B confirms. If Haiku alone shows gain but Sonnet doesn't, result is suspicious (Haiku-specific artifact). If Haiku + Sonnet both show gain, real architectural effect.

---

## 7. Decision authority

Principal (Daniel) holds final call on all thesis-survival decisions. Advisors (Claude Opus 4.7, Gemini Pro, Grok, ChatGPT) provide analysis but don't set direction.

Sonnet executes but does not set scope. Sonnet's role is implementation fidelity, not research design.

---

## 7.5 External validation — Miradi practitioner guide

Dr. Maryam Miradi's *AI Agents: 50 Real-World Best Practices* (April 2026) is a practitioner guide based on 400+ deployed agents across multiple industries. It was not written about Vāda or for deliberation systems specifically, but several of its items independently arrived at V1's architectural choices or V2's proposed directions.

This is external validation: the patterns Vāda implements match what a different expert independently converged on based on production experience.

### 7.5.1 Confirmations of existing V1 architecture

**Item #48 — Hallucination mitigation strategies**

This item enumerates five layers of hallucination mitigation for multi-agent systems. V1 already implements multiple patterns Miradi specifically names:

- **Blind Critics "reviewing outputs without seeing reasoning"** → V1 Blind Critic audit (spec §5.2)
- **Structural Constraints with JSON schemas where parse failures signal hallucinations** → V1 Zod-enforced Conclusion schema (spec §5.1)
- **Debate patterns where agents argue contradictory positions** → V1 Round 2/3 adversarial structure (spec §4.2, §4.3)
- **Cross-Model verification** → maps to V2 Step 7 (judge robustness with cross-model judge)
- **Fractal Sampling — query 3x where variance flags hallucinations** → V2 multi-run methodology (N=3 for diagnostic, N=5 for existential test)

**Item #49 — Governable agents architecture**

Miradi's governance rule: *"Split thinking from acting: one path plans, another executes; execution never accepts free-text."*

This independently restates Grok's Round 3 proposal to separate decision-extraction from structure-preservation. Two different sources (a practitioner with 400+ deployments and an independent LLM reviewer) converged on the same architectural principle. V2 Step 5.5 (Curator variant) tests this directly.

Other Miradi governance rules confirmed by V1:
- **"Lock the decision boundary"** → V1 Conclusion schema constraints
- **"Assign single ownership: one agent, one responsibility"** → V1 role differentiation (spec §2.2)
- **"Design for observability"** → V1 Langfuse integration
- **"Predictable behavior beats impressive outputs"** → aligns with V2 redefinition option (reliability product, not peak output)

**Item #45 — Context engineering**

Miradi states: *"Context capacity ≠ context quality. Beyond 128K-200K tokens, agents experience 'context rot' where retrieval accuracy degrades."*

V1 operates well below this threshold (~9,000 tokens per deliberation), but the principle supports the plateau hypothesis from four-model consensus. Relevant patterns Miradi names:

- **Context Quarantine through multi-agent isolation** → V1 Cognitive Quarantine (spec §2.1)
- **Compaction Principle for reversible compression (versus irreversible summarization)** → directly describes V1 Synthesizer's failure mode. V1 Synthesizer does irreversible summarization. V2 rich schema is reversible structure.

### 7.5.2 New direction added to V2 from Miradi

**Sensitivity testing as a variance sub-metric (Step 6 extension)**

Miradi item #48 mentions: *"Sensitivity testing where punctuation changes reveal instability."*

This is a specific variance test V2 does not include in its current protocol. Added to Step 6 as sub-experiment S6.1:

- Take a subset of bench questions (5 questions, mix of V1-wins and V1-losses)
- Create 3 perturbed variants per question: add/remove a period, rephrase slightly, change pronoun
- Run each variant through B1 and A1 at N=3
- Measure: does Vāda produce more stable outputs than baseline under tiny input changes?

If Vāda shows lower output variance under input perturbation than A1, this is a reliability advantage separate from peak output quality. Supports the reliability-product redefinition path in spec §1.5.

### 7.5.3 Patterns Miradi mentions that V2 does NOT add

For completeness and to prevent scope creep:

- **Chain-of-Verification** (generating validation questions) — interesting but overlaps with existing Blind Critic. Not added unless Step 4 outcome suggests Blind Critic needs extension.
- **Reflexion / memory across runs** — confirms Grok's Round 2 "no cumulative advantage" gap. Post-V2 phase. Not added to existential gate scope.
- **RAG Critics with Truth databases** — requires external knowledge infrastructure. Outside V2 scope (V2 remains closed-room).
- **Watchdogs via non-LLM scripts** — useful for production, not relevant to existential test.

### 7.5.4 Why this citation matters

Four independent sources (three LLM reviewers + one practitioner guide) converged on the same core patterns: cognitive quarantine, adversarial debate, blind auditing, structural constraints, multi-run variance measurement. This isn't coincidence. It's evidence the architecture maps to real patterns that work.

It does NOT validate that Vāda outperforms single-shot — that's what Step 4 will determine. But it does reduce the probability that V1's architectural intuitions were idiosyncratic or wrong in foundational ways.

The thesis still needs empirical validation. But the architecture isn't operating outside accepted multi-agent patterns.

---

## 8. Appendix — Reviewer contributions

### 8.1 Round 1 — Initial critiques

**Gemini:** "Information Entropy Collapse" framing. Identified Synthesizer pollution by rounds. Proposed Cold Reader + Omission Auditor.

**ChatGPT:** Task-dependent value pattern (Ethical/Personal wins, Technical losses). Judge bias flag. "Deliberation Insights" hybrid approach.

**Grok:** "Wrong optimization target" framing. Two incompatible objectives (deliberation vs decision) fused in single pipeline. Theatrical disagreement critique. Baseline redundancy risk.

### 8.2 Round 2 — Pushbacks on integration

**Grok:** Schema fix removes self-sabotage but doesn't create advantage. Phase 4 is main event, not test. Move redundancy test to Phase 1.

**ChatGPT:** Experimental isolation leaks (Phase 1 masks Phase 2 hypothesis). Judge metric inconsistency. Missing epistemic independence mechanisms. Missing cumulative learning.

**Gemini:** Pollution is Transformer-level attention bias, not psychological socialization. Context window contamination. User Agency gap (Principal as passive recipient).

### 8.3 Round 3 — Delegated deliverables

**Grok:** V-baseline-rich prompt for Step 4 (full prompt text in §9.1)

**ChatGPT:** Isolation protocol with 5 variables and 7 targeted tests. Decision rules locked before execution.

**Gemini:** Cold Reader architecture (code in §9.2), Curator/Selection variant for Step 10 (spec in §9.3), User Agency Friction Probe design.

### 8.4 Round 3 methodological refinements

**Grok:** Parallel ablation (Step 4.5) to separate schema contribution from orchestration contribution.

**ChatGPT:** Step 8 gating discipline — epistemic independence only tested after redundancy resolved.

**Gemini:** Step 10 (Curator) concrete implementation with task-type prediction.

---

## 9. Delegated artifacts

### 9.1 Grok's V-Baseline-Rich prompt (Step 1 A1, Step 4 baseline)

```
You are an expert deliberative reasoner simulating the output of a full multi-agent
orchestration system (Strategist + Critic + Devil's Advocate + Synthesizer in 3 rounds
of orthogonal, adversarial, and convergent exchange). In a single response, produce
decision support that matches or exceeds what such a system would deliver after rich
schema synthesis.

Core objective: Generate high-value, non-compressed output by surfacing the raw useful
material from internal deliberation — conditional branches, observable triggers,
stress-test warnings, base-rate heuristics, tradeoffs, and reframings — without
flattening them into vague prose.

Internal process (do this reasoning thoroughly but output only the final JSON):

1. Map the full landscape from the Principal's exact question.
2. Generate and attack initial framings from orthogonal angles (opportunity/risk,
   assumption destruction, question reframing).
3. Explore 2–4 realistic branches/scenarios, including scope changes, growth signals,
   migration/execution pain, and psychological/base-rate realities.
4. Identify irreducible tensions and hidden costs that a single-shot answer might miss.
5. Synthesize into decisive yet richly structured guidance: commit where evidence
   supports, but preserve the decision framework that makes the output robust under
   uncertainty.

Output EXACTLY this valid JSON (no extra text, no markdown):

{
  "recommendation": "Clear committed position starting with Yes/No/Not yet/Alternative as appropriate, followed by concise actionable explanation that incorporates key insights from the simulated deliberation.",
  "key_condition": "Single most important assumption or prerequisite that must hold for the recommendation to remain valid.",
  "conditional_branches": [
    {
      "condition": "Specific observable scenario or trigger",
      "path": "Recommended action in that case + rationale",
      "signals": "How the Principal will detect this branch applies (concrete indicators)"
    }
  ],
  "important_caveats": ["Array of critical warnings, risks, failure modes, or limitations drawn from stress-testing"],
  "unresolved_tensions": ["Genuine tradeoffs or points of friction worth highlighting; use empty array [] if none remain after synthesis"],
  "review_trigger": "When or under what conditions the Principal should revisit this decision"
}

Strict rules:
- Ground everything strictly in the Principal's question and any stated constraints.
- Be decisive in "recommendation" where possible; do not hedge there.
- Prioritize decision usefulness: the output must retain the branches, warnings,
  heuristics, and triggers that make deliberation valuable.
- For technical questions with a clear best practice, state it cleanly while still
  including relevant conditionals and caveats.
- Favor precision and information density.

Principal's question: [INSERT QUESTION HERE]
```

### 9.2 Gemini's Cold Reader architecture (Step 5)

```typescript
// V2 — "Cold Reader" Synthesis
// Stateless invocation with curated payload
const coldReaderSynthesis = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001',  // V2 reference model
  system: SYNT_CONCLUSION_PROMPT, // Instructions for preservation, not compression
  messages: [
    {
      role: 'user',
      content: `
        PRIMARY QUESTION: ${principalQuestion}

        DELIBERATION TRANSCRIPT (GROUND TRUTH):
        ${extractRawAgentTurns(transcript)} // Strips internal UI tags and round-modifiers

        TASK:
        You were NOT part of this room. You are an external auditor.
        Identify the logic-gates and irreducible tensions.
      `
    }
  ],
  temperature: 0.2 // Low variance for structural fidelity
});
```

Key properties:
- Zero memory of round order or agent socialization
- Role shift: agent of deliberation → auditor of transcript
- Stateless treatment of transcript as static object

### 9.3 Gemini's Curator mechanism (Step 5.5)

Stateless agent receives transcript. System prompt: "One of these agents has the most actionable, risk-aware path. Identify that agent and return their response verbatim as the recommendation. Use the other agents only for the 'Warnings' and 'Dissent' fields."

Prediction: dominates Convergent tasks (Technical) where standout candidates exist. Synthesis may continue to win Divergent tasks (Ethical/Personal) where blending captures multi-perspective value.

### 9.4 Gemini's Friction Probe (Step 10)

UI renders `unresolved_tensions` as Logic Fork cards. Each card shows:
- Agent A position
- Agent B position
- Three Principal action buttons

Actions:
- **[Pivot]:** "Accept Agent A's constraint. Re-synthesize with this."
- **[Deepen]:** "Spawn Sub-Crucible — Agent A and Agent B debate this specific tension for 2 rounds."
- **[Settle]:** "Accept the risk. Proceed with current path."

---

# §10 Addition to `vada-v2-specification.md`

**Append this section to `vada-v2-specification.md`, between §9 (Delegated artifacts) and the current end-of-document marker.**

---

## 10. Round 4 refinements

After spec lock, three reviewers (Grok, Gemini, ChatGPT) performed one additional short review round on the integrated plan. Seven concrete refinements surfaced and were accepted. Applied at specific task boundaries.

### 10.1 Synthesizer prompt goal ranking (applies at Task 4, Step 3 build)

**Source:** Gemini, Round 4.

**Problem:** the Synthesizer conclusion prompt mixes "preserve structural richness" and "commit to a position" without explicit priority. On Haiku, Transformer recency bias makes the last instruction in the prompt dominant, producing over-compression (V1 failure mode) by default.

**Refinement:** rank goals explicitly.

- **Primary Directive:** "You are a Structure-Preserving Auditor. Your success metric is the **Retention Density** of the transcript's technical warnings and conditional branches."
- **Secondary Directive:** "After capturing the full content, provide a committed recommendation."
- **Fail-Safe clause (explicit in prompt):** "A concise response that omits a specific technical friction point from the transcript is a Failure. A detailed response that preserves irreducible tension is a Success."

**Retention Density** becomes a named metric: retained transcript content / total transcript content. Tracked in Task 5 (Step 3) and Task 6 (Step 4) analysis.

### 10.2 Omission-is-failure in Blind Critic Richness gate (applies at Task 4)

**Source:** Gemini, Round 3+4.

**Refinement:** Blind Critic Richness gate explicitly checks whether valuable upstream content (stress-test warnings, conditional branches, base-rate arguments) appeared in transcript but got stripped from conclusion. If yes → FAIL regardless of how clean or decisive the output looks.

### 10.3 Hallucinatory Nuance watch-item (applies at Task 5, Task 6 analysis)

**Source:** Gemini, Round 4.

**New failure mode:** if prompts are so rigid about preserving richness that Haiku fabricates branches, caveats, or conditionals that didn't appear in the transcript, Vāda swaps V1's over-compression for V2's hallucinated nuance. Both are failure modes.

**Detection:** track Logic Audit pass rate alongside Richness scores. Warning sign: B1 shows high Richness but drops in Logic Audit compared to B0. This indicates forced richness / fabrication.

**Response if detected:** pause Step 3 rollout, investigate whether prompts are demanding structure Haiku can't legitimately produce, soften prompt constraints, retest.

### 10.4 Pre-commitment ritual before Step 4 (applies at Task 6)

**Source:** Grok + ChatGPT convergence, Round 4.

**Problem:** both reviewers independently flagged that after Steps 1-3 improve Vāda with schema fix, the Principal is emotionally invested before Step 4 runs. "Teams quietly rewrite their own rules" at the kill gate.

**Refinement:** before Task 6 execution, Principal writes a sealed commitment document. Committed to repo. Cannot be edited after Task 6 runs.

Document template:

```markdown
# Step 4 Pre-Commitment

Written [YYYY-MM-DD], before Step 4 execution.
Repo state: commit [hash].

## Part 1 — Prior probability distribution

Expected outcomes before running Step 4 (Haiku 4.5, N=5, 7 V1-loss subset + SQLite):

- B1 > A1 meaningfully: [X]% likely
- B1 ≈ A1, B1 lower variance: [X]%
- B1 ≈ A1, B1 higher info gain: [X]%
- B1 ≈ A1, no other gains: [X]%
- B1 < A1: [X]%

Reviewer predictions (optional, collected for triangulation):
- Grok: [distribution or single verdict]
- Gemini: [distribution or single verdict]
- ChatGPT: [distribution or single verdict]

## Part 2 — Interpretation commitments

Locked rules. No rationalization after results arrive.

1. If actual outcome matches predicted "most likely," cannot claim
   surprise to justify reinterpretation.
2. If B1 beats A1 by fewer than 3 net flips on the 7-question V1-losses
   subset, thesis dead as stated. No "close to meaningful" rationalization.
3. If B1 beats A1 by 4+ net flips AND Step 4.5 shows A1 < B0-original
   meaningfully, orchestration adds value. Proceed to Step 5.
4. If B1 ≈ A1 on Haiku, run Sonnet disambiguation (§10.6) BEFORE killing.
5. Apply interpretation grid in §3 Step 4 without deviation.

## Part 3 — Watch-items to check before interpreting

- Logic Audit pass rate on B1 (Hallucinatory Nuance check, §10.3)
- Schema parse failure rate on B1 (>5% invalidates results partially)
- Persona Collapse indicators on Haiku (capability floor signal)

Signed, [Principal].
```

### 10.5 Information Gain as quality metric (applies at Task 6)

**Source:** ChatGPT, Round 4.

**Problem:** spec's original Information Gain metric ("count unique conditional branches, triggers, caveats") treats decorative complexity as equal to useful insight. Counts filler.

**Refinement:** judge evaluates each structural element in output as either:
- **Actionable insight:** addresses a real consideration the Principal would weigh
- **Filler:** generic hedging without content

Information Gain = count of actionable elements only. Filler ignored.

**Implementation:** extension to V2 judge — extra evaluation pass that tags elements before aggregating. Cost: ~$1 additional per step that uses it.

**Applied at:** Task 5 analysis (Step 3), Task 6 analysis (Step 4), all downstream steps that report Information Gain.

### 10.6 Haiku → Sonnet disambiguation (modifies §6 Kill criteria)

**Source:** ChatGPT, Round 4.

**Problem:** if Step 4 shows B1 ≈ A1 on Haiku, the result has two incompatible interpretations:
- Orchestration is redundant (thesis dead)
- Haiku is below capability floor for orchestration (thesis fine, model too weak)

Haiku-only data cannot distinguish these. Killing the thesis on Haiku-only ≈ results risks a false negative.

**Refinement:** if Task 6 shows B1 ≈ A1 on Haiku, run priority disambiguation step before applying kill criteria:

- Same prompts, same schema, same 7 V1-losses corpus
- Model: Sonnet 4.6 (agents, baseline, judge all switch to Sonnet)
- N=3 per variant
- Cross-model judge for Sonnet neutrality
- Cost: ~$3, time: 1 day

**Interpretation:**
- Sonnet also shows B1 ≈ A1 → thesis dead at two capability levels. Kill or pivot.
- Sonnet shows B1 > A1 meaningfully → Haiku was below capability floor. Thesis survives. V2 continues on Sonnet for remaining steps.

**Kill gate modification:** the "B1 ≈ A1 → pivot or kill" rule in §6 now reads: "B1 ≈ A1 on Haiku → run Sonnet disambiguation → apply rule based on Sonnet result."

### 10.7 Elevate Step 8 E5 to priority (modifies §3 Step 8)

**Source:** Gemini + ChatGPT convergence, Round 4.

**Problem:** "Echo Chamber of One" — all Vāda agents share one model's weights, so they share its blind spots. No amount of role-prompting creates knowledge the base model lacks. E5 (model diversity) is the only experiment that addresses this at the architectural level rather than the prompt level.

**Refinement:** E5 moves from "optional, highest-cost" to **priority experiment** within Step 8, gated on Step 4 thesis survival.

**Gemini's concrete first-variant configuration:**
- Critic → Llama 3 (high-temperature destruction model)
- Strategist → Sonnet 4.6 (planner)
- Devil's Advocate → [TBD — Principal choice]
- Cold Reader synthesis → Gemini Pro or GPT-4o

This creates a "Synthetic Committee" where no single model's attention bias dominates.

**Cheaper alternative variant** (simpler to run, no Ollama dependency):
- Haiku + Sonnet + Gemini Flash across agents

Test cheaper variant first if time-constrained. Full Llama-inclusive variant if results warrant.

---

## Watch-items summary (consolidated)

Three watch-items from Round 4 that monitor for specific failure modes during execution:

1. **Schema parse failure rate on Haiku** — >5% means Haiku can't reliably produce V2 schema, results partially invalid
2. **Persona Collapse on Haiku** — agents blurring into same voice means capability floor reached
3. **Hallucinatory Nuance** — high Richness + low Logic Audit means forced fabrication, not preservation

All three are instrumented at Task 4 build. All three reviewed at Task 5 and Task 6 analysis.

---

**End of Round 4 refinements.**

**End of V2 specification.**
