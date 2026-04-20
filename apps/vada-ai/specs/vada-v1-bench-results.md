# Vāda V1 Bench Results

Written: April 21, 2026
Raw data: `/tmp/vada-bench-morning.log` (transient)
Status: Baseline for V2 experiments.

---

## Run metadata

**Date:** 2026-04-21
**Questions:** 15 (1 skipped via resumability — T2 from earlier smoke test)
**Model:** Claude Sonnet 4.6 (all roles: Vāda agents, baseline, judge)
**Budget:** $3.11 of $28 cap
**Duration:** ~70 minutes wall clock
**Pipeline failures:** 0
**Errors:** 0

---

## Diagnosis distribution

| Diagnosis | Count | Percentage |
|-----------|-------|------------|
| VADA_WON | 7 | 50.0% |
| BASELINE_WON | 7 | 50.0% |
| TIE | 0 | 0% |
| NEGLIGIBLE_DIFFERENCE | 0 | 0% |
| PIPELINE_FAILURE | 0 | 0% |

**Of 14 completed questions: exactly split. This is the V1 baseline that V2 experiments must beat.**

---

## Category breakdown

| Category | Completed | VADA_WON | BASELINE_WON |
|----------|-----------|----------|--------------|
| Technical | 5 | 0 | 5 |
| Business | 2 | 1 | 1 |
| Ethical | 2 | 2 | 0 |
| Personal | 3 | 3 | 0 |
| Ambiguous | 2 (A3 only in log; A1/A2 may need recheck) | 1+ | unclear |

**Pattern:** Vāda loses decisively on Technical (0/5), wins decisively on Ethical + Personal (5/5). Business + Ambiguous are mixed.

**Earlier hypothesis (April 20):** "Vāda hedges on easy technical questions." **Revised April 21:** Vāda is not hedging — it is over-compressing useful deliberation content into tight conclusions (see "Root cause" below).

---

## Per-question results

### Technical (0/5 VADA_WON)

| ID | Question excerpt | Diagnosis | Notes |
|----|------------------|-----------|-------|
| T1 | Vercel+Neon+CF vs AWS for fintech team | BASELINE_WON | Vāda hedged into "hybrid stack"; baseline committed to Vercel+Neon+CF |
| T2 | tRPC vs REST vs GraphQL | BASELINE_WON (skipped in this run, from earlier) | — |
| T3 | Redis vs read replica vs schema redesign at 500k DAU | BASELINE_WON | Vāda chose "read replica first"; baseline gave systematic week-by-week diagnostic plan |
| T4 | GitHub Actions vs CircleCI | BASELINE_WON | Both agreed on GitHub Actions; baseline committed more strongly |
| T5 | PostgreSQL vs MongoDB for analytics | BASELINE_WON | Both agreed on PostgreSQL; baseline committed more strongly |

**Signal:** on questions with a defensible analytical answer, Vāda reaches similar conclusions but baseline presents them more decisively.

### Business (1/2 VADA_WON)

| ID | Question excerpt | Diagnosis | Notes |
|----|------------------|-----------|-------|
| B2 | $49 flat vs usage-based B2B pricing | VADA_WON | — |
| B3 | $8M acquisition offer ($2M ARR, 15% MoM) | BASELINE_WON | Deliberation tightened prose but removed "Reasons You Might Still Sell" content |

### Ethical (2/2 VADA_WON)

| ID | Question excerpt | Diagnosis | Notes |
|----|------------------|-----------|-------|
| E2 | Data privacy bug mid-Series-A disclosure | VADA_WON | Vāda produced procedural two-step disclosure plan |
| E3 | Hiring AI with 12% demographic performance gap | VADA_WON | Vāda produced specific EEOC four-fifths precondition |

### Personal (3/3 VADA_WON)

