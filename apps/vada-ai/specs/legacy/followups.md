# Followups

Status: draft

Deferred items. Add when decided-but-not-yet-done. Remove when done.

---

## Open

- [ ] Populate `SQLITE_RUN_1_SESSION_ID` and `SQLITE_RUN_2_SESSION_ID` in `scripts/bench/corpus.v2.reference.ts`. Task 1 left these as TODOs; Sonnet lacked DB access. Query DB for sessions containing the SQLite/PostgreSQL question text.

- [ ] Retrofit `drizzle/0008_damp_violations.sql` with `IF NOT EXISTS`, or adopt the convention for future migrations. Current file breaks if `db:migrate` runs against an environment where the table exists.

- [ ] Before Task 6 (Step 4) executes: write `apps/vada-ai/specs/step-4-precommit.md` with prior probability distribution + interpretation commitments. Template in spec §10.4. Commit before running Step 4.

-  [ ] Task 4 smoke test: verify content preservation on Haiku rewrite.
      Check key_condition + unresolved_points combined length vs V1
      Task 3 recommendation length on same questions. Substantial
      drop = Haiku is stripping rather than restructuring.
      Reviewer convergence (Round 6) flagged this as primary failure
      mode of the Task 4 fix.

- [ ] At Task 11 (Step 8): elevate E5 model diversity from optional to priority. Test Gemini's suggested config first. Content in spec §10.

- [ ] Report Fraunces macron bug upstream at github.com/undercasetype/Fraunces/issues (draft ready from earlier session).

- [ ] Dedup key collision bug: `getExistingV2JudgeResult` was missing `comparisonType` in key — caused cross-comparison false-positive resume hits when the same (question, slotA description, runIndex) appeared in both `baseline-vs-baseline-sonnet` and `baseline-vs-vada-sonnet`. Fixed in Task 3.5 Step 1 (added `comparisonType` as 4th required parameter). Audit confirmed prior Haiku data (baseline-vs-baseline, baseline-vs-vada) unaffected — Haiku A0/A1/B0 description strings are distinct from Sonnet A0S/A1S/B0S strings, so no collision occurred. 9 duplicate Sonnet Step 1 rows were removed; all 45 Step 1 + 21 Step 2 Sonnet pairs confirmed clean at N=3.

---

## Closed

Move items here when done, or delete. Whichever.
