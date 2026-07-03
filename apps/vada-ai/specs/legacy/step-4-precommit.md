# Step 4 Pre-Commitment — The Existential Test

Status: retired

**Commit to repo as `apps/vada-ai/specs/step-4-precommit.md` BEFORE running Task 6. Once committed, cannot be modified.**

Purpose: lock interpretation criteria before seeing results. Prevents post-hoc narrative rescue.

---

## Test design

**Step 4 (Task 6):** A1 (rich single-shot Haiku) vs B1 (V2 Vāda with rich schema + strengthened prompts on Haiku).

Full corpus (15 questions, T2 excluded as V1 null baseline). N=5 per question. 75 comparisons. Neutral V2 judge (Haiku). Position alternated.

**What this tests:** does orchestrated deliberation add quality beyond a well-prompted single LLM call on the same model? Existential question — if B1 ≈ A1, thesis fails.

---

## Evidence base (what I already know)

**Task 2 (A0 vs A1 baseline ceiling on Haiku):**
- A0 won 27/48 (56.3%) vs A1 21/48 (43.8%)
- Rich prompting is not uniformly better than naive on Haiku
- Per-category pattern: A1 wins Personal (7:4), loses Ethical (1:6) and Technical (6:9)

**Task 3 (A0 vs B0 orchestration alone on Haiku):**
- A0 won 18/21 (85.7%) vs B0 3/21 (14.3%)
- Terminal state: 85.7% REVISED (Blind Critic fired revision on 18 of 21 B0 runs)
- Architecture integrity: 100% schema parse, 0% persona collapse, personas distinct
- V1 Vāda on Haiku is worse than naive Haiku on V1-loss subset

**Blind Critic investigation (post-Task 3):**
- 15/18 REVISED: DECISIVENESS — Haiku placed conditional clauses in `recommendation` field instead of `key_condition`/`unresolved_points`
- 3/18 REVISED: FALSE CONSENSUS — unresolved_points documented disagreement the recommendation papered over
- 0/18: quality, format, or factual errors
- Sonnet comparison on same 7 questions: 2/9 REVISED (22.2%). Same critic, different model.
- Diagnosis: Haiku has a specific schema compliance failure, not a quality or style issue

**Round 6 reviewer pre-mortem:**
- All three (Gemini, Grok, ChatGPT) converged on content-stripping failure mode
- Concern: Haiku will satisfy the syntactic "no conditionals in recommendation" constraint by deleting content rather than restructuring it
- Surface compliance (schema passes, REVISED rate drops) but degraded quality (generic recommendations, stripped nuance)

---

## Prior probability distribution

I commit these prior beliefs. Sum to 100%.

**Incorporating Task 2 + Task 3 + Blind Critic investigation + Round 6 reviewer pre-mortem:**

- **B1 > A1 by ≥10pp** (orchestration meaningfully wins): **25%**
  - Task 4 prompt fix could plausibly address the specific 15/18 decisiveness failure identified in investigation
  - Rich schema gives Haiku proper fields for conditions (key_condition, unresolved_points)
  - But requires fix to work without triggering content-stripping failure mode

- **B1 ≈ A1, B1 has structural advantages** (lower variance, higher info gain, category-specific wins): **15%**
  - Fewer REVISED loops → lower runtime variance
  - If critic fires less, revision-induced degradation disappears
  - Information gain could be real even if aggregate win rate is tied

- **B1 ≈ A1, no measurable advantages**: **20%**
  - Content-stripping scenario: schema compliance improves, actual quality matches A1
  - Numbers similar, no structural differentiation worth productizing

- **B1 < A1 by <10pp**: **20%**
  - Content-stripping actively hurts: stripped recommendations less useful than rich A1 output
  - Reviewer-flagged "overfitting to constraint" produces worse decisions

- **B1 << A1 by ≥10pp** (orchestration actively harms): **20%**
  - Catastrophic scenario. Less likely than pre-investigation priors suggested (30% → 20%) given known fixable cause
  - But still real: content-stripping + other Haiku quirks could compound

---

## Interpretation commitments (locked in advance)

### If B1 > A1 aggregate by ≥10pp
**Interpretation:** Thesis validated on Haiku.
**Action:** Proceed to Step 5 (calibration), Step 6 (variance), Step 11 (capability ladder).
**Will NOT:** Dismiss as "too easy." If priors said 25% and data says confirmed, update toward validation.

