# V2 Step 2 Analysis — A0 vs B0 Orchestration-Alone on Haiku 4.5

Generated: 2026-04-21

---

## Run metadata

| Field | Value |
|---|---|
| Test model | `claude-haiku-4-5-20251001` |
| Judge model | `claude-haiku-4-5-20251001` |
| Corpus | 15 questions (V2 corpus, frozen 2026-04-21) |
| Runs per config | 1 (N=3) |
| Total A0 baseline calls | 45 |
| Total B0 orchestration runs | 21 |
| Total judge calls | 21 |
| Position mode | standard (2:1 A0-first for N=3) |

---

## Overall results (normalized to B0 vs A0)

| Verdict | Count | % |
|---|---|---|
| B0 (Vāda) won | 3 | 14.3% |
| A0 (single-shot) won | 18 | 85.7% |
| Tie | 0 | 0.0% |
| Negligible | 0 | 0.0% |
| Pipeline failure | 0 | 0.0% |
| **Total** | **21** | |

---

## Win rate by category

| Category | B0 won | A0 won | Tie/Neg | Total |
|---|---|---|---|---|
| Technical | 1 | 11 | 0 | 12 |
| Business | 1 | 2 | 0 | 3 |
| Ethical | 0 | 0 | 0 | 0 |
| Personal | 0 | 0 | 0 | 0 |
| Ambiguous | 1 | 5 | 0 | 6 |

---

## Per-question results

| ID | Category | Difficulty | Verdicts (N=3) |
|---|---|---|---|
| T1 | Technical | medium | B0:0 A0:3 tie:0 |
| T2 | Technical | easy | B0:0 A0:0 tie:0 |
| T3 | Technical | hard | B0:1 A0:2 tie:0 |
| T4 | Technical | easy | B0:0 A0:3 tie:0 |
| T5 | Technical | easy | B0:0 A0:3 tie:0 |
| B2 | Business | medium | B0:0 A0:0 tie:0 |
| B3 | Business | hard | B0:1 A0:2 tie:0 |
| E2 | Ethical | hard | B0:0 A0:0 tie:0 |
| E3 | Ethical | hard | B0:0 A0:0 tie:0 |
| P1 | Personal | medium | B0:0 A0:0 tie:0 |
| P2 | Personal | hard | B0:0 A0:0 tie:0 |
| P3 | Personal | hard | B0:0 A0:0 tie:0 |
| A1 | Ambiguous | hard | B0:0 A0:3 tie:0 |
| A2 | Ambiguous | hard | B0:1 A0:2 tie:0 |
| A3 | Ambiguous | medium | B0:0 A0:0 tie:0 |

---

## Variance across N=3

- Questions where all 3 runs agreed on verdict: **4** / 7
- Questions where at least 1 run disagreed: **3** / 7

---

## B0 terminal state breakdown

| Terminal state | Count | % |
|---|---|---|
| REVISED | 18 | 85.7% |
| CLEAN | 3 | 14.3% |

---

## Token economics (A0 + judge only; B0 tokens counted inside Vāda sessions)

| Variant | Avg input | Avg output |
|---|---|---|
| A0 | 67 | 373 |
| Judge | 1318 | 800 |

Total tokens — input: 30,705 / output: 33,577
Estimated cost (A0 + judge only): **$0.159** (Haiku pricing: ~$0.80/M input, ~$4/M output)

---

## Sample judge verdicts

### T3 (Technical) — B0_WON

> ..._WON — Response A correctly identifies the critical flaw in Response B's read-replica assumption (silent failure if writes dominate the bottleneck) and refuses to recommend without diagnosis, whereas Response B risks wasting 2-3 weeks on the wrong tool despite superficial pragmatism; however, Response B's actionability partially mitigates this, placing it as a narrow loss rather than clear defeat.

### B3 (Business) — B0_WON

> ...three questions as a due-diligence checklist, then execute Response A's counter-offer only once those answers are confirmed positive.

---

DIAGNOSIS: B_WON — Response B surfaces critical assumption-dependencies (Series A fundability, team capacity, founder motivation) that Response A takes as given, providing a more risk-aware decision framework appropriate for a high-stakes acquisition decision.

### T1 (Technical) — A0_WON

> ...closing question—is exactly right. Response B's internal debate and unresolved points feel like a thinking-out-loud session, not a recommendation.

---

**DIAGNOSIS: A_WON — Response A delivers the same core recommendation with superior clarity and actionability, while Response B's added depth on compliance is outweighed by noise and unresolved speculation that doesn't help the Principal decide.**

---

## Outcome

A0 single-shot outperformed B0 (Vāda on Haiku): 18/21 (85.7%) vs 3/21 (14.3%). Orchestration overhead did not pay off on Haiku 4.5.

_Interpretation pending Principal review._