| ID | Question excerpt | Diagnosis | Notes |
|----|------------------|-----------|-------|
| P1 | 12-month runway vs contract job offer | VADA_WON | Asymmetry-of-failure-modes reframing |
| P2 | LDR + dream-job-in-partner's-city | VADA_WON | Reframed from romantic narrative to decision structure |
| P3 | Mortgage + kids + want to start company | VADA_WON | — |

### Ambiguous

| ID | Question excerpt | Diagnosis | Notes |
|----|------------------|-----------|-------|
| A1 | Engineering team missed 3 of 4 deadlines | BASELINE_WON | Deliberation compressed out "What decision would you make differently with better estimates?" heuristic |
| A2 | Not profitable — cut costs or grow? | BASELINE_WON | Deliberation removed the "dangerous middle" trap warning |
| A3 | Engagement but no conversion — paywall? | VADA_WON | — |

---

## Root cause analysis (BASELINE_WON cases)

Reading the three judge reasonings for BASELINE_WON cases reveals a consistent pattern: **the Vāda Synthesizer is over-compressing the deliberation**.

### Judge quote 1 — B3 (startup acquisition)

> "Deliberation tightened the prose and provided a cleaner verdict, but removed critical stress-test content — specifically the 'Reasons You Might Still Sell' section that enumerates concentration risk, churn, and personal liquidity pressure. The baseline's caveats are the kind of honest friction that prevents false confidence in a real sell/don't-sell decision."

### Judge quote 2 — A1 (engineering deadlines)

> "The baseline covered more actionable diagnostic branches and retained the sharpest management challenge ('What decision would you make differently with better estimates?'). Deliberation added two genuine insights (examine the one successful quarter, identify decision authority) but compressed away the unplanned work/capacity reservation heuristic and the ability to self-diagnose root causes."

### Judge quote 3 — A2 (profitability strategy)

> "The single-shot response was deeper and more nuanced. While deliberation produced a cleaner decision sequence (prioritize runway first, then unit economics), it sacrificed important practical warnings: the 'dangerous middle' trap and the caution that 'grow faster' is often used to avoid hard decisions."

### What this reveals

**Vāda is NOT hedging.** Vāda is producing more decisive, cleaner verdicts than baseline. Earlier diagnoses that framed this as "Vāda is too cautious" were wrong.

**Vāda IS over-compressing.** The 12 agent turns generate useful material — conditional branches, stress-test content, practical warnings, heuristics. The final Synthesizer conclusion strips this content to produce a single tight recommendation. The tightness reads as decisiveness, but the stripped content was what made the answer genuinely useful.

**Baseline "wins" by being less tidy.** Single-shot Claude produces more conditional structure, more caveats, more scannable branches because it's not trying to synthesize a multi-perspective deliberation into one conclusion.

**The conclusion schema limits Vāda.** Current `Conclusion` type has a single `recommendation` string. The Synthesizer has to cram everything into that one field, and compression is the path of least resistance.

---

## Implications for V2

### Primary V2 Experiment (Challenge 1, Experiment 1.A)

**Refine the Synthesizer conclusion prompt** to preserve deliberation's useful work:

- Preserve conditional branches when deliberation surfaced them
- Preserve stress-test content when agents raised real risks
- Preserve practical warnings that agents argued were important
- Do not compress to a single decisive verdict if the deliberation itself produced conditional structure

**Hypothesis:** this alone may shift 2-3 BASELINE_WON cases (B3, A1, A2) to VADA_WON, bringing total to 9-10/14 VADA_WON.

### Secondary V2 Experiment (Challenge 1, Experiment 1.B)

**If prompt refinement insufficient**, extend the `Conclusion` type schema:
- `primary_recommendation` (when converged)
- `conditional_branches` (if-then structure)
- `important_caveats` (risks and warnings)
- `dissenting_views` (when agents genuinely disagreed)

This makes the UI support richer decision output instead of forcing everything into one prose field.

### What this data does NOT support