### If B1 ≈ A1 (±10pp), B1 shows structural advantages
**Interpretation:** Product redefined. Not "better answers," but "more reliable / auditable / higher info gain."
**Action:** Product redefinition memo. Pivot before launch.
**Structural advantages that must be present in data:**
- Lower variance across 5 runs (measured)
- Higher information gain scores (measured)
- Lower Hallucinatory Nuance rate (Richness high + Logic Audit low)
- Category-specific wins (Ethical, Personal)
**Will NOT:** Redefine without checking advantages actually exist. If B1 ≈ A1 AND no structural advantages, that's falsification not redefinition.

### If B1 ≈ A1, no structural advantages
**Interpretation:** Thesis falsified on Haiku.
**Action:** Pause. Decide:
  - (a) §10.6 Sonnet retest. If Sonnet gains exist, Haiku was the limit — V2 on Haiku invalid, redo on Sonnet.
  - (b) Accept falsification. Pivot product or kill.
**Will NOT:** Iterate prompts for another round. Six rounds of reviewer prompts + investigation + fix failed; seventh won't work.

### If B1 < A1 by <10pp
**Interpretation:** Orchestration adds noise on Haiku. Ambiguous — could be content-stripping, could be residual capability floor.
**Action:** §10.6 Sonnet retest MANDATORY.
- If Sonnet B1 > A1 clearly → Haiku was issue
- If Sonnet also B1 < A1 → architecture genuinely suspect
**Will NOT:** Handwave as "close to break-even" and launch.

### If B1 << A1 by ≥10pp (orchestration harms)
**Interpretation:** On Haiku, more deliberation = worse output.
**Action:** Sonnet retest immediately.
- Sonnet confirms B1 << A1 → architecture is false
- Sonnet B1 > A1 → product is Sonnet-only, launch on that basis
**Will NOT:** Conclude "Vāda is dead" before Sonnet retest. Only falsifies Haiku-V2.

---

## Content-stripping watch item (Round 6 flagged)

**Must check during analysis, regardless of aggregate outcome:**

- Combined length of `key_condition` + `unresolved_points` in B1 conclusions vs V1 Task 3 B0 `recommendation` length on overlapping questions
- Substantial drop → Haiku stripped content rather than restructured it
- Manual read of 3 B1 conclusions: does recommendation feel like committed decision, or generic boilerplate?

**If content-stripping is detected:**
- Note in analysis that surface schema compliance doesn't equal semantic compliance
- Do NOT count "B1 wins aggregate but strips content" as validation
- This belongs in the "B1 ≈ A1, no structural advantages" bucket even if numbers favor B1

---

## Watch items — do NOT move goalposts

These observations do NOT change interpretation framework above:

- Judge verdict variance (already known, factored in)
- Persona collapse (kill criterion, not interpretation shift)
- Blind Critic firing frequency (Task 3 showed this; Task 4 should address)
- Per-category variation (acknowledged; aggregate is the gate)
- Round 6 reviewer pre-mortem details (inform smoke test, not Task 6 interpretation)

**If new failure modes appear during Task 6:** stop, document, before analyzing results. Do not let "I noticed X weird thing" become reason to reinterpret aggregate data.

---

## Decision flip-count cap

Once Task 6 data is analyzed, the first interpretation I write stands. If I flip more than once in review, I am rationalizing. Stop at first, commit, move forward.

---

## Sonnet retest trigger (§10.6)

**MANDATORY** if any:
- B1 ≈ A1 aggregate (within 10pp either way)
- B1 < A1 by <10pp
- Content-stripping detected (regardless of aggregate outcome)
- Any evidence Haiku capability is the limiting factor

**Design:** Same prompts, same schema, same judge. Sonnet swapped for Haiku on agents. 5-question subset (cost control).
- Sonnet B1 > A1 meaningfully → Haiku was floor, V2 architecture valid
- Sonnet shows same pattern as Haiku → architecture issue, not model issue

---

## Principal signature

Dani (Principal), committed before Task 6 execution. Cannot be modified once committed. Impulse to re-open = signal of rationalization; close the impulse, respect the commitment.

Date: 2026-04-21
Commit hash: [LOGGED IN FOLLOW-UP]
