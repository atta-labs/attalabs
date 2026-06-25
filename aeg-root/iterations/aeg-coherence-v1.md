# Iteration: aeg-coherence-v1 — June–July 2026
Lifecycle: active

Goal: Make doc/spec/skill coherence a machine-derived constitutional seam — ownership
declared in `aeg-root/doc-owners`, coverage enforced by `verify-docs` (C5), dormant when
nothing is declared, grown incrementally per task.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                                                                                                | Issue | Project(s) | Depends-on        | Conflicts-with |
|---|-------------------------------------------------------------------------------------------------------------------------------------|-------|------------|-------------------|----------------|
| 1 | Coherence seam: `aeg-root/doc-owners` file (code→doc bindings) + `verify-docs` C5 coverage gate + `Doc-ack`/`Doc-waiver` PR-body fields + D-062 full entry | #214  | aeg        | —                 | —              |
| 2 | Enforcement hardening: decision-number integrity + manifest validity + completeness scoreboard (reserves D-063)                     | #217  | aeg        | #214              | —              |
| 3 | Bind-all + staleness audit: drive linkage to 100%, emit fix punch-list                                                              | #218  | aeg        | #217              | —              |
| 4 | Planner §7 auto-derivation from `doc-owners`                                                                                        | #219  | aeg        | #218              | —              |
| 5 | Coherence completeness verification (100% gate)                                                                                     | #220  | aeg        | #219, #218, 6…n   | —              |

## Backlog (this iteration, not yet dispatched)

- **Fix punch-list (tasks 6…n) — spawned by task 3.** The staleness audit in task 3 (#218) emits one new Issue per contradiction it finds between a newly-bound doc and `D-001 … D-063`. Those Issues are the iteration's fix punch-list and must all close before task 5 (#220) can pass its 100%-coherence exit gate. Numbering is sequential from the next free integer at the time T4 runs; the set is cut from real audit findings, not pre-enumerated here.

## Cross-iteration dependencies

- None at plan time. `aeg-coherence-v1` touches `scripts/verify-docs.ts` + `aeg-root/{state-machine.md, doc-owners, roles, contracts}` + `aeg-project/decisions.md`. No open iteration's `Project(s)` column lists `aeg`; `vada-production-v1` and `herald-agents-v2` are product-code iterations, file-disjoint by construction. Safe to run fully in parallel with them.
- A T1 Planner readiness re-check is required before any subsequent task in this iteration dispatches: confirm no new iteration has declared a `scripts/verify-docs.ts` task in the interim.
