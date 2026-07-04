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
| 20 | Coherence oracle A2 false positive: provenance exists but undetected (#287)   | #340  | aeg        | —                      | —              |
| 21 | verify-dispatch baseline capture silently reports 0 findings on tool failure | #351  | aeg-core   | —                      | —              |
| 23 | Fix verify-dispatch repo resolution, explain row-adjacency, wire daily-drift to stuck blockers | #360  | aeg, aeg-core | —                 | —              |
| 22 | turbo-ignore builds unconditionally on a branch's first deploy (no --fallback) | #353  | vada, herald, atta, attalabs | — | —      |
| 24 | CI backstops for local-only gates + enforcement pairing matrix               | #364  | aeg, aeg-core | —                 | 23, 25         |
| 25 | Mechanize verify-dispatch + verify-task: gates agents cannot skip            | #365  | aeg, aeg-core | 23                | 24             |
| 26 | Studio: render Issue assignment as display-only chip on Todo tasks           | #368  | aeg        | —                      | —              |

## Backlog (this iteration, not yet dispatched)

- **Fix punch-list — promoted.** The staleness audit in task 3 (#218) emitted 5 real findings (#278–282), filed by PR #283. All 5 are now promoted to tasks 6–10 above (topology rows added 2026-07-02, each carries its own Planner's rationale posted as an Issue comment). No further unpromoted punch-list items remain from task 3 at this time; task 5a's `5a` letter-suffix convention avoided colliding with this now-realized 6–10 range as designed.
- **Task 21 (#351) — found live, promoted directly.** A Brief Author's dig on task 15 (2026-07-03) found `verify-dispatch.ts`'s informational baseline-capture path (`currentFindingCounts()`/`sh()`) silently reports 0 findings whenever the wrapped `verify-docs.ts --full` command exits non-zero — its `catch` block discards stderr and returns `''` unconditionally. Not gating (does not affect `checkDispatchReadiness`'s READY/NOT READY verdict), but the baseline print it feeds is misleading exactly when a task needs it most. Filed straight to a topology row (no separate punch-list PR) since it's a single, already-fully-scoped finding, `Project: aeg-core`, Tier 0.
- **Task 22 (#353) — merged forward from PR #352 (2026-07-03).** This branch (PR #354) was cut from `origin/main` before #352 merged, so its topology omitted task 21's row and CI's `T2` coherence check correctly failed (Issue #351 was open and iteration-labeled but absent from this branch's topology). Resolved by merging `main` into this branch once #352 landed — both rows now present, in numeric order. Carry-forward lesson: register concurrent Planner tasks in one shared plan branch/PR (as tasks 6–10 and 5a–5d were) rather than parallel plan branches, to avoid this class of forge/branch-state race entirely.
- **Row reorder: 23 now precedes 22 (Planner act, 2026-07-04) — resolving a bug-induced dispatch deadlock.** Task 22 (`Project: vada, herald, atta, attalabs`) was blocked solely by FOUR false `prior-iteration-archival` findings from the confirmed `verify-dispatch` repo-resolution bug (its un-targeted `gh issue list` returns `[]` from linked worktrees, making `herald-hardening-v1` — which genuinely has 4 open Issues — look done-but-unarchived). Task 23 IS the fix for that bug, but sat behind 22 by row-adjacency: 22 needed 23's fix, 23 needed 22 merged. Rows reordered so 23 (whose own gates pass with true data — `Project: aeg, aeg-core`, prior task 21 fully archived) dispatches first; 22 follows with the bug fixed and its gates evaluating honestly. Row order is Planner-owned topology; task numbers and Issues are unchanged — only dispatch order moved. No gate was overridden.
- **Task 26 (#368) — Studio dispatch-visibility chip.** Renders the already-fetched-but-never-displayed `facts.assigned` as a display-only decoration on Todo tasks (NOT a new derived state — D-059 stands). Closes the live gap where a dispatched-but-not-yet-pushed task is indistinguishable from an untouched one. Assignment-at-dispatch chosen over early branch pushes (a dead terminal would leave a zero-commit branch lying "in-flight"; a stale assignee is visible and one-click reversible).
- **Tasks 24 (#364) + 25 (#365) — registered together in one plan PR (2026-07-04), applying the #352/#354 carry-forward lesson.** Both born from a full enforcement audit that found two systematic gap families: (a) three gates existing only as local hooks/wrappers, invisible to any writer without them (task 24 adds forge-side backstops + the Principal-requested enforcement pairing matrix in `enforcement.md`); (b) the two highest-value gates (`verify-dispatch`, `verify-task`) being manual CLIs nothing forces anyone to run — the exact "agents obey checkers, not documents" failure the enforcement doc's founding observation records (task 25 mechanizes both). Task 25 `depends-on` 23: wiring `verify-dispatch` into `pre-push` before 23's repo-resolution fix lands would false-block every first push from a worktree. Principal priority: extremely high; row order after the 20–23 chain is the dispatch mechanism (AEG stores no priority metadata).
- **Task 23 (#360) — bundled at Principal's explicit instruction; sizing tension flagged, not resolved.** Three coupled findings from the `herald-hardening-v1` tasks 4/5 dispatch attempt (2026-07-03): a repo-resolution bug in `verify-dispatch.ts`'s `gh` calls (silent empty-array false positives from linked worktrees), an undocumented-but-intentional row-adjacency design in `dispatch-gate.ts` that an agent misdiagnosed as a bug, and the unused `daily-drift` CI stub that could have surfaced the whole incident proactively. These are three separate verification stories by the split/combine rule (`iterations/README.md` §6) and would normally be three tasks — combined into one at explicit Principal direction; the Issue's own rationale flags this tension rather than silently overriding it.

## Cross-iteration dependencies

- **Depends on `aeg-consolidation`:** task 1 (#251) depends on `aeg-consolidation` task 2 (#264, verify-coherence checks homed in `@atta/aeg-core`); task 2 (#252) and task 3 (#218) each depend on `aeg-consolidation` task 1 (#263, verify-docs checks homed). Do not dispatch tasks 1/2/3 here until the referenced `aeg-consolidation` Issue is merged.
- Absorbed the unbuilt tail of `aeg-coherence-v1` (D-070 movement, 2026-07-01): tasks 1, 2, 3, 4 are that iteration's former tasks 7, 8, 3, 4 respectively, re-homed here because `aeg-consolidation` claimed the check-engine work they were built on. See `aeg-root/iterations/aeg-coherence-v1.md` for the per-task move annotations.
