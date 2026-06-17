# Iteration: aeg-governance-ui-v2 — June–July 2026
Lifecycle: active

Goal: Complete the AEG model by writing all missing role-seam contracts and adding the
Planner readiness gate that enforces iteration close-out before new planning begins
(task 1 — blocks both other iterations). Then refactor AEG Studio with the science-route
UI pattern, add a cross-product iterations view, and complete the token ledger Studio display.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|------------|------------|----------------|
| 1 | AEG governance — all missing role-seam contracts + Planner readiness gate + any other structural gaps found in roles/, contracts/, process.md, aeg-manual-flow.md | #TBD | aeg, aeg-core | — | — |
| 2 | Studio UI refactor — copy full layout from `apps/vada-ai/web/src/app/(main)/_archived-science/` (layout, ScienceSidebar, ScienceSidebarClient, shell) as AEG Studio's new shell; replace current StudioShell + StudioSidebar; wire to AEG nav items; apply default theme, no CMS | #TBD | aeg | 1 | — |
| 3 | Iterations cross-product view — new `/iterations` route showing all active + archived iterations across all projects in one view; reads `aeg-root/iterations/` + `aeg-root/iterations/completed/`; derives status from forge | #TBD | aeg, aeg-core | 2 | — |
| 4 | Token ledger Studio display (#110-view) — per-task and per-iteration totals on the iteration view; consumes `parseLedger` + `sumLedger` from `@atta/aeg-core` (already built, D-048) | #TBD | aeg, aeg-core | 2 | — |

## Planner's rationale

### Task 1 — AEG governance
**Boundary:** Audit every role doc, contracts/, process.md, and aeg-manual-flow.md for
structural gaps. Write all missing role-seam contracts. Add the Planner readiness gate item
that checks for completed iteration close-out on every product in scope before planning begins.
Make the model structurally complete.

Missing contracts confirmed (from this planning session):
- `contracts/brief-developer.md` — what the Brief Author must produce, what the Developer
  verifies before starting (brief in body, tier declared, Test Plan tagged, surface map,
  Task Done, worktree step 0)
- `contracts/developer-reviewer.md` — what the PR must contain before the Reviewer starts
  (brief in body, tier, Test Plan, CI green, surface map)
- `contracts/reviewer-archivist.md` — what the Reviewer must produce (verdict format,
  finding severity tags), what the per-task Archivist confirms before closing out
- `contracts/archivist-iteration-archivist.md` — what per-task close-outs must have completed
  before the Iteration Archivist can declare an iteration fully archivable
- `contracts/iteration-archivist-planner.md` — what the Iteration Archivist must have
  produced, what the Planner must verify before planning a new iteration on that product
  (THE KEY ONE — this is the structural fix for the staleness problem)

Planner readiness gate addition (in `aeg-root/roles/planner.md`):
- Item 8 in the readiness gate: "For every product in scope, confirm the previous iteration
  is in `aeg-root/iterations/completed/`. If any prior iteration on that product exists in
  `aeg-root/iterations/` but not `completed/`, the Iteration Archivist has not run — STOP
  and instruct the Principal to dispatch the Iteration Archivist for that iteration before
  planning proceeds."

Also verify and fix any other gaps found in process.md (Phase 13 wording), aeg-manual-flow.md,
and role docs that reference stale paths or missing contract pointers.

NOT in scope: writing briefs, writing new role docs beyond the above contracts, any code changes.
This is a pure doc task — governance docs only.
**Sizing:** Doc-only. One PR. Single verification story (all 5 contracts exist and the Planner
gate has item 8). Bounded (6 new files + 2 updated role docs + process.md + aeg-manual-flow.md).
**Project(s) + blast radius:** aeg (governance model docs). aeg-core is in the blast radius
only if the contract shape requires a new parsed artifact — unlikely for pure markdown contracts.
**Dependency rationale:** No dependencies. Independent — can run from day 1. Must merge BEFORE
herald-agents-v2 task 1 (housekeeping) dispatches, because the Planner readiness gate it
introduces is what makes the Archivist dispatch non-optional.
**Traps to avoid:** Do NOT write contracts that contradict the existing `planner-brief.md`
contract — extend the pattern, don't diverge. Each contract is a single source of truth for
its seam; the two role docs on either side POINT AT it, they do not restate it. Do NOT add
enforcement mechanisms (CI checks, automation) in this task — that is future work. The
contracts are trusted-discipline in V1 (same as everything else in the model). Do NOT change
any iteration files or state docs — governance docs only.
**Suggested agent-class:** mid — doc writing, pattern replication across 5 contracts.
**Stop-and-escalate:** If writing a contract reveals a genuine gap in the model that requires
a Type 1 decision (a structural AEG change beyond adding a contract), stop and escalate
`severity:strategy` before writing the contract.

---

### Task 2 — Studio UI refactor
**Boundary:** Lift the entire layout solution from
`apps/vada-ai/web/src/app/(main)/_archived-science/` into AEG Studio as its new shell.
Specifically: copy `ScienceSidebar.tsx`, `ScienceSidebarClient.tsx`, and `layout.tsx`
structure verbatim; adapt nav items to AEG's content (Projects, Iterations, Docs, Graph);
replace the current `StudioShell.tsx` and `StudioSidebar.tsx` entirely; apply a hardcoded
default theme (no CMS, no `getHeraldConfig`-style resolution — AEG Studio is an internal
tool with a fixed design system). Refactor all existing pages (`/projects`, `/projects/[name]`,
`/docs`, root page) against the new shell. NOT in scope: new routes (task 3), token ledger
display (task 4), any CMS integration.
**Sizing:** UI refactor. One PR. Single verification story (Studio boots with new sidebar,
all existing pages render). Bounded (Studio src/ only). Passes all four tests.
**Project(s) + blast radius:** aeg only. The archived-science source is read-only reference —
no changes to the Vāda app.
**Dependency rationale:** Depends on task 1 — governance must be complete before Studio
work begins (the Studio is the product that visualizes the model; starting the UI before the
model is complete is backwards).
**Traps to avoid:** Copy the layout EXACTLY — do not redesign or improve. The brief explicitly
references `apps/vada-ai/web/src/app/(main)/_archived-science/` as the canonical source. The
agent reads those files first and copies the pattern, it does not interpret or simplify it.
The shell is `SidebarProvider` + `SidebarContent` + groups with `SidebarGroupLabel` + items
with `SidebarMenuButton` + `usePathname` active state — exact copy, renamed for AEG.
Default theme: pick one clean Tailwind-based default (dark, data-dense, monospace accents —
consistent with AEG's governance/internal-tool character). No user-configurable theme.
**Suggested agent-class:** mid — component copy + adaptation, no architecture.
**Stop-and-escalate:** If the archived-science components depend on Vāda-specific packages
or context providers that don't exist in the AEG Studio, stop and flag — the copy may need
adapter work before it can be used.

---

### Task 3 — Iterations cross-product view
**Boundary:** New `/iterations` route in AEG Studio. Reads `aeg-root/iterations/` (active)
and `aeg-root/iterations/completed/` (archived). Displays all iterations across all products
in one view — not per-product. Two sections: Active (files in `aeg-root/iterations/` without
`completed/` path) and Archived (files in `aeg-root/iterations/completed/`). Derives status
from the iteration file's `Lifecycle:` marker and the task topology. Uses `@atta/aeg-core`'s
`parseIteration` for file parsing. Sidebar nav: `/iterations` entry under a new "Iterations"
group.
**Sizing:** New route. One PR. Single verification story (route renders active + archived
iterations). Bounded (new route file + sidebar entry + aeg-core parser reuse). Passes all.
**Project(s) + blast radius:** aeg (new route), aeg-core (if the parser needs extension for
the completed/ path format — check first).
**Dependency rationale:** Depends on task 2 — must have the new shell/layout before adding
a new route that uses it.
**Traps to avoid:** Do NOT fetch forge state (PR status, branch existence) in this task —
that is Phase 2 AEG Studio work (the forge-fact cache and `deriveIteration`). This task
reads the iteration FILES only and displays their topology + lifecycle marker. Status is
the lifecycle marker from the file, not derived forge state.
**Suggested agent-class:** mid — new Next.js route, existing parser reuse.
**Stop-and-escalate:** If `parseIteration` in `@atta/aeg-core` needs structural changes to
support the completed/ path format, that is a shared-package change — blast radius includes
vada (if aeg-core is consumed there) and must be assessed before proceeding.

---

### Task 4 — Token ledger Studio display (#110-view)
**Boundary:** Display per-task and per-iteration token/cost totals on the iteration view
in AEG Studio. Consumes `parseLedger` and `sumLedger` from `@atta/aeg-core` (both built
and tested in D-048 / task 9 model half). Reads `aeg-root/iterations/<name>.tokens.md`
sibling files. Shows totals inline on the iteration detail page. This is the Studio view
half of the original task 9 (#110) that was left unbuilt.
**Sizing:** Small. One PR. Single verification story (iteration view shows ledger totals).
Bounded (iteration detail page component + ledger file reads). Passes all four tests.
**Project(s) + blast radius:** aeg (Studio display), aeg-core (consumed unchanged).
**Dependency rationale:** Depends on task 2 — the iteration detail page is part of the
refactored Studio; must exist before adding the ledger display to it.
**Traps to avoid:** Do NOT change `parseLedger` or `sumLedger` in `@atta/aeg-core` — they
are built and tested; consume them as-is. Do NOT block the view if the `.tokens.md` file is
absent — render "No ledger data yet" gracefully. The `—` / null convention means some rows
have unknown totals; show them as `—`, not as `$0.00`.
**Suggested agent-class:** mid — display component, existing parser reuse.
**Stop-and-escalate:** If the ledger format in any existing `.tokens.md` file doesn't parse
cleanly (malformed rows, unexpected structure), log it in the PR body and render gracefully —
do not alter the ledger files themselves.

## Backlog (this iteration, not yet dispatched)

- GitHub App auth + encrypted token store — deferred to next AEG iteration.
- Webhook-fed forge-fact cache + `deriveIteration` integration — deferred.
- `aeg.sh` scaffolder — deferred.
- Attention queue (`/queue`) — deferred.

## Cross-iteration dependencies

- Task 1 here has no dependencies and must merge BEFORE herald-agents-v2/1 dispatches
  and BEFORE vada-agents-v2/1 dispatches. It is the structural prerequisite for both
  other iterations' Planner readiness gates.
