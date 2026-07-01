# AEG Studio

Local, no-auth tool that reads this repo's AEG artifacts off disk + GitHub and renders its governance (projects → iterations → kanban → task detail → dependency graph → docs).

One of two AEG products (the other is **AEG Portal**, future, public). Both share `@atta/aeg-core`. See `apps/aeg/specs/` for the product specs.

## Dev

```bash
bun run dev --filter=@atta/aeg-studio
# or
cd apps/aeg/web/studio && bun run dev
```

Runs at `http://localhost:3005`.

## Status

Live reads from disk + forge:

- Projects, iterations, tasks, and dependency graph are read from `aeg-root/` on disk.
- Iteration task status is derived from the forge (Issues + PRs) per D-055 and D-059: the Studio queries GitHub by `iteration:<slug>` label, resolves `#TBD` issue numbers, and derives each task's status via `deriveIteration`. Progress counts (merged / active / todo / blocked) appear on iteration cards and the detail task table. Iteration tasks are minimum `todo` — `backlog` is project-level only and never appears on the board. Degrades gracefully when no GitHub auth is present.
- **PR resolution strategy** (fetch-forge-facts.ts): for each task's Issue, the adapter first looks for the closing PR via `timelineItems(CLOSED_EVENT)` — this is branch-name-independent and correctly handles PRs whose head branch doesn't match the `task/<iter>/<id>` convention (e.g. `task/vada-production-v1/T1` vs the guessed `task/vada-production-v1/1`). The branch-based `pullRequests(headRefName: ...)` query is kept as a fallback for in-flight tasks where the issue is still open.
- **Honest terminal statuses** (D-069): a closed Issue with no merged PR is never shown as `todo`. `dropped` = closed `NOT_PLANNED` (legitimately abandoned, muted badge); `incoherent` = closed `COMPLETED` with no merged PR (governance signal broken, red badge). `DerivedStatus` vocabulary lives in `@atta/aeg-core`; the badge treatment lives in `_lib/status-display.ts`.

## Check Coherence

Each iteration detail page carries a **Check Coherence** panel. Clicking the button calls `GET /api/coherence`, which spawns `scripts/verify-coherence.ts --json` as a Bun subprocess and returns the JSON report. The Studio renders:

- **Green "All checks pass"** when the oracle exits 0.
- **Linked list of incoherences** when checks fail — each failure shows the iteration, task ID, a linked GitHub Issue number, and the failure reason so the reader can navigate directly to the affected item.
- **Forge unavailable warning** when no `GITHUB_TOKEN` / `GH_TOKEN` / `gh auth token` is present (forge-dependent checks are skipped by the oracle; local checks still run).

The Studio is a renderer only — no check logic lives in the panel or the route. `scripts/verify-coherence.ts` (Va / #229) is the single source of truth.
