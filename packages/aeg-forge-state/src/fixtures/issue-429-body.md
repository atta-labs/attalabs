Project: aeg
Iteration: aeg-forge-state-v1 · task 5

**Boundary** — Update AEG Studio (`apps/aeg/web/studio`) to render from the new forge-native sources instead of parsing topology files directly. Confirmed by dig (2026-07-06): `apps/aeg/web/studio/src/lib/aeg-fs/read-root.ts` and the iteration detail page (`src/app/projects/[name]/iterations/[slug]/page.tsx`) read the topology `.md` file directly today — once task 3/7 delete it, this breaks with no file to read. Rewire Studio's data-loading to use task 1's adapter (Milestone + labeled Issues + Issue rationale) for everything it currently gets from the file, keeping its EXISTING rendering/components untouched (this is a data-source swap, not a redesign). NOT: any visual/UX change; NOT `apps/vinaya/web` (a separate, already-planned copy in `vinaya-studio-v1` — this task is THIS repo's OWN existing Studio, still living at `apps/aeg/web`).

**Sizing** — Passes: one verification story (every Studio page that currently renders iteration/task state renders IDENTICALLY after the swap — a before/after screenshot or snapshot-test comparison per page), bounded surface (`src/lib/aeg-fs/**`, the iteration/task detail pages, `src/lib/forge/**` if it needs to compose with the new adapter), single failure mode (a page silently renders blank/wrong once the file source is gone).

**Project(s) + blast radius** — aeg only. Read-only consumer of task 1's adapter; no other product touches this Studio instance.

**Dependency rationale** — `Depends-on: 1` (needs the adapter to read from), `3a` (per-task gate cutover) and `3b` (verify-coherence.ts's repo-wide sweep) — both halves of the split task 3 must land before task 7 deletes the files Studio currently depends on — sequencing safety, not a technical coupling to either half's gate-cutover logic itself.

**Traps to avoid** — Do not conflate this with `vinaya-studio-v1`'s Studio COPY — that's a separate, already-registered iteration building `apps/vinaya/web` from a copy of this same source; this task edits the ORIGINAL, still-live `apps/aeg/web`. Verify the smoke-forge script (`apps/aeg/web/studio/scripts/smoke-forge.ts`, another confirmed file-reader) also gets updated — it's a dev-time diagnostic, easy to overlook since it isn't part of the runtime page-render path.

**Suggested agent-class** — mid: swap a data source behind an existing UI, not novel design.

**Stop-and-escalate** — If any Studio feature has no equivalent in the new forge-native data (something the file format expressed that Milestones/labels/comments genuinely can't), stop and name the gap (`severity:strategy`) rather than silently drop the feature.

**Docs to keep coherent** — None expected beyond `docs-index.md` if files move — this is a code-only swap behind an existing, already-documented UI.


**Amendment (2026-07-06, Planner) — verified consumer list, exhaustive sweep with false positives ruled out.** REAL, previously-unlisted consumer confirmed: `apps/aeg/web/studio/src/lib/forge/dispatch-readiness.ts` (line 146 calls `parseIteration(await fs.readFile(...))` directly — a genuine file-reading consumer, add to surface map). Minor but real: `apps/aeg/web/studio/src/app/iterations/page.tsx` and `.../app/projects/page.tsx` carry hardcoded UI caption text naming `aeg-root/iterations/` and `aeg-root/projects.md` as the data source — update the copy to match the new source, low risk but real (stale captions would actively mislead users post-migration). **Ruled out as false positives (grep hit on comments/type-only mentions, not actual file-reading calls) — do NOT waste dig time re-checking these:** `lib/forge/fetch-forge-facts.ts`, `lib/forge/map-forge-facts.ts`, `_lib/status-display.ts` (all three only mention `deriveIteration` in comments/prose); `lib/forge/load-snapshot.ts` imports the pure `deriveIteration` function (unchanged per task 3's own scope — only its INPUT source changes, and that input is supplied by `read-root.ts`/`dispatch-readiness.ts`, not by `load-snapshot.ts` itself) — verify at dig time whether it needs any change at all, but the Planner's read suggests it does not.


**Amendment (2026-07-06, Planner) — dependency updated for the task 3 split.** Task 3 split into 3a (#427, per-task gates) and 3b (#437, verify-coherence.ts's repo-wide sweep). This task's `Depends-on` is now `1, 3a, 3b` (both halves, not just the original single task 3) — Studio's own `/api/coherence` route spawns `verify-coherence.ts` as a subprocess, so 3b's cutover is just as load-bearing for Studio as 3a's.


