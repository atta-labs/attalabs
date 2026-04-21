# V2 Step 1 Analysis — A0 vs A1 Baseline Ceiling on Haiku 4.5

Generated: 2026-04-21

---

## Run metadata

| Field | Value |
|---|---|
| Test model | `claude-haiku-4-5-20251001` |
| Judge model | `claude-haiku-4-5-20251001` |
| Corpus | 15 questions (V2 corpus, frozen 2026-04-21) |
| Runs per variant | 3 (N=3) |
| Total baseline calls | 90 (45 A0 + 45 A1) |
| Total judge calls | 30 |
| Position mode | standard (2:1 A0-first for N=3) |

---

## Overall results (normalized to A1 vs A0)

| Verdict | Count | % |
|---|---|---|
| A1 won | 11 | 36.7% |
| A0 won | 19 | 63.3% |
| Tie | 0 | 0.0% |
| Negligible | 0 | 0.0% |
| Pipeline failure | 0 | 0.0% |
| **Total** | **30** | |

---

## Win rate by category

| Category | A1 won | A0 won | Tie/Neg | Total |
|---|---|---|---|---|
| Technical | 1 | 9 | 0 | 10 |
| Business | 1 | 3 | 0 | 4 |
| Ethical | 2 | 2 | 0 | 4 |
| Personal | 4 | 2 | 0 | 6 |
| Ambiguous | 3 | 3 | 0 | 6 |

---

## Per-question results

| ID | Category | Difficulty | Verdicts (N=3) |
|---|---|---|---|
| T1 | Technical | medium | A1:0 A0:2 tie:0 |
| T2 | Technical | easy | A1:1 A0:1 tie:0 |
| T3 | Technical | hard | A1:0 A0:2 tie:0 |
| T4 | Technical | easy | A1:0 A0:2 tie:0 |
| T5 | Technical | easy | A1:0 A0:2 tie:0 |
| B2 | Business | medium | A1:1 A0:1 tie:0 |
| B3 | Business | hard | A1:0 A0:2 tie:0 |
| E2 | Ethical | hard | A1:1 A0:1 tie:0 |
| E3 | Ethical | hard | A1:1 A0:1 tie:0 |
| P1 | Personal | medium | A1:1 A0:1 tie:0 |
| P2 | Personal | hard | A1:1 A0:1 tie:0 |
| P3 | Personal | hard | A1:2 A0:0 tie:0 |
| A1 | Ambiguous | hard | A1:1 A0:1 tie:0 |
| A2 | Ambiguous | hard | A1:1 A0:1 tie:0 |
| A3 | Ambiguous | medium | A1:1 A0:1 tie:0 |

---

## Variance across N=3

- Questions where all 3 runs agreed on verdict: **6** / 15
- Questions where at least 1 run disagreed: **9** / 15

---

## Haiku compliance

- A1 outputs that parsed as valid JSON: **0 / 45** (0.0%)
- A0 outputs (no JSON parsing expected): 45 (N/A)
- Refusals or truncations detected: P2 run 1: "```json
{
  "recommendation": "Not yet — do not accept the job offer in its current form. Instead, u"
  A3 run 1: "```json
{
  "recommendation": "Not yet. Before adding a paywall, you must diagnose *why* engaged use"

---

## Token economics

| Variant | Avg input | Avg output |
|---|---|---|
| A0 | 67 | 373 |
| A1 | 670 | 1550 |
| Judge | 2296 | 922 |

Total tokens — input: 102,072 / output: 114,161
Estimated cost: **$0.538** (Haiku pricing: ~$0.80/M input, ~$4/M output)

---

## Sample judge verdicts

### T2 (Technical) — A1_WON

> ... underlying conflict unresolved—the four engineers would still disagree afterward.

---

`DIAGNOSIS: A_WON — Response A provides a structured framework with branch conditions tied to observable signals and proposes an empirical spike to break team deadlock; Response B offers a quicker recommendation but no mechanism to resolve the stated four-engineer disagreement, making its decisiveness hollow.`

### B2 (Business) — A1_WON

> ...r with B's decisiveness: "Validate unit economics first. If margin-positive, move to usage-based immediately; if margin-negative, extend flat pricing and optimize LLM efficiency."

**DIAGNOSIS: A_WON — Response A surfaces critical risks (unit economics, metering readiness, cohort bias) and provides testable conditional triggers that Response B omits entirely, despite B's appealing directiveness.**

### T1 (Technical) — A0_WON

> ...team optimizing speed-to-market, A's "move fast, revisit later" is the right philosophy; B's risk register is premature.

---

DIAGNOSIS: A_WON — A provides decisive, well-calibrated guidance for immediate action; B's conditional branches and caveats hedge the recommendation without adding clarity, trading velocity (the stated constraint) for theoretical flexibility the Principal doesn't need yet.

---

## Outcome

_Interpretation pending Principal review._

A1 won 11 / 30 comparisons (36.7%) vs A0's 19 (63.3%).
A0 outperformed A1 — rich prompting did not improve over naive for Haiku 4.5. Flag before proceeding.
