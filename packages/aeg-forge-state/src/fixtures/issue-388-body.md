Project: vinaya
Tranche: vinaya-studio-v1 · task 1

**Boundary** — Copy `apps/aeg/web` → `apps/vinaya/web` and rename the product: Vinaya Studio branding (name, mark slot, metadata), package name, CMS/theme wiring per the NextWebShell pattern, its own dev port; boots standalone against this repo. COPY, not move — `apps/aeg/web` keeps working untouched until the deferred deprecation tranche deletes it. NOT: the renderer-contract refactor (task 2); NOT deployment; NOT deleting or editing anything under `apps/aeg`.

**Sizing** — Passes: one verification story (the renamed app boots and renders this repo's governance state identically to AEG Studio), bounded surface (~44 source files copied + rename edits), single failure mode.

**Project(s) + blast radius** — vinaya. New files only; `apps/aeg` is read as the copy source with zero edits.

**Dependency rationale** — `Depends-on: 0` (task 0, #479 — the app scaffold must exist before Studio's routes are added to it), `0b` (task 0b, #480 — same reason), `aeg-governance-hardening #368` (task 26, Studio assigned-chip), `aeg-governance-hardening #372` (task 28 — moves the docs UI INTO Studio): the latter two reshape the exact surface being ported; landing first would fork uncommitted intent and force cherry-picking later (TL-flagged moving target; Principal resolved: wait, don't fork). Also `aeg-forge-state-v1 #429` (backfilled 2026-07-06 — Studio's own `/api/coherence` route spawns `verify-coherence.ts` as a subprocess, so both halves of task 3's split must land before this port locks in a data-source assumption). (Corrected 2026-07-08 to match the amendment below verbatim — this line itself had drifted out of sync with it, the same class of bug already fixed once on #429/#431 this session.)

**Traps to avoid** — Imports of `@atta/aeg-core` stay AS-IS — the vinaya namespace migration rides the later npm extraction, never a standalone rename (D-085's repo rule). A new product needs its CMS config/branding/theme — that is `ui-cms-theme` + `ui-branding` skill territory; the executing agent must invoke those skills before touching that wiring. Keep the copy honest: no opportunistic refactors — divergence from the source is task 2's job under a contract, not taste.

**Suggested agent-class** — mid.

**Stop-and-escalate** — If the copy cannot boot without editing `apps/aeg` or shared packages, stop (`severity:execution`).

**Docs to keep coherent** — Root `CLAUDE.md` products table (if cli task 1 hasn't already added vinaya), `docs-index.md` (new files), `apps/vinaya/specs/vinaya-spec.md` (Studio chapter seed). Surfaces: `apps/vinaya/web/**`.

**Amendment (2026-07-08, Planner) — Boundary reversed: additive, not app-creating.** New tasks 0 (#479) and 0b (#480) now bootstrap `apps/vinaya/web` first — a small, fresh app (landing + Known Limits + `/aeg`), not a copy of `apps/aeg/web`. This task's Boundary is revised: it now **adds** Vinaya Studio's dashboard routes (ported from `apps/aeg/web`'s actual dashboard views — tranche list, task tables, coherence checks) to the already-existing `apps/vinaya/web`, rather than creating that app via a wholesale copy. The source material and porting work are unchanged (still `apps/aeg/web`'s dashboard code, still read-only against it); only the target — an existing small app instead of an empty directory — changes. `Depends-on` is now `0, 0b` plus the existing edges above (all four still apply: the app must exist before Studio's routes are added to it, in addition to the pre-existing `aeg-governance-hardening`/`aeg-forge-state-v1` surface-stability dependencies). **Sizing** unchanged in substance (~44 source files ported + rename/route edits) — the file *count* isn't smaller, only the target directory's starting state is.




