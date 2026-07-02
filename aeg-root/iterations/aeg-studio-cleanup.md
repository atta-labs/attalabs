# Iteration: aeg-studio-cleanup — July 2026
Lifecycle: planned

Goal (execution, not roadmap-why): curate AEG Studio's UI surface — add missing
canonical reference content, remove unwanted iteration-view surfaces (dependency
graph, board/graph toggle), fix status-badge colors, and (once `aeg-consolidation`
task 4 / #265 lands its "surfaced doc" manifest) exclude execution-state artifacts
currently leaking into the docs nav. Full task rationale lives on each Issue; this
file holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                          | Issue | Project(s)    | Depends-on | Conflicts-with |
|---|----------------------------------------------------------------|-------|---------------|------------|----------------|
| 1 | Add "Documentation Coherence" reference doc                    | #287  | aeg           | —          | —              |
| 2 | Remove dependency-graph + board view, table-only task list     | #290  | aeg           | —          | —              |
| 3 | Status badge colors: in-flight/in-review toward cyan/blue      | #291  | aeg           | —          | —              |
| 4 | Exclude iteration execution files from docs nav                | #292  | aeg, aeg-core | aeg-consolidation #265 | —  |

## Cross-iteration dependencies

- Task 1 (#287) has no dependency on #265 — it adds new, uncontroversially-canonical
  content, not nav-inclusion/exclusion logic. Referenced by `aeg-consolidation.md`'s
  cross-iteration notes as the anticipated destination for docs-curation work; this is
  this iteration's first real task, seeded ahead of that larger, #265-gated one.
- Task 4 (#292) depends on `aeg-consolidation` task 4 (#265, not yet merged) — that task
  defines the canonical "surfaced doc" manifest this task consumes rather than
  re-inventing a second, competing exclusion rule. Do not dispatch task 4 until #265 merges.
- Tasks 2 and 3 have no cross-iteration or intra-iteration dependencies; fully
  independent, dispatchable in parallel with task 1 and with each other.
- Runs concurrently with `aeg-consolidation` and `aeg-governance-hardening` (both active,
  `Project: aeg`) — no collision domain shared with either (all four tasks touch only
  AEG Studio files or this iteration's own topology; neither in-flight iteration's
  surface reaches them).
