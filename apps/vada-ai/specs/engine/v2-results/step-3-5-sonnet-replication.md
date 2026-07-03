# V2 Task 3.5 Analysis — Sonnet 4.6 Replication

Status: draft
Generated: 2026-04-22

---

## Purpose

Task 3.5 replicates V2 Steps 1 and 2 on Sonnet 4.6 to determine whether the Haiku 4.5 findings hold at a higher-capability model. Both test model and judge model use `claude-sonnet-4-6`. Results are compared directly to the Haiku 4.5 runs from Tasks 2 and 3.

---

## Data integrity note

A dedup key bug was discovered during this task: `getExistingV2JudgeResult` was keyed on `(question, systemADescription, runIndex)` without `comparisonType`. Because both `baseline-vs-baseline-sonnet` and `baseline-vs-vada-sonnet` place A0S in slot A for even-indexed runs using the same A0S description string, 14 Step 1 (baseline-vs-baseline-sonnet) pairs were silently skipped with false-positive resume hits. Fixed by adding `comparisonType` as a required 4th key. After fix, 9 duplicate rows from partial re-runs were removed and all 45 Step 1 pairs confirmed clean at N=3.

Prior Haiku data (baseline-vs-baseline: 48 rows, baseline-vs-vada: 21 rows) was unaffected — the Haiku A0/A1 description strings are distinct from the Sonnet A0S/A1S strings, so no cross-comparison collision occurred.

---

## Experiment configuration

| Field | Haiku (Steps 1–2) | Sonnet (Step 3.5) |
|---|---|---|
| Test model | `claude-haiku-4-5-20251001` | `claude-sonnet-4-6` |
| Judge model | `claude-haiku-4-5-20251001` | `claude-sonnet-4-6` |
| Corpus | 15 questions, frozen 2026-04-21 | same |
| Variants | A0, A1, B0 | A0S, A1S, B0S |
| N per variant | 3 (some Haiku Step 1 Q at N=4) | 3 |
| Position mode | standard | standard |
| Step 1 judge calls | 48 | 45 |
| Step 2 judge calls | 21 (7 of 15 Q) | 21 (same 7 Q) |

---

## Step 1 — Baseline ceiling: A0 vs A1

### Overall results

| Verdict | Haiku count | Haiku % | Sonnet count | Sonnet % |
|---|---|---|---|---|
| A1/A1S won | 21 | 43.8% | 25 | 55.6% |
| A0/A0S won | 27 | 56.3% | 17 | 37.8% |
| Tie | 0 | 0.0% | 3 | 6.7% |
| **Total** | **48** | | **45** | |

**Direction reversal.** Haiku: A0 wins narrowly. Sonnet: A1S wins clearly. Rich-prompted structured JSON output is preferred by the Sonnet judge but not the Haiku judge.

### Win rate by category

| Category | Haiku A1 | Haiku A0 | Haiku Tie | Haiku Total | Sonnet A1S | Sonnet A0S | Sonnet Tie | Sonnet Total |
|---|---|---|---|---|---|---|---|---|
| Technical | 6 | 9 | 0 | 15 | 4 | 10 | 1 | 15 |
| Business | 3 | 3 | 0 | 6 | 3 | 2 | 1 | 6 |
| Ethical | 1 | 6 | 0 | 7 | 6 | 0 | 0 | 6 |
| Personal | 7 | 4 | 0 | 11 | 7 | 2 | 0 | 9 |
| Ambiguous | 4 | 5 | 0 | 9 | 5 | 3 | 1 | 9 |

Notes: Haiku Ethical has 7 total because E2 has N=4 (one surplus run from pre-task re-runs). Haiku Personal has 11 total because P2 and P3 are N=4. All Sonnet categories are N=3 per question.

**Consistent across models:**
- Technical: A0/A0S leads on both (Haiku 9–6, Sonnet 10–4). Terse, direct answers win on clear-cut tech decisions.
- Personal: A1/A1S leads on both (Haiku 7–4, Sonnet 7–2). Structured branching output benefits personal/life-decision questions.

