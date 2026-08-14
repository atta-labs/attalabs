[aeg-seam-hardening-v1] 1 — Add checkProjectsRegistered deterministic check

## Planner's rationale

**Boundary** — Add a new deterministic check, `checkProjectsRegistered(body, labels, registeredProjectNames)`, to `packages/aeg-core/src/issue-validation.ts`, export it from `packages/aeg-core/src/index.ts`, and wire it into `packages/aeg-core/bin/open-issue.ts`'s ring-0 refusal list (alongside `checkBlastRadiusScope`, `checkNoBriefContent`, `checkRationaleNamesDocs`) plus `verify-coherence`'s R1 continuous check. The new check fails when any name `declaredProjects(body, labels)` returns is not a row in `.vinaya/projects.md`. What this task is NOT: it does not touch `checkBlastRadiusScope`'s own bypass logic (the `projects.length > 1` early-return) — that is a distinct fix, task 2, which depends on this task's check existing.

**Sizing** — Passed all four tests. One verification story: a fixture Issue body declaring an unregistered `Project:` token is refused by `open-issue.ts` / fails `checkProjectsRegistered`; a fixture declaring only registered names passes. Single agent context. Bounded file surface: `packages/aeg-core/src/issue-validation.ts`, `packages/aeg-core/src/index.ts`, `packages/aeg-core/bin/open-issue.ts`, `packages/aeg-core/src/coherence-checks.ts` (R1 wiring), plus each file's `*.test.ts`. Single failure mode: an unregistered project name silently passes.

**Project(s) + blast radius** — `aeg-core` (owns `packages/aeg-core`, the edited path). `vinaya` — confirmed via `grep -rn "checkIssueRationale" apps/vinaya/web/src apps/vinaya/cli/src`: hits in `map-dispatch-input.ts`, `dispatch-readiness.ts`, `check-dispatch-readiness.ts`, `check-first-push-dispatch.ts`, `forge-write.ts`, all importing that same module. This task is additive only (new export, no existing export's signature or behavior changes) — vinaya needs **re-verification only** (its existing dispatch-readiness test suite must still pass unchanged), not edits.

**Dependency rationale** — No `depends-on`; no `conflicts-with`. First task in the tranche — everything else either depends on this check existing (task 2) or is independent role-doc work.

**Traps to avoid** — `declaredProjects(body, labels)` currently regex-parses the `Project:` field with zero registry cross-check (confirmed: `grep -rn "unregistered\|validateProject\|resolveProjectNames" packages/aeg-core/src` returns nothing) — do NOT assume `checkBlastRadiusScope` already covers this; it doesn't (see task 2's rationale for the exact bypass it has today). Do NOT scan the whole Issue body for project names — reuse `declaredProjects`'s existing field-scoped parsing (Boundary + Project(s) fields only) so this check's scope matches the rest of the module's convention.

**Suggested agent-class** — mid — bounded, well-specified pure-function addition with clear test fixtures; no architectural judgment calls.

**Stop-and-escalate** — if `registeredProjectNames` must be read from `.vinaya/projects.md` at check-time and no existing parser for that file lives in `aeg-core` (only in `aeg-forge-state`'s `resolveRepo`), escalate `severity:strategy` — this task assumes such a parser exists or is trivially addable; if it requires a new cross-package dependency from `aeg-core` onto `aeg-forge-state` that doesn't already exist, that is an architecture call bigger than this task.

**Docs to keep coherent** — `aeg-root/roles/planner.md` — its hard-gate bullet "Unregistered project or a `Project:` that doesn't resolve against `projects.md` → refuse" currently cites no mechanized backing (verified: this gate is pure prose today). Add a citation once `checkProjectsRegistered` exists. (`aeg-root/contracts/planner-brief.md`'s ring-0 bullet list also enumerates mechanized checks and will read as slightly stale after this — deliberately left out of this task's scope to avoid triggering that file's own blanket Tier 3/ratification-window rule for what is fundamentally a Tier 1 `aeg-core` change; flagged here as a known, accepted gap for whoever next touches that contract, not a silent miss.)

## Origin

Principal-directed hardening tranche (`aeg-seam-hardening-v1`), 2026-08-12. Direct follow-on from reviewing a separate agent's draft plan for a `vinaya-split-v1` tranche: that draft declared `Project: aeg-core, aeg-types, vinaya` where `aeg-types` has no row in `.vinaya/projects.md`, and the mechanized gate (`checkBlastRadiusScope`) let it through anyway because its bypass counts raw declared tokens rather than registry-validated ones. This task closes that hole at the source.

**Tier:** 1
**Project:** aeg-core, vinaya