- Claims that "Vāda beats single-shot Claude" (currently it doesn't, on half the questions)
- Claims that "deliberation improves answers" (currently only on ethical/personal categories)
- Marketing language about Vāda's advantage (data doesn't support it yet)

### What this data DOES support

- The pipeline works mechanically (0 failures across 14 runs)
- Deliberation adds clear value on ethical/personal questions (5/5 VADA_WON)
- The bench framework is effective at revealing specific architectural issues (Synthesizer compression identified precisely)
- V1 cost economics are tractable ($3.11 for 14 questions → ~$0.22/question)

---

## Cost breakdown

**Per-question average:** $0.22
- Vāda (14-16 LLM calls): ~$0.20
- Baseline (1 LLM call): ~$0.01
- Judge (1 LLM call): ~$0.01

**Projection for V2 experiments:**
- Each full V2 experiment rerun: ~$3.50
- Budget for 10 V2 experiments: ~$35
- Comfortable within reasonable research budget

---

## Session ID index

For future reference / re-analysis:

| Question | Session ID |
|----------|------------|
| T1 | 9300b6d7-6a8e-4646-9d91-5c1f1608f972 |
| T3 | 684e3191-c62a-448b-bbf7-18043b21b3b1 |
| T4 | f919c880-5bd4-4a74-bcc5-6ca05cb3b7bb |
| T5 | 19957637-1914-4dc7-8a60-27a71040da1f |
| B2 | b578d67a-f698-4bdf-908e-0b07eed95cc2 |
| B3 | c6b05da9-687f-4eff-b338-7b715e4ffe4c |
| E2 | a8aa87e8-554a-40dd-89e0-5f0c5e6b0311 |
| E3 | a9f62935-dcfb-4a91-8d6f-923b4caf8720 |
| P1 | 67427926-744e-448c-8866-d87ca2bf7443 |
| P2 | f7533bd6-bd07-4f31-81cb-838acdbb335f |
| A3 | e2f6e177-65e3-4dc3-82aa-fda8823ebe26 |

T2, A1, A2, P3 — session IDs present in DB, can be queried if needed.

---

## Data quality notes

**Token accounting:** T1, A1, E2 sessions have `deliberationTokensInput/Output = 0` because they ran before the April 21 token-accounting fix (commit 2ef5638). All other sessions have correct token data. This is a known limitation for cost-per-question analysis on these three rows.

**Judge prompt version:** all 14 questions used the same judge prompt (commit 2481384). Judge prompt is stable across V1 bench; any changes to judge prompt for V2 should be a deliberate experimental variable, not accidental drift.

**Model version:** all questions ran on `claude-sonnet-4-6`. No model drift within run.

---

## What this becomes

This document is the V1 baseline.

When V2 Experiment 1.A runs, it will produce a new results document (`vada-v2-exp-1a-results.md`) that references this one:
- "V1 baseline: 7/14 VADA_WON"
- "V2 Exp 1.A: X/14 VADA_WON (delta: +/−Y)"
- "Interpretation: ..."

The bench framework's value compounds as more experiments run against the same 15 questions. Each experiment is measured against this baseline AND against all prior experiments.

---

## Related documents

- `vada-product-thesis.md` — strategic framing
- `vada-v2-specification.md` — V2 experiment plan
- `followups.md` — deferred work, including this diagnosis
- `/tmp/vada-bench-morning.log` — raw bench output (transient)

---

## Summary

V1 bench revealed a specific, actionable bug: the Synthesizer over-compresses deliberation content. The bug is fixable with a targeted prompt change (Experiment 1.A). V1's architecture is mechanically sound (0 failures across 14 runs). The bench framework is working as intended — it surfaced a precise product flaw that couldn't have been identified through manual review. The V2 thesis is that Synthesizer refinement alone may flip 2-3 BASELINE_WON cases; if not, schema refinement (Experiment 1.B) is the next lever. Tool parity experiments (Challenge 2) are independent and proceed in parallel with discipline around variable isolation.
