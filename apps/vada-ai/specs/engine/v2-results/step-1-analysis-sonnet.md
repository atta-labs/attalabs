# V2 Step 3.5 Part 1 Analysis — A0S vs A1S Baseline Ceiling on Sonnet 4.6

Status: draft

Generated: 2026-04-22

---

## Run metadata

| Field | Value |
|---|---|
| Test model | `claude-sonnet-4-6` |
| Judge model | `claude-sonnet-4-6` |
| Corpus | 15 questions (V2 corpus, frozen 2026-04-21) |
| Runs per variant | 3 (N=3) |
| Total baseline calls | 90 (45 A0S + 45 A1S) |
| Total judge calls | 45 |
| Position mode | standard (2:1 A0S-first for N=3) |

---

## Overall results (normalized to A1S vs A0S)

| Verdict | Count | % |
|---|---|---|
| A1S won | 25 | 55.6% |
| A0S won | 17 | 37.8% |
| Tie | 3 | 6.7% |
| Negligible | 0 | 0.0% |
| Pipeline failure | 0 | 0.0% |
| **Total** | **45** | |

---

## Win rate by category

| Category | A1S won | A0S won | Tie/Neg | Total |
|---|---|---|---|---|
| Technical | 4 | 10 | 1 | 15 |
| Business | 3 | 2 | 1 | 6 |
| Ethical | 6 | 0 | 0 | 6 |
| Personal | 7 | 2 | 0 | 9 |
| Ambiguous | 5 | 3 | 1 | 9 |

---

## Per-question results

| ID | Category | Difficulty | Verdicts (N=3) |
|---|---|---|---|
| T1 | Technical | medium | A1S:1 A0S:2 tie:0 |
| T2 | Technical | easy | A1S:0 A0S:3 tie:0 |
| T3 | Technical | hard | A1S:0 A0S:3 tie:0 |
| T4 | Technical | easy | A1S:2 A0S:1 tie:0 |
| T5 | Technical | easy | A1S:1 A0S:1 tie:1 |
| B2 | Business | medium | A1S:0 A0S:2 tie:1 |
| B3 | Business | hard | A1S:3 A0S:0 tie:0 |
| E2 | Ethical | hard | A1S:3 A0S:0 tie:0 |
| E3 | Ethical | hard | A1S:3 A0S:0 tie:0 |
| P1 | Personal | medium | A1S:2 A0S:1 tie:0 |
| P2 | Personal | hard | A1S:3 A0S:0 tie:0 |
| P3 | Personal | hard | A1S:2 A0S:1 tie:0 |
| A1 | Ambiguous | hard | A1S:1 A0S:1 tie:1 |
| A2 | Ambiguous | hard | A1S:3 A0S:0 tie:0 |
| A3 | Ambiguous | medium | A1S:1 A0S:2 tie:0 |

---

## Variance across N=3

- Questions where all 3 runs agreed on verdict: **7** / 15
- Questions where at least 1 run disagreed: **8** / 15

---

## Sonnet compliance

- A1S outputs that parsed as valid JSON: **45 / 45** (100.0%)
- A0S outputs (no JSON parsing expected): 45 (N/A)
- Refusals or truncations detected: none

---

## Token economics

| Variant | Avg input | Avg output |
|---|---|---|
| A0S | 68 | 528 |
| A1S | 671 | 1341 |
| Judge | 2262 | 819 |

Total tokens — input: 135,076 / output: 120,937
Estimated cost: **$2.219** (Sonnet 4.6 pricing: ~$3/M input, ~$15/M output)

---

## Sample judge verdicts

### T1 (Technical) — A1S_WON

> ... materially more useful for a fintech team making an infrastructure commitment — the domain-specific caveats are where the real value lies, and Response B glosses over them.

DIAGNOSIS: A_WON — Response A's domain-specific conditional branches, PCI scope guidance, and concrete review triggers provide meaningfully more actionable depth for a fintech team making a production infrastructure decision.

### T4 (Technical) — A1S_WON

> ...e A** — the conditional branches with concrete signals and self-hosted runner guidance provide decision-framework value that B's quick-start YAML doesn't offset, especially since the YAML is a one-line web search away.

`DIAGNOSIS: A_WON — Response A's conditional branches, cost thresholds, and self-hosted runner guidance provide durable decision-making value that Response B's terse format omits.`

### T2 (Technical) — A0S_WON

> ...— but the JSON structure buries the signal and the hedged primary recommendation would likely extend rather than resolve the team's debate.

`DIAGNOSIS: A_WON — Response A delivers a clear, actionable recommendation with a usable decision framework; Response B's JSON format obscures its conclusions and its hedged primary recommendation would likely extend rather than resolve the team's paralysis.`

---

## Outcome

_Interpretation pending Principal review._

A1S won 25 / 45 comparisons (55.6%) vs A0S's 17 (37.8%).
A1S is the stronger baseline on Sonnet 4.6 — rich prompting adds value over naive.
