# Followups

Deferred items. Add when decided-but-not-yet-done. Remove when done.

---

## Open

- [ ] Populate `SQLITE_RUN_1_SESSION_ID` and `SQLITE_RUN_2_SESSION_ID` in `scripts/bench/corpus.v2.reference.ts`. Task 1 left these as TODOs; Sonnet lacked DB access. Query DB for sessions containing the SQLite/PostgreSQL question text.

- [ ] Retrofit `drizzle/0008_damp_violations.sql` with `IF NOT EXISTS`, or adopt the convention for future migrations. Current file breaks if `db:migrate` runs against an environment where the table exists.

- [ ] Before Task 6 (Step 4) executes: write `apps/vada-ai/specs/step-4-precommit.md` with prior probability distribution + interpretation commitments. Template in spec §10.4. Commit before running Step 4.

- [ ] At Task 4 build: apply Round 4 prompt refinements (goal ranking, omission-is-failure, Retention Density metric, Hallucinatory Nuance watch-item). Content in spec §10.

- [ ] At Task 11 (Step 8): elevate E5 model diversity from optional to priority. Test Gemini's suggested config first. Content in spec §10.

- [ ] Report Fraunces macron bug upstream at github.com/undercasetype/Fraunces/issues (draft ready from earlier session).

---

## Closed

Move items here when done, or delete. Whichever.
