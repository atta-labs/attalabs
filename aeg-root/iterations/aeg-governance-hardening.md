# Iteration: aeg-governance-hardening — July 2026
Lifecycle: active

Goal: Finish D-069's role-seam contract gates (planner→brief, brief→developer) natively
on the `@atta/aeg-core` engine `aeg-consolidation` builds; drive code→doc linkage to
100% and audit staleness against the decision log; auto-derive the Planner's §7
doc-update list; close three live-fire model-hardening gaps found while dispatching
D-069 itself (ledger-ownership, reviewer disk-isolation, executor-protocol chaining).
Full task rationale lives on each Issue; this file holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| #  | Task                                                                          | Issue | Project(s) | Depends-on           | Conflicts-with |
|----|--------------------------------------------------------------------------------|-------|------------|-----------------------|----------------|
| 1  | Planner→Brief rationale-completeness gate (R1)                                 | #251  | aeg        | aeg-consolidation #264 | 2              |
| 2  | Brief→Developer brief-validation gate                                          | #252  | aeg        | aeg-consolidation #263 | 1              |
| 3  | Bind-all + staleness audit: drive linkage to 100%, emit fix punch-list          | #218  | aeg        | aeg-consolidation #263 | —              |
| 4  | Planner §7 auto-derivation from `doc-owners`                                   | #219  | aeg        | 3                      | —              |
| 5  | Model hardening: ledger-ownership, reviewer isolation, executor-protocol chain | #266  | aeg        | —                      | —              |
| 5a | Branch-ID verification: Step 0 must literal-match topology's # column          | #293  | aeg        | —                      | —              |

## Backlog (this iteration, not yet dispatched)

- **Fix punch-list (tasks 6…n) — spawned by task 3.** The staleness audit in task 3 (#218) emits one new Issue per contradiction it finds between a newly-bound doc and `D-001 … D-070`. Those Issues are this iteration's fix punch-list. Numbering is sequential from the next free integer at dispatch time; the set is cut from real audit findings, not pre-enumerated here. **5 real findings already filed** by #218's PR (#283, in review): #278, #279, #280, #281, #282 — expected to occupy 6–10 once promoted; task 5a deliberately uses a letter suffix (matching this repo's `3a`/`6a`-style convention) to avoid colliding with that reserved range.

## Cross-iteration dependencies

- **Depends on `aeg-consolidation`:** task 1 (#251) depends on `aeg-consolidation` task 2 (#264, verify-coherence checks homed in `@atta/aeg-core`); task 2 (#252) and task 3 (#218) each depend on `aeg-consolidation` task 1 (#263, verify-docs checks homed). Do not dispatch tasks 1/2/3 here until the referenced `aeg-consolidation` Issue is merged.
- Absorbed the unbuilt tail of `aeg-coherence-v1` (D-070 movement, 2026-07-01): tasks 1, 2, 3, 4 are that iteration's former tasks 7, 8, 3, 4 respectively, re-homed here because `aeg-consolidation` claimed the check-engine work they were built on. See `aeg-root/iterations/aeg-coherence-v1.md` for the per-task move annotations.