**Reversed across models:**
- Ethical: Haiku strongly prefers A0 (6–1, 85.7%); Sonnet strongly prefers A1S (6–0, 100%). Complete reversal.
- Business: Haiku ties (3–3); Sonnet slight A1S edge (3–2+1tie).
- Ambiguous: Haiku slight A0 edge (5–4); Sonnet slight A1S edge (5–3+1tie).

### Per-question results

| ID | Cat | Difficulty | Haiku (A1 / A0) | Sonnet (A1S / A0S / Tie) |
|---|---|---|---|---|
| T1 | Technical | medium | A1:2 A0:1 | A1S:1 A0S:2 tie:0 |
| T2 | Technical | easy | A1:1 A0:2 | A1S:0 A0S:3 tie:0 |
| T3 | Technical | hard | A1:2 A0:1 | A1S:0 A0S:3 tie:0 |
| T4 | Technical | easy | A1:0 A0:3 | A1S:2 A0S:1 tie:0 |
| T5 | Technical | easy | A1:1 A0:2 | A1S:1 A0S:1 tie:1 |
| B2 | Business | medium | A1:2 A0:1 | A1S:0 A0S:2 tie:1 |
| B3 | Business | hard | A1:1 A0:2 | A1S:3 A0S:0 tie:0 |
| E2 | Ethical | hard | A1:0 A0:4 | A1S:3 A0S:0 tie:0 |
| E3 | Ethical | hard | A1:1 A0:2 | A1S:3 A0S:0 tie:0 |
| P1 | Personal | medium | A1:3 A0:0 | A1S:2 A0S:1 tie:0 |
| P2 | Personal | hard | A1:2 A0:2 | A1S:3 A0S:0 tie:0 |
| P3 | Personal | hard | A1:2 A0:2 | A1S:2 A0S:1 tie:0 |
| A1 | Ambiguous | hard | A1:1 A0:2 | A1S:1 A0S:1 tie:1 |
| A2 | Ambiguous | hard | A1:2 A0:1 | A1S:3 A0S:0 tie:0 |
| A3 | Ambiguous | medium | A1:1 A0:2 | A1S:1 A0S:2 tie:0 |

Notable reversals:
- **E2** (data privacy): Haiku A0 sweeps 4–0, Sonnet A1S sweeps 3–0.
- **E3** (hiring AI bias): Haiku A0 wins 2–1, Sonnet A1S sweeps 3–0.
- **B3** (acquisition offer): Haiku A0 wins 2–1, Sonnet A1S sweeps 3–0.
- **T3** (DB bottlenecks): Haiku A1 wins 2–1, Sonnet A0S sweeps 3–0.
- **T2** (Next.js migration): Consistent A0 preference on both (2–1 Haiku, 3–0 Sonnet).
- **T4** (CI system): Haiku A0 sweeps 3–0; Sonnet A1S wins 2–1.

### Within-question consistency

| | Haiku | Sonnet |
|---|---|---|
| Questions unanimous (all 3 agree) | 3 / 15 | 7 / 15 |
| At least 1 run disagreed | 12 / 15 | 8 / 15 |

Sonnet judge is substantially more decisive — unanimous on nearly half the corpus.

---

## Step 2 — Orchestration test: A0 vs B0 (7-question subset)

Questions: T1, T3, T4, T5 (Technical), B3 (Business), A1, A2 (Ambiguous).

### Overall results

| Verdict | Haiku count | Haiku % | Sonnet count | Sonnet % |
|---|---|---|---|---|
| B0/B0S (Vāda) won | 3 | 14.3% | 5 | 23.8% |
| A0/A0S (single-shot) won | 18 | 85.7% | 15 | 71.4% |
| Tie | 0 | 0.0% | 1 | 4.8% |
| **Total** | **21** | | **21** | |

**Same direction, different magnitude.** A0/A0S dominates on both models. Sonnet's B0S win rate (23.8%) is higher than Haiku's B0 (14.3%), suggesting the orchestration overhead pays off slightly more on a stronger model — but A0S still wins 3:1.

### Win rate by category

| Category | Haiku B0 | Haiku A0 | Haiku Tie | Haiku Total | Sonnet B0S | Sonnet A0S | Sonnet Tie | Sonnet Total |
|---|---|---|---|---|---|---|---|---|
| Technical (4Q) | 1 | 11 | 0 | 12 | 1 | 11 | 0 | 12 |
| Business (1Q) | 1 | 2 | 0 | 3 | 1 | 1 | 1 | 3 |
| Ambiguous (2Q) | 1 | 5 | 0 | 6 | 3 | 3 | 0 | 6 |

