---
sidebar_title: Projects
---
# Projects in this repo

**The project registry.** Declares the projects in this repo and where each one's specs and per-project state live. The `Project` field on a task (a forge Issue) resolves against this file: `Project: vada` → the Developer reads that project's specs, the Archivist updates its per-project state.

## What a project is (and isn't)

A project is **a `(name, folder)` pair the developer declared** — nothing more. Not derived from the folder tree, not required to match a `package.json` name, not required to be a single package. AEG does not define what a project "really" is; the developer does, by choosing a name and a home folder when registering it.

The folder is simply **the home for that project's specs and status** (`<path>/specs/`, `<path>/aeg-project/`). A project may be one package, an app, or a grouping built from several packages.

- **Identity = the registry row.** A project exists because it has a row here, not because a folder with some name exists somewhere. Nothing searches the tree; names are unique by this registry, paths are whatever the human gave.
- **Path = declared, never derived.** `--path` is a required argument to `aeg add-project`; the tool stores it.

**Presence of this file means this is a multi-project repo** — the `Project` field is required. A single-project repo has **no** `projects.md`; every task shares one project, so the field is omitted, and state lives in the root `aeg-project/`. The registry appears only when there is more than one project to disambiguate.

## Registry

| Project  | Path                  | Specs                       | Per-project state                    |
|----------|-----------------------|-----------------------------|--------------------------------------|
| admin    | `tools/admin`         | `tools/admin/specs/`        | (state tracked globally for now)     |
| vada     | `apps/vada-ai`        | `apps/vada-ai/specs/`       | `apps/vada-ai/aeg-project/`   |
| herald   | `apps/herald-ai`      | `apps/herald-ai/specs/`     | `apps/herald-ai/aeg-project/` |
| aeg-core | `packages/aeg-core`   | `packages/aeg-core/specs/`  | (state tracked globally for now)     |
| aeg-forge-state | `packages/aeg-forge-state` | `packages/aeg-forge-state/specs/` | (state tracked globally for now) |
| engine   | `packages/engine`     | `packages/engine/specs/`    | (state tracked globally for now)     |
| adapter  | `packages/adapter-langgraph` | `.claude/skills/atta-adapter-langgraph/` | (state tracked globally for now) |
| forensic-hiring-auditor | `packages/agents/forensic-hiring-auditor` | `.claude/skills/vada-architecture/SKILL.md` | (state tracked globally for now) |
| vada-deliberation | `packages/agents/vada-deliberation` | `.claude/skills/vada-architecture/SKILL.md` | (state tracked globally for now) |
| vada-fusion | `packages/agents/vada-fusion` | `.claude/skills/vada-architecture/SKILL.md` | (state tracked globally for now) |
| vada-fusion-native | `packages/agents/vada-fusion-native` | `.claude/skills/vada-architecture/SKILL.md` | (state tracked globally for now) |
| ui       | `packages/ui`         | `.claude/skills/ui-*`       | (state tracked globally for now)     |
| attalabs | `apps/attalabs`       | `apps/attalabs/specs/`      | (state tracked globally for now)     |
| vinaya   | `(none — owns no directory)` | `.claude/skills/vinaya-architecture/SKILL.md` | Issue #768 (pinned) |
| vinaya-portal | `apps/vinaya-portal` | `.claude/skills/vinaya-architecture/SKILL.md` | (state tracked globally for now) |
| vinaya-studio | `apps/vinaya-studio` | `.claude/skills/vinaya-architecture/SKILL.md` | (state tracked globally for now) |

> **engine** / **adapter** — `packages/engine` (`@atta/engine`, the plan compiler) and `packages/adapter-langgraph` (`@atta/adapter-langgraph`, LangGraph execution + the multi-vendor cognitive router): together the Atta Engine, the execution substrate Vāda runs on. Both are long-standing shared packages that had their own collision domains in the now-deleted `.aeg/packages` (`#990`) and their own skills, and task Issues have declared `Project: engine, adapter` since well before this row existed — the names were simply never registered, so every such task resolved against nothing. Registered retroactively for the same reason `admin`, `attalabs`, and `ui` each were: real code, real collision domain, no row. The two rows differ in where their specs live, deliberately: `packages/engine/specs/` exists and carries real content (the engine-layer rationale and the framework-choice comparison), so `engine` points there. `packages/adapter-langgraph/` has no specs directory, so `adapter` points at its skill instead — the shape `ui` uses, and for the same stated reason.

