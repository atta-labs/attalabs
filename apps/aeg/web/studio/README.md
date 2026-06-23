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
- Iteration task status is derived from the forge (Issues + PRs) per D-055: the Studio queries GitHub by `iteration:<slug>` label, resolves `#TBD` issue numbers, and derives each task's status via `deriveIteration`. Progress counts (merged / active / todo / backlog / blocked) appear on iteration cards and the detail task table. Degrades gracefully when no GitHub auth is present.
- **PR resolution strategy** (fetch-forge-facts.ts): for each task's Issue, the adapter first looks for the closing PR via `timelineItems(CLOSED_EVENT)` — this is branch-name-independent and correctly handles PRs whose head branch doesn't match the `task/<iter>/<id>` convention (e.g. `task/vada-production-v1/T1` vs the guessed `task/vada-production-v1/1`). The branch-based `pullRequests(headRefName: ...)` query is kept as a fallback for in-flight tasks where the issue is still open.
