# Iteration: aeg-review-gate-v1 — July 2026
Lifecycle: active

Goal: Close a real process gap found while archiving `aeg-forge-state-v1`: the post-merge Archivist
automation flags a missing code-reviewer/security-review pass as DANGLING, but that check runs
*after* the PR already merged — advisory, not blocking. Nothing before merge actually requires a
Reviewer/Security verdict to exist. Add a required, pre-merge CI check that blocks a task-branch PR
from merging unless a clean code-reviewer `APPROVE` and a clean security-review `PASS` verdict
comment both exist on it, reusing `archive-task.ts`'s existing `extractVerdict` detection rather
than duplicating it, with a Principal-actor-verified `waiver:review` label (mirroring D-097's
`waiver:docs` pattern in `waiver-label.ts`) as the only legitimate bypass.

Repo: daniboomerang/attalabs · Team Leader: Claude (CLI)

## Tasks (topology)

| # | Task                                                                    | Issue | Project(s)      | Depends-on | Conflicts-with |
|---|--------------------------------------------------------------------------|-------|-----------------|------------|----------------|
| 1 | Required pre-merge gate: block merge without a clean code-reviewer + security-review verdict | #474 | aeg, aeg-core | — | — |

## Cross-iteration dependencies

None. This is a standalone `aeg`/`aeg-core` CI-infrastructure iteration, not part of the Vinaya
program or any product iteration.
