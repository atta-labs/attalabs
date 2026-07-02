# Iteration: aeg-studio-cleanup — July 2026
Lifecycle: planned

Goal (execution, not roadmap-why): curate what AEG Studio's `/docs` nav surfaces —
add missing canonical reference content, and (once `aeg-consolidation` task 4 / #265
lands its "surfaced doc" manifest) exclude execution-state artifacts currently leaking
into nav. Full task rationale lives on each Issue; this file holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                          | Issue | Project(s) | Depends-on | Conflicts-with |
|---|----------------------------------------------------------------|-------|------------|------------|----------------|
| 1 | Add "Documentation Coherence" reference doc                    | #287  | aeg        | —          | —              |

## Backlog (this iteration, not yet dispatched)

- **Docs-curation (nav exclusion)** — decide what's excluded from Studio's `/docs` nav
  (iteration execution files, `completed/`, etc.) using the canonical "surfaced doc"
  manifest. Depends on `aeg-consolidation` task 4 (#265, not yet merged) — that task
  defines the manifest this work consumes. Not yet cut as a task; promote once #265 lands.

## Cross-iteration dependencies

- Task 1 (#287) has no dependency on #265 — it adds new, uncontroversially-canonical
  content, not nav-inclusion/exclusion logic. Referenced by `aeg-consolidation.md`'s
  cross-iteration notes as the anticipated destination for docs-curation work; this is
  this iteration's first real task, seeded ahead of that larger, #265-gated one.
- Runs concurrently with `aeg-consolidation` and `aeg-governance-hardening` (both active,
  `Project: aeg`) — no collision domain shared with either (task 1 touches only
  `aeg-root/documentation-coherence.md`, a file neither in-flight iteration's surface
  reaches).