Technical pattern is identical. Business and Ambiguous show more B0S wins on Sonnet.

### Per-question results

| ID | Cat | Haiku (B0 / A0) | Sonnet (B0S / A0S / Tie) | Shift |
|---|---|---|---|---|
| T1 | Technical | B0:0 A0:3 | B0S:0 A0S:3 | None |
| T3 | Technical | B0:1 A0:2 | B0S:1 A0S:2 | None |
| T4 | Technical | B0:0 A0:3 | B0S:0 A0S:3 | None |
| T5 | Technical | B0:0 A0:3 | B0S:0 A0S:3 | None |
| B3 | Business | B0:1 A0:2 | B0S:1 A0S:1 tie:1 | Near-tie on Sonnet |
| A1 | Ambiguous | B0:0 A0:3 | B0S:0 A0S:3 | None |
| A2 | Ambiguous | B0:1 A0:2 | B0S:3 A0S:0 | Complete reversal |

Technical category is entirely stable across models (8 of 12 A0S runs). **A2 ("not profitable — cut costs or grow faster?") is the sole complete reversal**: Haiku A0 wins 2–1; Sonnet B0S sweeps 3–0. B3 (acquisition offer) shifts from A0 win (2–1) to near-tie on Sonnet.

---

## Blind Critic behavior: B0 vs B0S terminal states

The V1 Vāda workflow includes a Blind Critic audit step. These terminal state breakdowns reflect how often the Synthesizer's first-pass conclusion passed vs. required revision.

| Terminal state | Haiku B0 (42 runs) | Haiku B0 on 7Q subset (21 runs) | Sonnet B0S (21 runs) |
|---|---|---|---|
| CLEAN | 18 (42.9%) | 3 (14.3%) | 15 (71.4%) |
| REVISED | 24 (57.1%) | 18 (85.7%) | 6 (28.6%) |
| UNCONVERGED | 0 | 0 | 0 |

Notes:
- The 42-run Haiku figure includes all B0 orchestration runs across the full 15-question corpus. The 7Q subset (used in judge comparisons) had a much higher REVISED rate (85.7%) — these 7 questions are harder, higher-stakes decisions with more legitimate caveats.
- Sonnet B0S is dramatically cleaner (71.4% CLEAN vs 14.3% for Haiku on the same 7 questions).
- The blind-critic-investigation.md (2026-04-21) documents the structural cause: Haiku's Synthesizer bleeds conditional clauses ("unless X, reconsider") into the `recommendation` field, triggering Rule 1 (Decisiveness Audit). Sonnet's Synthesizer confines caveats to `key_condition` and `unresolved_points`, passing the decisiveness check.
- On Haiku, 83.3% of REVISED flags were DECISIVENESS (recommendation hedged with unvalidated conditions); 16.7% were FALSE CONSENSUS (unresolved_points documented agent disagreement that the recommendation glossed over). No FORMAT or QUALITY flags.
- Sonnet's 6 REVISED runs have not been categorized, but the pattern is expected to be the same class of issues at lower frequency.

---

## Judge behavior patterns

### Tie rate

| Experiment | Haiku judge ties | Sonnet judge ties |
|---|---|---|
| Step 1 (45–48 pairs) | 0 / 48 (0.0%) | 3 / 45 (6.7%) |
| Step 2 (21 pairs) | 0 / 21 (0.0%) | 1 / 21 (4.8%) |
| Combined | **0 / 69** | **4 / 66** |

The Haiku judge never calls a tie. The Sonnet judge occasionally does (≈6% in Step 1). Ties appeared on: A1 run1, B2 run1, T5 run0 (Step 1); B3 run0 (Step 2).

### Judge output characteristics

The JUDGE_SYSTEM_PROMPT (stored in `useJudgeBenchmark.ts`) produces long structured markdown verdicts with explicit reasoning. The Sonnet judge produces longer, more nuanced verdicts on average. Both judges name the winner explicitly with a `DIAGNOSIS:` line. No judge output was malformed across either model's runs.

