# Vāda YAML Cost Calculator — Concept Document

Status: draft

**Status:** Concept / future work
**Date captured:** April 25, 2026
**Context:** Emerged from realization that Vāda is a YAML-driven deliberation runtime, not a closed app

---

## The core idea

Build a UI in Vāda where a user pastes (or selects) a deliberation YAML and sees the estimated cost to run it.

Cost = sum across all agents in all rounds of (input tokens × input price) + (output tokens × output price).

The calculator surfaces a range, not a point estimate, because LLM output length varies.

---

## Why this is more valuable than it sounds

**1. Forces cost-per-deliberation as a first-class product property.**
Currently cost is invisible until after a run. With a calculator, users see cost before committing. Different YAMLs become comparable on cost dimensions.

**2. Forces YAML schema completeness.**
If you can calculate cost from a YAML alone, the YAML must contain all variables that affect cost: models, agent counts, rounds, expected token ranges, audit/synthesis phases. Cost calculation is a forcing function for schema design.

**3. Becomes a budget governor.**
Eventually a user could say "give me deliberation under $0.50" and the system filters available YAMLs.

**4. Validates YAML parseability.**
A cost calculator is essentially a YAML linter that returns a number. If it can't calculate, the YAML is malformed.

**5. Reveals architectural cost drivers.**
Discoveries like "audit phase doubles cost for marginal quality gain" only emerge when cost is visible.

**6. Pairs with benchmark data to enable quality-per-dollar analysis.**
Cost alone is misleading. Cost paired with benchmark scores becomes:
- Cost per quality point: $cost / aggregate_score
- Marginal cost of improvement: how much extra cost for +0.3 score?
- Cost-quality frontier: chart YAMLs on cost (x) vs quality (y), find Pareto-optimal configurations

This isn't a calculator. It's the foundation for treating YAMLs as products with measurable economics.

---

## Math sketch

```
total_cost = sum across all agents of:
  (input_tokens × input_price_per_token_for_their_model)
  + (output_tokens × output_price_per_token_for_their_model)

where for each agent:
  input_tokens = brief_size + (round - 1) × prior_responses_size + system_prompt_size
  output_tokens = expected_output_size (configurable per agent role, e.g., 400 for reviewers)
```

Required ingredients:
- Token-counting utility (`@anthropic-ai/sdk` has one, or use `tiktoken`)
- Model price catalog: per-token input/output prices per provider+model
- YAML parser that extracts agent configs
- Cost summation that walks rounds × agents × audit/synthesis phases

Output format:
```
Estimated cost: $0.06 - $0.18
Breakdown:
  - 3 reviewers × 1 round × Sonnet ($0.003 input + $0.015 output)
  - Brief: ~800 tokens
  - Avg response: ~400 tokens
  - Total tokens: ~3,600 input + ~1,200 output
Best case (concise responses): $0.04
Worst case (verbose responses): $0.18
```

Ranges matter. Point estimates would be misleading.

---

## Where the UI lives — three options

**Option A: A page in the existing Vāda web app.**
`/yaml-cost-calculator`. Paste YAML, see cost. Simple, fast to build, validates the idea.

**Option B: Integrated into a YAML editor (once one exists).**
Cost estimate updates live as user edits YAML. Tight feedback loop for YAML authors.

**Option C: A dedicated tool surface for YAML management.**
Browse YAML catalog → see costs alongside benchmark scores → fork YAML → see cost change. This becomes the real product surface for Vāda as a deliberation engine.

Option C is where this is heading. Option A is what gets built first to validate.

---

## YAML schema implication: token expectations

Two design choices on whether YAMLs declare expected tokens:

**Option A (preferred): YAML doesn't include token expectations.**
Calculator infers from defaults (e.g., "reviewer = ~500 tokens output") or from observed benchmark data. Pre-benchmark YAMLs use defaults. Post-benchmark YAMLs use actual observed token counts. Accuracy improves with usage.

**Option B: YAML explicitly declares expected token ranges per agent.**
More accurate up front but more verbose. YAML authors have to estimate.

Recommendation: Option A — keep YAMLs simpler, let benchmark history inform the calculator. This means cost estimates improve naturally as YAMLs accumulate run history.

---

## What this changes about Vāda's product positioning

If you have:
- YAMLs as the product catalog
- Cost calculator per YAML
- Benchmark history per YAML

Then Vāda is no longer "an app with hardcoded deliberation patterns." It becomes a deliberation marketplace where YAMLs are products with measurable economics.

A user picks a YAML the way they pick a flight: by destination (use case), price (cost), and quality (benchmarks). Vāda's product is the engine + catalog + measurement infrastructure. Surfaces (web app, MCP integrations, third-party apps) become consumers of this platform.

This aligns with the existing logo: "VĀDA DELIBERATION ENGINE."

---

## Cautions

**1. Don't build before YAML refactor.**
It needs YAMLs to operate on. Build YAML refactor first; this naturally fits after.

**2. Estimates have variance.**
Output length depends on what the LLM actually generates. Calculator must show ranges and be honest about uncertainty.

**3. Cost is necessary but not sufficient.**
Cheap deliberation that produces bad output isn't valuable. The calculator's value comes from being paired with benchmark data.

**4. Don't add it to the current Vāda web app surface.**
That UI is currently Autonomous-mode-only. Better as a dedicated tool when YAMLs land.

---

## Sequencing

Where this fits in the broader roadmap:

1. ✅ Brokered prompt fixes (in progress as of capture date)
2. Smoke test re-run with new prompts
3. **YAML refactor** (the prerequisite for everything below)
4. **YAML cost calculator** (this document)
5. Real-case Brokered as a YAML (multi-round, role-free, Principal-terminated)
6. YAML-vs-YAML comparison surface (cost + quality)
7. YAML catalog as Vāda's primary product surface

The cost calculator becomes obvious-to-build once YAMLs exist. Don't pre-design now. But include token-related considerations in the YAML schema design so cost calculation works from day one.

---

## Notes for future implementation

- Token counter: prefer the official Anthropic counter if doing cost for Claude models; fall back to `tiktoken` for OpenAI; use provider-specific tools for others.
- Price catalog: this changes. Don't hardcode. Pull from provider pricing pages or maintain a `model-prices.json` updated periodically.
- Currency: USD by default. Display rounded to cents.
- "Pre-run" estimate vs "post-run" actual: clearly label which is which. Post-run actual cost (from API responses) is the source of truth; pre-run is an estimate.
- Variance bands: show min/max based on expected output ranges, not just averages.

---

## Why this idea is captured separately

This emerged from a single conversation with Claude on April 25, 2026, during the Vāda Brokered V1 polish phase. It came after recognizing that:

- Vāda is a YAML-driven deliberation runtime
- Modes (Autonomous, Brokered, Real-case) are configurations, not products
- The MCP transport + YAML catalog + benchmark history makes Vāda a platform other apps can integrate with

The cost calculator emerged as an obvious next-step that pairs with the YAML refactor. Capturing here so the idea persists between conversations and informs YAML schema decisions when refactor work begins.
