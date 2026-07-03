# V2 Step 1 Analysis — A0 vs A1 Baseline Ceiling on Haiku 4.5

Status: draft

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
| Total judge calls | 48 |
| Position mode | standard (2:1 A0-first for N=3) |

---

## Overall results (normalized to A1 vs A0)

| Verdict | Count | % |
|---|---|---|
| A1 won | 21 | 43.8% |
| A0 won | 27 | 56.3% |
| Tie | 0 | 0.0% |
| Negligible | 0 | 0.0% |
| Pipeline failure | 0 | 0.0% |
| **Total** | **48** | |

---

## Win rate by category

| Category | A1 won | A0 won | Tie/Neg | Total |
|---|---|---|---|---|
| Technical | 6 | 9 | 0 | 15 |
| Business | 3 | 3 | 0 | 6 |
| Ethical | 1 | 6 | 0 | 7 |
| Personal | 7 | 4 | 0 | 11 |
| Ambiguous | 4 | 5 | 0 | 9 |

---

## Per-question results

| ID | Category | Difficulty | Verdicts (N=3) |
|---|---|---|---|
| T1 | Technical | medium | A1:2 A0:1 tie:0 |
| T2 | Technical | easy | A1:1 A0:2 tie:0 |
| T3 | Technical | hard | A1:2 A0:1 tie:0 |
| T4 | Technical | easy | A1:0 A0:3 tie:0 |
| T5 | Technical | easy | A1:1 A0:2 tie:0 |
| B2 | Business | medium | A1:2 A0:1 tie:0 |
| B3 | Business | hard | A1:1 A0:2 tie:0 |
| E2 | Ethical | hard | A1:0 A0:4 tie:0 |
| E3 | Ethical | hard | A1:1 A0:2 tie:0 |
| P1 | Personal | medium | A1:3 A0:0 tie:0 |
| P2 | Personal | hard | A1:2 A0:2 tie:0 |
| P3 | Personal | hard | A1:2 A0:2 tie:0 |
| A1 | Ambiguous | hard | A1:1 A0:2 tie:0 |
| A2 | Ambiguous | hard | A1:2 A0:1 tie:0 |
| A3 | Ambiguous | medium | A1:1 A0:2 tie:0 |

---

## Variance across N=3

- Questions where all 3 runs agreed on verdict: **3** / 15
- Questions where at least 1 run disagreed: **12** / 15

---

## Haiku compliance

- A1 outputs that parsed as valid JSON: **45 / 45** (100.0%)
- A0 outputs (no JSON parsing expected): 45 (N/A)
- Refusals or truncations detected: none

---

## Token economics

| Variant | Avg input | Avg output |
|---|---|---|
| A0 | 67 | 373 |
| A1 | 670 | 1622 |
| Judge | 2373 | 979 |

Total tokens — input: 147,088 / output: 136,786
Estimated cost: **$0.665** (Haiku pricing: ~$0.80/M input, ~$4/M output)

---

## Sample judge verdicts

### T1 (Technical) — A1_WON

> ...ntech—a regulated domain—and Response B's PCI-DSS caveat and Enterprise tier requirement are non-trivial omissions in A.

---

`DIAGNOSIS: B_WON — Response B provides actionable conditional branches, fintech-specific compliance warnings (PCI-DSS), and explicit scaling thresholds that Response A omits entirely, making it substantially more useful for a 3-person fintech team despite greater length.`

### T1 (Technical) — A1_WON

> ...on delay.

If forced to choose: **Response A for execution velocity, but only if you explicitly budget time for the compliance and observability costs that Response B mentions.**

---

`DIAGNOSIS: B_WON — Response B's fintech-specific caveats (compliance, observability costs, connection pooling bugs) are material omissions from A, justifying the added complexity despite A's superior decisiveness.`

### T1 (Technical) — A0_WON

> ... revisit if X happens), not a decision tree for year-2 scaling. Response B delivers that; Response A presents it as one of many branches.

---

`DIAGNOSIS: B_WON — Response B correctly prioritizes speed-to-market with tighter advice; Response A is thorough but over-engineers the decision for a pre-PMF 3-person team, obscuring the clear path forward with excessive caveats and conditional branches.`

---

## Outcome

_Interpretation pending Principal review._

A1 won 21 / 48 comparisons (43.8%) vs A0's 27 (56.3%).
A0 outperformed A1 — rich prompting did not improve over naive for Haiku 4.5. Flag before proceeding.