---

## Parse rates and compliance

| Metric | Haiku | Sonnet |
|---|---|---|
| A1/A1S valid JSON (Step 1) | 45 / 45 (100%) | 45 / 45 (100%) |
| A0/A0S outputs (no schema) | 45 (N/A) | 45 (N/A) |
| Refusals or truncations | 0 | 0 |
| B0/B0S terminal errors | 0 | 0 |

Both models achieved 100% A1/A1S parse rate. A1S output structure (branches, caveats, key_condition JSON) was fully valid on every Sonnet run.

---

## Token economics and cost

### Step 1 (A0/A0S vs A1/A1S)

| Variant | Haiku avg input | Haiku avg output | Sonnet avg input | Sonnet avg output |
|---|---|---|---|---|
| A0/A0S | 67 | 373 | 68 | 528 |
| A1/A1S | 670 | 1622 | 671 | 1341 |
| Judge | 2373 | 979 | 2262 | 819 |

| Model | Total input tokens | Total output tokens | Estimated cost |
|---|---|---|---|
| Haiku Step 1 | 147,088 | 136,786 | **$0.665** |
| Sonnet Step 1 | 135,076 | 120,937 | **$2.219** |

Sonnet's A1S outputs are shorter on average (1341 vs 1622 output tokens) despite similar input length — Sonnet is more concise at the same A1 prompt. Sonnet's judge outputs are also slightly shorter (819 vs 979). The 3.3× cost difference vs Haiku is driven by Sonnet's higher per-token price (~$15/M out vs ~$4/M out).

### Step 2 (A0/A0S + judge only; B0/B0S tokens counted in Vāda sessions)

| Variant | Haiku avg input | Haiku avg output | Sonnet avg input | Sonnet avg output |
|---|---|---|---|---|
| A0/A0S | 67 | 373 | 66 | 625 |
| Judge | 1318 | 800 | 1629 | 824 |

| Model | Total input tokens | Total output tokens | Estimated cost |
|---|---|---|---|
| Haiku Step 2 | 30,705 | 33,577 | **$0.159** |
| Sonnet Step 2 | 35,594 | 30,431 | **$0.563** |

Sonnet's A0S outputs are substantially longer than Haiku's A0 outputs (625 vs 373 tokens) even on the same questions — Sonnet produces more detailed single-shot responses. Sonnet's Step 2 judge inputs are also longer (1629 vs 1318), likely because it is comparing longer responses.

---

## Summary of findings

### Step 1 (Baseline ceiling)

| | Haiku | Sonnet |
|---|---|---|
| Winner | A0 (56.3%) | A1S (55.6%) |
| Direction | Naive > Structured | Structured > Naive |
| Ethical reversal | A0 6–1 | A1S 6–0 |
| Technical consistency | A0 9–6 | A0S 10–4 |
| Personal consistency | A1 7–4 | A1S 7–2 |
| Ties | 0 | 3 |
| Unanimous Q (all 3 agree) | 3/15 | 7/15 |

The A0 vs A1 advantage is model-dependent. Haiku's judge considers terse, direct answers better — structured JSON "buries the signal" (per judge verdicts). Sonnet's judge values the explicit branching and caveats for complex decisions, particularly ethical and high-stakes business questions.

### Step 2 (Orchestration test)

| | Haiku | Sonnet |
|---|---|---|
| Winner | A0 (85.7%) | A0S (71.4%) |
| Direction | Same | Same |
| B0/B0S wins | 3/21 (14.3%) | 5/21 (23.8%) |
| CLEAN first-pass rate | 14.3% on 7Q | 71.4% |
| A2 result | A0:2 B0:1 | B0S:3 A0S:0 |
| Technical stability | A0 wins all 4Q | A0S wins all 4Q |

A0/A0S wins in both cases. Sonnet's B0S produces better-quality conclusions (higher CLEAN rate) and is slightly more competitive against A0S, but the gap is still large: A0S wins 3 out of every 4 judgments.

The single complete reversal (A2: "not profitable — cut or grow?") on Sonnet suggests deliberation adds value for specific high-ambiguity questions when the model is capable enough to use multi-round debate constructively. The pattern does not generalize to Technical questions.
