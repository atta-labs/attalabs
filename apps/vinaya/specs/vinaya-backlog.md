# Vinaya — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future / research items for Vinaya. Reference the Planner reads when choosing the next tranche slice; the flow never operates on it.

First mention of this file — created (#381), per the brief's §2 correction (`vinaya-spec.md` already existed at dig time; this backlog file did not).

---

## Remaining tasks (issues #382–#387, undispatched)

- **Task 2 — `StateSource` seam.** Already built and parked; blocked behind this task's merge + archival (row-adjacency).
- **Check engine, `init`, forge writes, lifecycle, trust surface** — the remainder of the v1.0 command surface: `init`, `init product`, `demo break`, `doctor`, `upgrade`, `eject`, `check` (`--json`/`--diff-only`/`--parallel`), `pr create/edit`, `issue create/edit`, `waiver`, `new check`, `studio` (launcher). See `vinaya-spec.md` § v1.0 scope.

## Deferred (named in ratified/pending decisions, no task exists yet)

- **`gh` shim** — fast-follow, opt-in accelerator. Not v1.0.
- **`vinaya worktree`** — cut; a documented recipe suffices.
- **Windows support** — documented as unsupported for v1.0; macOS/Linux only, tarball fallback documented not primary.
- **Editor extension** — deferred.
- **GitHub App / org-wide install** — deferred; Studio Phase 3 (deployed self-hosted stateless read-only Studio on a GitHub App token) depends on this.
- **`/docs` CLI command reference page** (`apps/vinaya/web`) — blocked on real commands shipping; documenting a CLI that doesn't exist yet would be premature (see `vinaya-spec.md` § Pages table).
- **Rings-drilldown visual design application** — design assets (brief + two HTML mockups) exist but are not yet committed to the repo or wired to `/aeg`; no task registered (see `vinaya-spec.md` § Pages table, `/aeg` row).

## Unscoped (needs a brief before dispatch)

---

*Note on scope: this file tracks Vinaya-the-product's own backlog, distinct from AEG methodology backlog items (which live in AEG's own docs, not here).*
