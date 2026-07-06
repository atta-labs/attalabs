# Iteration: aeg-forge-state-v1 — July 2026
Lifecycle: active

Goal: Migrate this repo's own governance state per D-110's disposition — delete the fully
redundant files, move high-churn state to forge-native objects (Milestones, labels, Issue/PR
comments, pinned Issues), relocate the low-churn CI-parsed survivors into a code-free
`packages/governance/` package, cut the live gates over to read forge-native, and update AEG
Studio so it keeps rendering correctly. Resequenced to run BEFORE `vinaya-cli-v1` (D-112) —
the forge-reading mechanism is built and proven against this repo's real, live, messy data as
ordinary `aeg-core`-adjacent engineering, not gated on a shippable adopter-facing product; the
CLI's own StateSource task (`vinaya-cli-v1` task 2, #382) later reuses this already-proven
package rather than building it from scratch. Full task rationale lives on each Issue; this
file holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                                    | Issue | Project(s)      | Depends-on | Conflicts-with |
|---|--------------------------------------------------------------------------|-------|-----------------|------------|----------------|
| 1  | Generic forge-reading adapter (packages/forge-state)                   | #425  | aeg-core        | —          | —              |
| 2  | Relocate decisions/projects/doc-owners to packages/governance          | #426  | aeg, aeg-core   | —          | —              |
| 3a | Cut per-task gates over to the forge adapter                          | #427  | aeg, aeg-core   | 1          | —              |
| 3b | Cut verify-coherence.ts's repo-wide sweep over to the forge adapter    | #437  | aeg, aeg-core   | 1          | —              |
| 4  | Migrate token ledgers, lessons, per-project state to forge objects     | #428  | aeg, aeg-core   | —          | —              |
| 5  | Update AEG Studio to render from forge-native sources                  | #429  | aeg             | 1, 3a, 3b  | —              |
| 6  | Delete fully-redundant files (changelog, ratification queue)           | #430  | aeg             | 4          | —              |
| 7  | Final cutover: delete migrated files, complete the birth rule          | #431  | aeg, aeg-core   | 3a, 3b, 4, 5 | —            |

## Row split (Planner act, 2026-07-06)

Task 3 split into 3a/3b at brief-time dig — pre-authorized by its own original rationale ("if any one gate's cutover is large enough to justify its own PR, split it"). `verify-coherence.ts`'s `loadIterationFiles()` is a synchronous, repo-wide, cross-iteration function feeding the entire coherence-check battery (A1–R1) — a different verification story than the four per-task gates (each reads one iteration at a time, mostly a clean drop-in swap). 3a keeps Issue #427 (narrowed scope); 3b is new, Issue #437. Kept row-adjacent (3a then 3b) deliberately, not fought — both touch the same live dispatch/coherence machinery every active iteration depends on, and running them sequentially lets 3a's golden-comparison proof inform 3b's.

## Cross-iteration dependencies

- **`vinaya-cli-v1` task 2 (#382) is re-pointed to depend on this iteration's task 1 (#425)**
  instead of building its own StateSource adapter from scratch — see D-112 and #382's amendment.
- **Readiness-gate note (2026-07-06):** `aeg-governance-hardening` is not yet archived (one open
  item, #380, in review as PR #424) at the time this iteration was planned. Planning proceeded
  on the same basis as `vinaya-cli-v1`/`vinaya-studio-v1` — dispatch of any `Project: aeg`/
  `aeg-core` task here is mechanically blocked by `verify-dispatch`'s prior-iteration-archival
  check until `aeg-governance-hardening` fully archives; nothing here dispatches before then,
  and dispatch itself remains the Principal's trigger regardless.