> **forensic-hiring-auditor** / **vada-deliberation** / **vada-fusion** / **vada-fusion-native** — the four `packages/agents/*` workspace members that declare `@atta/engine` as a dependency, identified from the workspace rather than from memory (`grep -l '"@atta/engine"' packages/agents/*/package.json`). Same gap as `engine`/`adapter`: real code, real collision domain (`packages/agents/**` derives live in `checkBlastRadiusScope`), no registry row — a `Project:` naming any of the four resolved against nothing. None has its own `specs/` directory; all four point at `.claude/skills/vada-architecture/SKILL.md`, the doc `.vinaya/doc-owners`' existing `packages/agents/**` binding already names — the shape `adapter`/`ui` use for a project whose specs live in a skill rather than a local `specs/` dir.
>
> **admin** — `tools/admin`: the internal Sanity-backed admin tool for managing per-product theme/library config across every AttaLabs product (not a product itself, no `.attalabs.dev` domain). Had real code and a task PR (#557, the Library-picker feature) before ever getting a registry row — added retroactively once that gap was noticed. `tools/*` carries no `-ai` suffix (internal-tooling convention, like `apps/desktop`, `apps/attalabs`).

> **vinaya** — Vinaya: the npm-distributed reference implementation of AEG, installed into any GitHub repository. This row's own folder, `apps/vinaya`, held only this project's specs after the `sources` workspace member (the StateSource adapters — forge-backed primary, file-backed transitional) — a stale pre-extraction copy — was deleted alongside `packages/aeg-core`/`packages/aeg-forge-state`/`packages/aeg-types` in the attalabs-adoption tranche, and the web surface it used to hold split into two sibling apps, registered below as their own rows (`vinaya-portal`, `vinaya-studio`), once `apps/vinaya/web` was deleted (task 4, #886) with both replacements proven on `main`. `apps/vinaya` itself is deleted by a sibling task (`#989`) once even the specs move out — Portal and Studio specs live in `.claude/skills/vinaya-architecture/SKILL.md`, the same doc both already bind to, so nothing goes ungated — leaving this row with no owned directory at all: `Path` reads `(none — owns no directory)` rather than a stale prefix, since the CLI (the `vinaya` command — init/check/pr/issue/doctor/upgrade/eject/demo/waiver) was extracted to the standalone `atta-labs/vinaya` repository and is installed here from npm as `@attalabs/vinaya`; attalabs is an ordinary adopter of the published package, owning no source tree for it to point at. The registry row deliberately precedes the code. "Vinaya is the reference implementation of AEG": AEG stays the model's name; Vinaya is the tool. This repo carries no local `aeg-root/` directory at all — the portable doctrine text resolves entirely through the installed `@attalabs/vinaya` package (`vinaya doctrine`, reading `node_modules/@attalabs/vinaya/aeg-root/`), and the three operational-prose files it doesn't bundle have no local copy either (a near-identical hand-adapted copy lives in the standalone `atta-labs/vinaya` repo's own `aeg-root/`, which is itself AEG-governed). Pāli name by elective aesthetic. `apps/vinaya` carries no `-ai` suffix (meta/infra convention).

> **vinaya-portal** / **vinaya-studio** — the two apps `apps/vinaya/web` split into (task 3, #885; task 4, #886): `apps/vinaya-portal` (`@atta/vinaya-portal-web`) is the deployed public site — every `(site)` route (landing, `/start`, `/docs`, `/the-harness`, `/state-machine`, `/cli`, `/config`, `/roadmap`) — and `apps/vinaya-studio` (`@atta/vinaya-studio-web`) is the never-deployed local governance dashboard (`/studio`, `/studio/projects`, `/studio/tranches`, `/studio/backlog`). Registered as their own rows rather than folded under `vinaya` above because the registry's `Path` column is a literal prefix match, not a glob (`checkBlastRadiusScope`'s `d.startsWith(\`${owned}/\`)`): `apps/vinaya-portal` and `apps/vinaya-studio` are sibling directories to `apps/vinaya`, not nested under it, so one row's path cannot cover all three without widening the prefix far enough to also claim every other `apps/vinaya*` name that might ever exist — the same shape `engine`/`adapter` already use for the one Atta Engine split across two collision domains. Both point their `Specs` column at `.claude/skills/vinaya-architecture/SKILL.md` — `apps/vinaya/specs/` is deleted alongside `apps/vinaya` itself (`#989`), and neither app has ever had its own `apps/vinaya-portal/specs/`/`apps/vinaya-studio/specs/` — the same shape `adapter`/`ui` use when pointing at a shared doc instead of an app-local specs dir that doesn't exist. Product identity stays singular — this is still one product, "Vinaya" — the split is a registry/blast-radius routing concern, not a rebrand.

> **ui** — `@atta/ui` (`packages/ui`): the shared component-library package four apps (`vada`, `herald`, `attalabs`, `vinaya`) compile against — four swappable design-system libraries (`basic`/`animate`/`retro`/`brutal`) behind one component contract, plus the canvas particle system, topbar/footer composites, and theme tokens. Listed in the now-deleted `.aeg/packages` (`#990`) as its own collision domain since before this row, but had no registry row — any task touching `packages/ui/**` had no `Project:` whose declared path actually covered it, forcing a `blast-radius-ack:` line instead of real ownership (the same gap `aeg-forge-state` closed for its own domain). No `packages/ui/specs/` directory exists; its doctrine lives in the `.claude/skills/ui-*` family (`ui-components`, `ui-library-system`, `ui-theme-tokens`, `ui-canvas-animation`, `ui-branding`, `ui-cms-theme`) instead. Registered retroactively (found while planning the build-determinism and cross-library-compile-safety tasks in #887/#888).

> **attalabs** — The AttaLabs ecosystem hub app (`@atta/attalabs-web`/`-mobile`/`-mcp-server`, serving `attalabs.dev`), distinct from **Atta** (the deep-thinking AI product — Vāda+Vitakka+Sati; its dedicated app scaffold, `apps/atta-ai`, was retired — Atta remains a real, code-less concept, not a registered project). Registered here because it has real code and its own `apps/attalabs/specs/`, but had no registry row until it was added retroactively (found while sizing an unrelated task's `Project(s)` field). `apps/attalabs` carries no `-ai` suffix (meta/infra-app convention, like `apps/desktop`).

> **aeg-core** / **aeg-forge-state** — **the code these rows named is deleted.** `packages/aeg-core` and `packages/aeg-forge-state` were the pure evaluators and forge-derivation adapter the AEG product ran on; both were deleted from this repo by the attalabs-adoption tranche (task 6, #895) once every consumer moved to the published `@attalabs/aeg-core`/`@attalabs/aeg-forge-state`. The two rows stay registered, not deleted alongside the code: a sibling task in the same tranche (task 8, #897, git-history purge) still declares `Project: aeg-core, aeg-forge-state` in its own dispatched Issue, and R1 (the coherence oracle's rationale gate) fails that Issue the moment either row disappears — removing them is task 8's job once its own rationale is corrected, not this task's, since this task cannot edit another task's Issue. Do not point a new task's `Project:` field at either name; there is no code left to own.

## How `Project` is validated

This registry is the **authority for valid project names.** A `Project:` value is valid iff every name in it is a row above. The Planner and Developer resolve `Project:` against this file; an unmatched name (a typo like `vda`, or unregistered) makes the task malformed and the agent refuses rather than guessing — *"Project 'vda' isn't registered; did you mean 'vada', or run `aeg add-project` first?"* Can also run mechanically in `verify-docs`.

## A task can span multiple projects — and that is normal

`Project` is **multi-valued.** A task carries as many projects as it genuinely touches: usually one (`Project: vada`), sometimes several (`Project: engine, herald`, or more). Not an exception — cross-project PRs are an expected shape. The Planner decides split-vs-combine by **verification coupling** (see `tranche-model.md` §6): provable independently → separate tasks with a `depends-on` edge; provable only as a unit → one task / branch / PR / multiple projects. The same `Ticket:` rides on all resulting tasks, so work stays atomic in Jira however it's shaped in AEG.

When a task lists multiple projects, every mechanism fans out: the Developer reads every listed project's specs; the PR is reviewed through each project's lens (more projects = more review lenses = proportionally more rigor, matching the wider blast radius); the Archivist updates every listed project's `state.md` (non-derivable operational facts; `now.md` is retired).

## Routing vs. conflicts — two different granularities

`Project` is the **coarse routing/ownership label** — "whose specs, whose state." It is **not** the conflict unit. Conflicts happen at the **package / collision-domain level**:

- **Collision domains are packages.** `checkBlastRadiusScope` derives every `packages/*` domain live from the workspace and ships built-in cross-cutting defaults (lockfiles, `migrations/`, codegen outputs, monorepo config); `vinaya.config.json` carries no `blastRadius.extraDomains` key at all as of `#990` — nothing beyond live derivation and the built-in defaults is declared. `.aeg/packages`, the static file this section used to name as canonical, is deleted (`#990`) — every domain it listed was already covered by live derivation or the built-in defaults, confirmed by `vinaya doctor` before deletion.
- Two tasks conflict if they touch the same collision domain. The canonical case: a task generalizing `@atta/engine` (a package Vāda shares) conflicts with any in-flight Vāda task touching the engine — different projects, same package, real collision. So conflict detection keys on **packages, not projects**.
- Conflicts are **declared by the Planner** (`conflicts-with` edges) and **static**. The gate is forge-answerable with zero stored state: "is a `conflicts-with` sibling's PR open?" There is **no dynamic path-overlap scanner** — that would need a live task→changed-files map, the mutable state AEG eliminates (forbidden; see `tranche-model.md` §9). When unsure two tasks collide, declare the conflict and serialize.

Don't conflate them: `Project` = whose specs/state; `conflicts-with` (via collision domains) = whose files.

---

Project backlogs (held / future items, out of the AEG flow) live alongside each project's specs as `<path>/specs/<project>-backlog.md`. Cross-cutting / ecosystem items are cut as backlog Issues on the forge (the old `specs/ecosystem-backlog.md` was deleted).
