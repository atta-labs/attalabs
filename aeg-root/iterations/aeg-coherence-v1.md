# Iteration: aeg-coherence-v1 — June–July 2026
Lifecycle: active

Goal: Make governance coherence machine-derived — code↔doc (doc-owners + verify-docs C5)
and plan↔forge (verify-coherence oracle) — enforced deterministically, surfaced in Studio.
Ownership declared in `aeg-root/doc-owners`; plan↔forge drift detected by
`scripts/verify-coherence.ts`; both seams dormant when nothing is declared; grown
incrementally per task.

**Va dispatches ahead of T2–T5** (Principal priority: plan↔forge oracle is the top
development priority for this iteration).

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| #  | Task                                                                                                                                | Issue | Project(s) | Depends-on        | Conflicts-with |
|----|-------------------------------------------------------------------------------------------------------------------------------------|-------|------------|-------------------|----------------|
| Va | `verify-coherence.ts` — deterministic plan↔forge coherence oracle; zero LLM calls; checks A1/A2/A3 (merge↔close), T1/T2/T3 (topology), D1 (deps), L1/L2/L3 (lifecycle), N1/N2/M1/M2/M3 (delegated to T2); JSON + human report; CI-runnable. **Dispatch-first — priority over T2–T5.** | #229  | aeg        | #214              | —              |
| Vb | Studio "Check Coherence" button (renders Va's oracle live, green/list-of-incoherences) + fix stale iteration-file render (same force-dynamic / fresh-read fix as PR #200/#201) | #230  | aeg        | #229              | —              |
| 1  | Coherence seam: `aeg-root/doc-owners` file (code→doc bindings) + `verify-docs` C5 coverage gate + `Doc-ack`/`Doc-waiver` PR-body fields + D-062 full entry | #214  | aeg        | —                 | —              |
| 2  | Enforcement hardening: decision-number integrity + manifest validity + completeness scoreboard (reserves D-063)                     | #217  | aeg        | #214              | —              |
| 3  | Bind-all + staleness audit: drive linkage to 100%, emit fix punch-list                                                              | #218  | aeg        | #217              | —              |
| 4  | Planner §7 auto-derivation from `doc-owners`                                                                                        | #219  | aeg        | #218              | —              |
| 5  | Coherence completeness verification (100% gate)                                                                                     | #220  | aeg        | #219, #218, 6…n   | —              |

## Backlog (this iteration, not yet dispatched)

- **Fix punch-list (tasks 6…n) — spawned by task 3.** The staleness audit in task 3 (#218) emits one new Issue per contradiction it finds between a newly-bound doc and `D-001 … D-063`. Those Issues are the iteration's fix punch-list and must all close before task 5 (#220) can pass its 100%-coherence exit gate. Numbering is sequential from the next free integer at the time T4 runs; the set is cut from real audit findings, not pre-enumerated here.

## Cross-iteration dependencies

- None at plan time. `aeg-coherence-v1` touches `scripts/verify-docs.ts` + `aeg-root/{state-machine.md, doc-owners, roles, contracts}` + `aeg-project/decisions.md`. No open iteration's `Project(s)` column lists `aeg`; `vada-production-v1` and `herald-agents-v2` are product-code iterations, file-disjoint by construction. Safe to run fully in parallel with them.
- A T1 Planner readiness re-check is required before any subsequent task in this iteration dispatches: confirm no new iteration has declared a `scripts/verify-docs.ts` task in the interim.
