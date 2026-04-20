# Vāda V2 — Architecture Specification

Written: April 21, 2026
Status: Active spec. Supersedes all previous V2 architecture documents.
Related: `vada-product-thesis.md` (the why)

---

## Purpose of this document

This is the technical roadmap for evolving Vāda V1 into V2. It is organized around the Two Challenges framework established in the product thesis:

- **Challenge 1:** the deliberation secret sauce (architecture independent of tools)
- **Challenge 2:** chat-product parity per agent (capability)

Each challenge has its own track of experiments. Both tracks run against the same V1 bench questions as the measurement framework.

---

## V1 state — what we have

### Architecture

- Crucible workflow: 4 agents (Strategist, Critic, Devil's Advocate, Synthesizer) × 3 rounds
- Conclusion pipeline: synthesize → audit → revise/reaudit (blind critic discipline)
- All agents use the same model, no tool access, system-prompt reasoning only
- Mastra-based orchestration (Steps 1-5.5 complete)
- Langfuse observability at workflow/step level

### V1 bench results (April 21)

**15 questions across 5 categories. 14 completed + 1 resume-skipped. 0 pipeline failures.**

**Distribution:**
- VADA_WON: 7
- BASELINE_WON: 7
- TIE: 0
- NEGLIGIBLE_DIFFERENCE: 0
- PIPELINE_FAILURE: 0

**Category breakdown:**
- Technical (5): 0 VADA_WON
- Business (2): 1 VADA_WON (B2), 1 BASELINE_WON (B3)
- Ethical (2): 2 VADA_WON
- Personal (3): 3 VADA_WON
- Ambiguous (3): 1 VADA_WON (A3), 2 TBD

Bench cost: $3.11 of $28 budget.

### Root-cause analysis of BASELINE_WON cases (from judge reasonings)

**Pattern: Synthesizer over-compression.**

The judge explicitly called out in three cases:
- *"Deliberation tightened the prose and provided a cleaner verdict, but removed critical stress-test content"*
- *"Compressed away the unplanned work/capacity reservation heuristic"*
- *"Sacrificed important practical warnings"*

**This contradicts the earlier hypothesis of "Vāda hedges."** Vāda is not hedging — it is producing cleaner, more decisive answers than baseline. But in compressing deliberation to a single recommendation, the Synthesizer strips useful nuance, conditional logic, and practical caveats that the round transcripts contain.

**The raw deliberation probably has this content.** The Synthesizer is the bottleneck.

---

## Challenge 1 — Deliberation Architecture

### Hypothesis

The V1 Synthesizer role is too aggressive in compression. Deliberation generates useful content in the 12 agent turns (Strategist, Critic, DA, Synthesizer × 3 rounds), but the conclusion-phase Synthesizer reduces this to a single tight recommendation, losing conditional branches, stress-test content, and heuristics.

### Experiment 1.A — Synthesizer prompt refinement

**Change:** update the conclusion-phase Synthesizer prompt to preserve conditional structure, caveats, and decision-support scaffolding from the deliberation transcript. Move from "produce a single recommendation" to "produce a structured recommendation with conditional branches where the deliberation surfaced them."

**Test:** rerun full V1 bench. Same questions, same baseline, same judge.

**Success criterion:** BASELINE_WON count drops, VADA_WON count increases. Target: at least 9 VADA_WON of 14 (vs current 7).

**Cost:** ~$3.50 for full rerun.

### Experiment 1.B — Conclusion structure redesign

**If 1.A insufficient:** change the Conclusion type to allow richer structure. Currently Conclusion has single `recommendation` string. V2 could add:
- `primary_recommendation` (when deliberation converges)
- `conditional_branches` (if-then structure when answer depends on unknowns)
- `important_caveats` (risks and warnings the deliberation surfaced)
- `dissenting_views` (when agents disagreed genuinely)

**Trade-off:** richer structure = better decision support but harder to render cleanly in UI.

### Experiment 1.C — Iterative refinement pattern

**Alternative architecture, tested if 1.A and 1.B don't close the gap.**

Replace fixed rounds with iterative refinement mirroring how Dani uses chat:
- Agent 1 answers
- Agent 2 reviews, finds issues
- Agent 1 refines
- Agent 3 reviews refined answer
- Loop until convergence or 5 iterations

**Eliminates:** Strategist/Critic/DA/Synthesizer as fixed roles. Agents all have same system prompt: "Give your honest opinion. Find real issues. Refine based on real issues."

**Keeps:** structured output (audit still happens), session persistence, judge measurement.

### Experiment 1.D — Role-specific tool access (tests interaction with Challenge 2)

**Only if Challenge 2 Phase 1 is done first.** Experiment whether giving different tools to different roles produces better deliberation than same tools to all agents.

### Measurement discipline for all Challenge 1 experiments

- Same 15 V1 bench questions
- Same judge prompt
- Same baseline definition (stripped single-shot, no tools)
- One change per experiment (no confounding)
- Each experiment documented with before/after diagnosis distribution
- New column on benchmarkMetrics: `experiment_id` or `architecture_version` so historical comparisons are possible

---

## Challenge 2 — Chat-Product Parity per Agent

### Hypothesis

Each Vāda agent should have capability parity with a major AI chat product (Claude.ai, ChatGPT, Gemini). This means tools, research, and iteration support — not just system-prompt reasoning.

### Research required first

Before implementation, document:
1. **What exact tools does Claude.ai expose to Claude?** Web search is obvious. What else — artifacts, code execution, document processing, extended thinking?
2. **Are these API-available or claude.ai-wrapper-only?** Extended thinking is API-available. Web search might require the `computer_use` beta or MCP tooling. Specifics matter.
3. **What's ChatGPT's tool exposure?** For future multi-model experiments.
4. **What's Gemini's?** Same reason.
5. **MCP ecosystem in 2026:** what tools are production-ready vs experimental?

**Research method:** web search + official docs + testing.

### Implementation phases

#### Phase 2.1 — Web search for all agents

**Minimum viable parity.** Add web search via Anthropic API's tool parameter (if available) or MCP equivalent to every Vāda agent. Start with search-only, don't add other tools yet.

**Why web search first:** most universally useful. Agents can verify facts, find current data, ground claims in sources. Directly addresses the "reasoning from training data" limitation.

**Test after:** rerun V1 bench with tool-equipped agents. Compare against V1 baseline.

**Note:** if V1's stripped baseline still wins often, Challenge 1 work is the bottleneck, not tools. If tool-equipped Vāda wins substantially more, tools are load-bearing.

#### Phase 2.2 — MCP tool access

Add broader MCP capabilities: file reading, structured data access, domain-specific tools. Test whether this further shifts diagnosis distribution.

**Note:** Step 8 of the original Mastra migration plan was "MCP for Researcher only" — a new 5th agent. That plan is revised: in V2, MCP tools attach to existing agents, not a new role.

#### Phase 2.3 — Extended thinking / reasoning modes

If the API exposes extended thinking (via `thinking` parameter or similar), enable it for agents on complex questions. Test impact.

#### Phase 2.4 — Memory / context preservation

Longer-term. Not in V2. Becomes part of Vitakka.

### Measurement for Challenge 2

**Same V1 bench.** Same 15 questions. But now:
- V1 stripped Vāda baseline: 7 VADA_WON (known)
- V2 Challenge 2 Phase 2.1: tool-equipped Vāda, measure
- V2 Challenge 2 Phase 2.2: MCP-equipped Vāda, measure
- V2 Challenge 2 Phase 2.3: extended-thinking-equipped Vāda, measure

**Target:** each phase produces measurable improvement. If not, the capability wasn't the bottleneck.

### Separate comparison — Vāda vs Claude.ai-equivalent baseline

For real-world positioning, also need a baseline that represents actual chat-product use:
- Call Claude via API with web search tool enabled
- Single iteration
- Compare Vāda (multi-agent with tools) against this as well as against stripped single-shot

**This answers:** is Vāda with tools better than Claude.ai would be?

---

## V2 sequence

### Phase 0 — V1 completion (immediate, April 21)

Finish Mastra migration:
- Step 6: Browser migration + /trust + BYOK rewrite
- Step 9: Code cleanup
- Step 10: Docs update

Remove Step 8 from V1 scope (it becomes Phase 2.1 of V2).

Create bench analysis doc capturing the Synthesizer over-compression finding.

**Commit V1 as baseline.** Tag: `vada-v1-baseline`.

### Phase 1 — Challenge 1 experiments (days to weeks)

Run experiments 1.A through 1.C in sequence. Measure each against V1 bench. Document findings.

**Goal:** establish whether deliberation architecture can be refined to beat single-shot without tool access.

**Exit criterion for Phase 1:** either 11+ VADA_WON is achieved (thesis confirmed) or three experiments fail to close the gap (deliberation-alone thesis weakened).

### Phase 2 — Challenge 2 experiments (days to weeks)

Run experiments 2.1 through 2.3 in sequence. Measure each against V1 bench.

**Can be parallel with Phase 1** if separate team or enough focus. But variable isolation matters — don't change both challenges at once.

**Goal:** establish how much tool/capability parity contributes on top of Challenge 1 fixes.

### Phase 3 — Cross-model experiments (weeks+)

Only after Phases 1 and 2 are reasonably understood. Test whether heterogeneous model deliberation (Sonnet + Gemini + GPT) produces additional value over homogeneous-tool-equipped deliberation.

This is where Vāda's long-term moat lives, but testing it requires Phases 1-2 to be solid first.

### Phase 4 — Public positioning

Only after V2 experiments produce data worth publishing. Not before.

Build public bench page. Rewrite marketing. Ship based on data, not aspiration.

---

## Preserved from V1

### Crucible workflow

V1's four-agent × three-round × conclusion-pipeline structure stays as the architectural baseline. V2 experiments modify parts of it but don't abandon it.

### Conclusion pipeline

Synthesize → audit → revise → reaudit is proven (0 pipeline failures across 14 questions). V2 inherits this primitive. Experiment 1.B modifies what Synthesize produces; the audit/revise discipline stays.

### Bench V1 as measurement framework

15 questions, 5 categories, judge prompt, diagnosis taxonomy. All preserved. V2 experiments measured against same questions.

### Mastra orchestration

V1's Mastra workflow becomes the platform for V2 experiments. Each experiment is a different workflow variant, toggled via config. V2 is not a new orchestration rebuild.

### Langfuse observability

V1's trace infrastructure supports all V2 experiments. Per-span visibility into agent behavior helps diagnose what each experiment changes.

---

## Not in V2 scope

- Vitakka (longitudinal memory) — separate product
- Attā (persistent identity substrate) — separate product
- Cetanā (executor) — paused, see cetana-capability-reality-check.md
- Multi-tenant user segmentation — product decision, not research
- Payments, billing, subscriptions — product decision
- Marketing site, public bench, /trust redesign beyond V1 completion — product decisions

**V2 is research + architecture. Product decisions flow from what V2 research confirms.**

---

## Open questions

1. **Challenge 1 vs Challenge 2 priority.** Dani has expressed preference for Challenge 1 first (roles/deliberation). This is defensible because it isolates variables. But if Challenge 1 experiments fail to move the needle, Challenge 2 might be the real bottleneck, and we'd have wasted time. Open.

2. **Experiment_id in database.** Need to decide schema for tagging benchmarkMetrics with architecture version so V1 baseline and V2 variants can be compared. Drizzle migration required.

3. **Parallel vs sequential experiments.** If Dani solos all V2 work, sequential is forced. If second developer joins, Phase 1 and Phase 2 could parallelize.

4. **Public positioning during V2.** Vāda website currently claims "deliberation engine for hard questions." This is not yet supported by data. Should website be softened during V2 to "research platform for deliberation science" framing? Product decision, not technical.

5. **Baseline definition refinement.** V1 baseline is stripped single-shot. Should V2 add a "Claude.ai equivalent" baseline (single-shot with tools) for comparison? This would be more honest than just stripped baseline.

---

## Success definition for V2 as a whole

V2 is successful if at least one of these becomes true:

1. **Deliberation thesis confirmed:** Challenge 1 experiments produce 11+ VADA_WON on V1 bench, proving deliberation architecture works independent of tools.

2. **Tool parity thesis confirmed:** Challenge 2 experiments produce meaningful improvement over V1 baseline, proving chat-product parity matters.

3. **Combined thesis confirmed:** Challenge 1 + Challenge 2 together produce 13+ VADA_WON, proving both are load-bearing.

**V2 fails if:** after all experiments, Vāda with best architecture + best capabilities cannot reliably beat a single Claude.ai-equivalent chat. In that case, Vāda pivots to supporting human-in-the-loop iteration instead of automating deliberation.

---

## Related documents

- `vada-product-thesis.md` — the strategic why
- `apps/vada-ai/specs/v2/followups.md` — rolling followup list (to be pruned based on this spec)
- `/tmp/vada-bench-morning.log` — V1 bench raw output
- `apps/atta-ai/specs/atta-ecosystem-vision.md` — broader four-product vision
- `apps/atta-ai/specs/cetana-capability-reality-check.md` — Cetanā status (paused)

---

## Summary

V2 addresses two independent challenges. Challenge 1 (deliberation architecture, independent of tools) has a specific known bug: the Synthesizer over-compresses. Experiments refine the Synthesizer first, then broader architecture if needed. Challenge 2 (tool parity per agent) requires research into what major chat products expose, then implementation and measurement. Both challenges use V1 bench as the measurement framework. Phase sequencing preserves variable isolation. V2 succeeds if at least one challenge confirms the thesis; ideally both do, producing a product with a real moat.
