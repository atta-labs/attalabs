# Blind Critic Investigation — Step 2 REVISED Rate
Generated: 2026-04-21

---

## Test context

- 21 B0 runs on Haiku 4.5 (`claude-haiku-4-5-20251001`): 7 questions × N=3
- Questions: T1, T3, T4, T5, B3, A1, A2 (the V1-loss subset)
- Results: **18 REVISED (85.7%)**, 3 CLEAN (14.3%)
- The 3 CLEAN runs: T3/run-0, A1/run-2, A2/run-1 (one CLEAN per question on T3, A1, A2 only)
- T1, T4, T5, B3 went REVISED on all 3 runs (100% REVISED rate)

---

## Key structural finding: audit phase not in transcript entries

The Blind Critic verdict is stored in `conclusions.critic_verdict`, not as a transcript entry with agent="Blind Critic". The `transcript_entries` table only contains rows from the 3 debate rounds (agent values: Strategist, Critic, Devil's Advocate, Synthesizer in rounds 1-3). The synthesize/audit/revise/reaudit content lives in `conclusions.original_json`, `conclusions.revised_json`, `conclusions.critic_verdict`, and `conclusions.critic_re_verdict`.

The `critic_verdict` column stores the full Blind Critic objection text. All 18 REVISED runs had their full objection text recovered from this column.

---

## Reason distribution (N=18)

| Category | Count | % | Primary pattern |
|---|---|---|---|
| **DECISIVENESS** | 15 | 83.3% | "Does not directly answer the question" — recommendation hedges with conditionals, defers to future validation, or says "it depends" |
| **UNRESOLVED CONSENSUS** | 3 | 16.7% | "False consensus" — recommendation papers over agent disagreement without resolving it; flagged as `unresolved_points` |
| QUALITY | 0 | 0% | — |
| FORMAT | 0 | 0% | — |
| OTHER | 0 | 0% | — |

**All 18 REVISED runs were flagged under Rule 1 (Decisiveness Audit) or the Logic Audit (false consensus in `unresolved_points`).** Not one was flagged for format, schema, or factual error.

### DECISIVENESS pattern detail (15/18)

The Blind Critic prompt (Rule 1) requires: "If the Principal asked 'Should I do X?', the recommendation must commit to a position (Yes, No, Not yet, or a specific alternative)."

Haiku 4.5's Synthesizer consistently produced conclusions that:
1. Opened with an apparent commitment ("Yes, use GitHub Actions", "No, do not sell at $8M")
2. Immediately qualified it with conditions the Principal hadn't validated
3. Provided "it depends" decision trees rather than single committed positions

Example paraphrases:
- **T4**: "Yes, use GitHub Actions — but only if your pipeline is straightforward; revisit if builds exceed 5 minutes"
- **T5**: "Yes, use PostgreSQL — unless your workload is write-heavy, schema evolves weekly, or queries are document lookups; clarify first"
- **B3**: "No, do not sell at $8M — counter at $12-15M; but if burn accelerates or growth is fragile, $8M may be rational"
- **T1**: "Yes, build on Vercel+Neon+CF — however, if you are building a regulated payment processor, neither stack applies; clarify your product type first"
- **A2**: "Not yet — you must establish runway and contribution margin before choosing; if runway < 6 months, cut costs; if positive margin, grow"
- **T3**: "Not yet — diagnose your bottleneck first; if read-heavy, add Redis; if write-heavy, escalate"

### FALSE CONSENSUS pattern detail (3/18)

- **A1/run-0**: Critic flagged that `unresolved_points` documented agent disagreement on parallel intervention vs. diagnosis-first, but the `recommendation` treated one path as settled
- **A1/run-1**: Critic flagged that recommendation assumed Principal had veto authority over management, which `unresolved_points` documented as unresolved
- **B3/run-2**: Critic flagged that `unresolved_points` explicitly documented Critic vs. Strategist disagreement that was not resolved in the recommendation

---

## Pre/post revision patterns

Based on comparing `original_json.recommendation` vs `revised_json.recommendation` for all 18 REVISED runs:

| Pattern | Count | % |
|---|---|---|
| **Verbose — same direction, tighter phrasing** | 11 | 61% |
| **Degraded — more hedges, parallel conditionals** | 4 | 22% |
| **Substantive — direction actually changed** | 3 | 17% |

### Detail

**Verbose / tighter (11/18):** The revision step mostly trimmed qualifiers and removed the conditional escape clauses that triggered the flag. The recommendation direction did not change but became more declarative. Examples:
- T4/run-0: Original included "Migrate to CircleCI only if genuine bottleneck"; revised removed escape clause, kept "Yes, GitHub Actions"
- T5/run-1: Original said "PostgreSQL... if queries are aggregations and JOINs"; revised removed conditional, kept "Yes, PostgreSQL"
- A1/run-1: Original was vague about what to tell management; revised added explicit "Tell management directly"

**Degraded (4/18):** The revision step introduced a different form of hedge. Three T1 runs ended with revised recommendations that were "Not yet — answer three questions first", replacing the original "Yes, Vercel+Neon+CF" — a direction reversal that added rather than removed conditionality. One B3 run similarly moved from a conditional "No" to a more hedged "Not yet."

**Substantive (3/18):** Three runs genuinely changed direction:
- T1/run-2: Original said "Yes, Vercel+Neon+CF decisively"; revised said "Not yet — answer three questions" (direction reversed)
- T3/run-2: Original said "Yes, Redis caching immediately"; revised said "Not yet, diagnose first" (action reversed)
- T4/run-2: Original said "Yes, GitHub Actions"; revised said "Not yet, clarify pipeline first" (committed answer reversed to hedge)

The revision step produced PASS on re-audit in 3/18 cases (A2/run-2, B3/run-0, T5/run-2) and FAIL (REVISED terminal, re-verdict still FLAG) in 15/18 cases.

---

## V1 Sonnet comparison (same 7 questions)

The DB contains 9 Sonnet 4.6 (`claude-sonnet-4-6`) TERMINAL sessions on the 7 V1-loss questions.

### Sonnet REVISED/CLEAN rate

| Question | Sonnet terminal state |
|---|---|
| B3 | CLEAN (criticVerdict=PASS) |
| T1 (run-a) | CLEAN (criticVerdict=PASS) |
| T1 (run-b) | REVISED |
| A1 (run-a) | CLEAN (criticVerdict=PASS) |
| A1 (run-b) | CLEAN (criticVerdict=PASS) |
| T5 | CLEAN (criticVerdict=PASS) |
| T4 | CLEAN (criticVerdict=PASS) |
| T3 | REVISED |
| A2 | CLEAN (criticVerdict=PASS) |

**Sonnet: 2 REVISED / 9 sessions = 22.2%**
**Haiku 4.5: 18 REVISED / 21 sessions = 85.7%**

Note: Sonnet sessions are not from a controlled N=3 bench run — they are user-triggered sessions and may represent different session conditions. The rate is directionally informative but not a clean apples-to-apples comparison.

### Sample Sonnet Blind Critic audit texts

**B3 — PASS (no objection):** Audit output was "PASS" (not available as separate entry; conclusion.critic_verdict = "PASS"). The Sonnet-produced B3 conclusion earned PASS without revision.

**T4 — CLEAN, PASS excerpt:**
> "Why are you even considering CircleCI? You're a 4-person team fully on GitHub. The burden of proof is entirely on CircleCI... Use GitHub Actions. The only reason to revisit this is if you have a specific, named technical requirement that Actions demonstrably cannot meet."

The Sonnet audit made its PASS decision against a conclusion that was less hedged. The Sonnet Synthesizer produced a cleaner "Yes, GitHub Actions" without the "unless pipeline is complex" escape clause that Haiku 4.5 added.

**A1 — CLEAN, PASS excerpt:**
> "Management is diagnosing a measurement problem when you have an execution problem. Stricter estimation doesn't deliver software — it just produces more precisely documented failures... Run a capacity audit first. Track where hours actually go for two weeks."

The Sonnet audit flagged this as PASS — the Sonnet Synthesizer produced a firm "No, don't add stricter estimation; do a capacity audit instead" without the authority-assumption hedge that Haiku triggered.

**T1 — REVISED (one of two Sonnet T1 runs):**
The Sonnet critic flagged the T1 conclusion for `unresolved_points` (false consensus on fintech compliance scope) — same class of issue as Haiku, but the Sonnet Synthesizer produced fewer DECISIVENESS flags. The Sonnet flag was about the `unresolved_points` documenting genuine disagreement, not about the recommendation itself hedging.

### Pattern difference vs. Haiku

Sonnet's Synthesizer produced unconditional primary recommendations more reliably. When Haiku 4.5 hedged with "unless X is true", Sonnet more often wrote "Yes, do X" and moved the caveat to `key_condition` or `unresolved_points` — which is the correct schema location for that information. The Blind Critic prompt specifically forbids hedging in the `recommendation` field, so Sonnet's structural choice to confine caveats to auxiliary fields avoided the DECISIVENESS flag.

---

## Interpretation (evidence-only)

**The critic is firing on a real structural pattern, not noise.** Haiku 4.5's Synthesizer consistently places conditional clauses ("unless X", "if Y, reconsider", "clarify Z first") inside the `recommendation` field itself. The Blind Critic prompt's Rule 1 is correctly triggered by this: the recommendation does not commit to a position when it hedges with unvalidated conditions that could reverse the answer.

**This is partly a real quality issue, partly a style divergence.** The underlying content of Haiku's conclusions is frequently sound — the recommendation direction is usually defensible. The problem is structural: caveats that belong in `key_condition` or `unresolved_points` are bleeding into the `recommendation` string. Sonnet appears to have learned the correct schema behavior (confine caveats to auxiliary fields, keep `recommendation` unconditional). Haiku 4.5 has not.

**The 85.7% REVISED rate is therefore not evidence that Haiku produces qualitatively wrong conclusions.** It is evidence that Haiku's output format does not match the Blind Critic's decisiveness standard, even when the substantive analysis is reasonable. The 4 degraded revisions and 15/18 re-audit failures confirm the revision step often fails to correct the structural issue (Haiku re-adds hedges in revision too).

**B3, T1, T4, T5 went 3/3 REVISED:** These are questions where the "correct" answer has important caveats (fintech compliance, growth durability, pipeline complexity, query shape). Haiku surfaced those caveats prominently in the recommendation field. Sonnet moved them to auxiliary fields.

---

## Task 4 prompt engineering implications

Based on the data:

1. **The Synthesizer prompt needs a structural constraint on the `recommendation` field.** The current prompt says "commit to a position" but does not explicitly say "all caveats must go in `key_condition` or `unresolved_points` — not in `recommendation`." Adding that rule explicitly would likely fix the primary failure mode without changing Haiku's analytical quality.

2. **The revision prompt's instruction to "address the auditor's specific concern" is insufficient.** Haiku's revisions frequently re-introduce hedges in a different form (4/18 degraded), suggesting it understands the objection but reverts to its default hedging style. The revision prompt needs to explicitly instruct: "The `recommendation` field must start with Yes, No, or Not yet and contain NO conditional clauses. Move all caveats to `key_condition`."

3. **"Not yet" as a legitimate answer needs explicit positioning.** Haiku uses "Not yet" correctly in some cases (T3 diagnosis-first is genuinely right) but the critic flags it as hedging when it's accompanied by a decision tree. The prompt could clarify: "'Not yet' is valid ONLY if the answer is that more information is required BEFORE the deliberation, not as a way to embed conditional logic in the recommendation."

4. **The false-consensus pattern (3/18) requires a different fix.** When agents genuinely disagree, Haiku's Synthesizer picks one side without stating it chose. The prompt should instruct: "If the transcript shows unresolved disagreement, acknowledge it by naming the chosen position and explaining why this side was chosen, not by papering over it."

---

## Flags

- **V1 Sonnet data is not a controlled bench:** The 9 Sonnet sessions in the DB were user-triggered at different times under different conditions, not a systematic N=3 run on the 7 V1-loss questions. The 22.2% REVISED rate is directionally informative but not statistically comparable to the Haiku 85.7% from the controlled B0 bench.
- **Audit content recovery:** The Blind Critic's output text is stored in `conclusions.critic_verdict` (as a FLAG: ... string), not as a transcript entry with agent="Blind Critic". The transcript_entries table only covers debate rounds 1-3. This was confirmed by checking agent names across 18 sessions — no "Blind Critic" or "Audit" agent name appeared.
- **Revision step success rate:** Only 3/18 (16.7%) re-audits returned PASS. The remaining 15 were REVISED terminal state regardless of re-verdict (by design: `reaudit` phase always sets terminalState=REVISED per the engine's turn-logic). The re-verdict captures whether the revision fixed the issue — 3 PASS means 15% of revisions produced a conclusion the critic would accept; 85% did not.
- **No runs ended in UNCONVERGED or ERROR.** All 21 runs completed cleanly as CLEAN or REVISED.
