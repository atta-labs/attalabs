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
| 1  | Planner→Brief rationale-completeness gate (R1)                                 | #251  | aeg        | aeg-consolidation #264 | 2, 5d          |
| 2  | Brief→Developer brief-validation gate                                          | #252  | aeg        | aeg-consolidation #263 | 1              |
| 3  | Bind-all + staleness audit: drive linkage to 100%, emit fix punch-list          | #218  | aeg        | aeg-consolidation #263 | —              |
| 4  | Planner §7 auto-derivation from `doc-owners`                                   | #219  | aeg        | 3                      | —              |
| 5  | Model hardening: ledger-ownership, reviewer isolation, executor-protocol chain | #266  | aeg        | —                      | —              |
| 5a | Branch-ID verification: Step 0 must literal-match topology's # column          | #293  | aeg        | —                      | —              |
| 5b | Forbid committed report/scratch files; findings live in PR/Issue only          | #297  | aeg        | —                      | —              |
| 5c | Issue-existence precondition: "row absent" is its own hard-stop, not folded into #TBD | #300  | aeg        | —                      | —              |
| 5d | Post-merge Archivist automation + plan-PR Closes guard                        | #309  | aeg, aeg-core | —                   | 1              |
| 6  | Fix stale claim vs D-060 in ui-cms-theme skill                                | #278  | aeg        | —                      | —              |
| 7  | Fix stale claim vs D-044/D-045 in ui-api-routes skill                         | #279  | aeg        | —                      | —              |
| 8  | Fix stale claim vs D-025 in atta-ai/attalabs CLAUDE.md                        | #280  | aeg        | —                      | —              |
| 9  | Fix stale claim vs D-050/D-052 in cetana-spec.md + cetana-coordinator skill   | #281  | aeg        | —                      | —              |
| 10 | Fix stale claim vs D-044/D-045 in herald-engine skill                         | #282  | aeg        | —                      | —              |
| 11 | Deterministic dispatch gate: verify-dispatch, premise pinning, verify-task    | #324  | aeg, aeg-core | —                   | 1, 15          |
| 12 | Fix stale claims vs D-045/D-051 in herald web CLAUDE.md                       | #326  | aeg        | —                      | —              |
| 13 | Fix herald web tests: deleted YAML path (ENOENT); CI-filter report            | #327  | herald     | —                      | —              |
| 14 | Align commit-format docs with enforced commitlint grammar                     | #328  | aeg        | —                      | —              |
| 15 | Clear the 44 pre-existing F1/F2 full-mode findings                            | #329  | aeg        | —                      | 11             |
| 16 | Fresh-worktree bootstrap: wire UI generate into dev task                      | #330  | aeg        | —                      | —              |
| 17 | Forge wrappers ship empty bodies on stream body-file input                    | #333  | aeg        | —                      | —              |
| 18 | Pre-push guard: refuse pushes to a branch whose PR is merged/closed           | #335  | aeg        | —                      | 11             |
| 19 | End the plan-PR race: CI-scope T2 + single-plan-PR guard                      | #336  | aeg        | —                      | 11, 18         |

## Backlog (this iteration, not yet dispatched)

- **Fix punch-list — promoted.** The staleness audit in task 3 (#218) emitted 5 real findings (#278–282), filed by PR #283. All 5 are now promoted to tasks 6–10 above (topology rows added 2026-07-02, each carries its own Planner's rationale posted as an Issue comment). No further unpromoted punch-list items remain from task 3 at this time; task 5a's `5a` letter-suffix convention avoided colliding with this now-realized 6–10 range as designed.

## Cross-iteration dependencies

- **Depends on `aeg-consolidation`:** task 1 (#251) depends on `aeg-consolidation` task 2 (#264, verify-coherence checks homed in `@atta/aeg-core`); task 2 (#252) and task 3 (#218) each depend on `aeg-consolidation` task 1 (#263, verify-docs checks homed). Do not dispatch tasks 1/2/3 here until the referenced `aeg-consolidation` Issue is merged.
- Absorbed the unbuilt tail of `aeg-coherence-v1` (D-070 movement, 2026-07-01): tasks 1, 2, 3, 4 are that iteration's former tasks 7, 8, 3, 4 respectively, re-homed here because `aeg-consolidation` claimed the check-engine work they were built on. See `aeg-root/iterations/aeg-coherence-v1.md` for the per-task move annotations.
