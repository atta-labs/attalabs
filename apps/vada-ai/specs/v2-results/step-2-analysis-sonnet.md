# V2 Step 3.5 Part 2 Analysis — A0S vs B0S Orchestration-Alone on Sonnet 4.6

Generated: 2026-04-22

---

## Run metadata

| Field | Value |
|---|---|
| Test model | `claude-sonnet-4-6` |
| Judge model | `claude-sonnet-4-6` |
| Corpus | 7 questions tested (of 15 total; B0S subset only) |
| Runs per config | 3 (N=3) |
| Total A0S baseline calls | 21 |
| Total B0S orchestration runs | 21 |
| Total judge calls | 21 |
| Position mode | standard (2:1 A0S-first for N=3) |

---

## Overall results (normalized to B0S vs A0S)

| Verdict | Count | % |
|---|---|---|
| B0S (Vāda) won | 5 | 23.8% |
| A0S (single-shot) won | 15 | 71.4% |
| Tie | 1 | 4.8% |
| Negligible | 0 | 0.0% |
| Pipeline failure | 0 | 0.0% |
| **Total** | **21** | |

---

## Win rate by category

| Category | B0S won | A0S won | Tie/Neg | Total |
|---|---|---|---|---|
| Technical | 1 | 11 | 0 | 12 |
| Business | 1 | 1 | 1 | 3 |
| Ethical | 0 | 0 | 0 | 0 |
| Personal | 0 | 0 | 0 | 0 |
| Ambiguous | 3 | 3 | 0 | 6 |

---

## Per-question results

| ID | Category | Difficulty | Verdicts (N=3) |
|---|---|---|---|
| T1 | Technical | medium | B0S:0 A0S:3 tie:0 |
| T2 | Technical | easy | — no B0S runs |
| T3 | Technical | hard | B0S:1 A0S:2 tie:0 |
| T4 | Technical | easy | B0S:0 A0S:3 tie:0 |
| T5 | Technical | easy | B0S:0 A0S:3 tie:0 |
| B2 | Business | medium | — no B0S runs |
| B3 | Business | hard | B0S:1 A0S:1 tie:1 |
| E2 | Ethical | hard | — no B0S runs |
| E3 | Ethical | hard | — no B0S runs |
| P1 | Personal | medium | — no B0S runs |
| P2 | Personal | hard | — no B0S runs |
| P3 | Personal | hard | — no B0S runs |
| A1 | Ambiguous | hard | B0S:0 A0S:3 tie:0 |
| A2 | Ambiguous | hard | B0S:3 A0S:0 tie:0 |
| A3 | Ambiguous | medium | — no B0S runs |

---

## Variance across N=3

- Questions where all 3 runs agreed on verdict: **5** / 7
- Questions where at least 1 run disagreed: **2** / 7

---

## B0S terminal state breakdown

| Terminal state | Count | % |
|---|---|---|
| CLEAN | 15 | 71.4% |
| REVISED | 6 | 28.6% |

---

## Token economics (A0S + judge only; B0S tokens counted inside Vāda sessions)

| Variant | Avg input | Avg output |
|---|---|---|
| A0S | 66 | 625 |
| Judge | 1629 | 824 |

Total tokens — input: 35,594 / output: 30,431
Estimated cost (A0S + judge only): **$0.563** (Sonnet 4.6 pricing: ~$3/M input, ~$15/M output)

---

## Sample judge verdicts

### T3 (Technical) — B0S_WON

> ... The Principal should act on Response A's recommendation, supplemented by Response B's SQL diagnostics for the 48–72 hour measurement sprint.

`DIAGNOSIS: A_WON — Response A's resource accounting ("16 engineer-weeks; Redis consumes 4–6") is the decisive analytical contribution missing from Response B, whose 8-week plan quietly recommends both Redis and a replica without addressing the constraint.`

### B3 (Business) — B0S_WON

> ...t $25–30M if NRR ≥110%, $15–18M if NRR <100%") is the single most actionable piece of analysis in either response, and it's absent from Response B. The founder needs to know which number to defend, not just that $8M is low.

---

`DIAGNOSIS: A_WON — Response A's NRR-conditional counter-offer range gives the founder a specific, actionable decision tree that Response B's cleaner presentation lacks.`

### T1 (Technical) — A0S_WON

> ...eat) could be appended as a two-sentence qualification; the rest of B is deliberation noise that should have been absorbed into a cleaner answer.

---

`DIAGNOSIS: A_WON — Response A delivers a concrete, architecturally specific recommendation with actionable fintech-specific warnings, while Response B exposes unresolved internal deliberation that undermines rather than enhances the final answer.`

---

## Outcome

A0S single-shot outperformed B0S (Vāda on Sonnet): 15/21 (71.4%) vs 5/21 (23.8%). Orchestration overhead did not pay off on Sonnet 4.6.

_Interpretation pending Principal review._
