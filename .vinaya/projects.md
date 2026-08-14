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
| ui       | `packages/ui`         | `.claude/skills/ui-*`       | (state tracked globally for now)     |
| attalabs | `apps/attalabs`       | `apps/attalabs/specs/`      | (state tracked globally for now)     |
| vinaya   | `apps/vinaya`         | `apps/vinaya/specs/`        | Issue #768 (pinned)                  |

> **engine** / **adapter** — `packages/engine` (`@atta/engine`, the plan compiler) and `packages/adapter-langgraph` (`@atta/adapter-langgraph`, LangGraph execution + the multi-vendor cognitive router): together the Atta Engine, the execution substrate Vāda runs on. Both are long-standing shared packages with their own collision domains in `.aeg/packages` and their own skills, and task Issues have declared `Project: engine, adapter` since well before this row existed — the names were simply never registered, so every such task resolved against nothing. Registered retroactively for the same reason `admin`, `attalabs`, `ui` and `aeg-forge-state` each were: real code, real collision domain, no row. The two rows differ in where their specs live, deliberately: `packages/engine/specs/` exists and carries real content (the engine-layer rationale and the framework-choice comparison), so `engine` points there, matching `aeg-core`'s shape in the same table. `packages/adapter-langgraph/` has no specs directory, so `adapter` points at its skill instead — the shape `ui` uses, and for the same stated reason.

> **admin** — `tools/admin`: the internal Sanity-backed admin tool for managing per-product theme/library config across every AttaLabs product (not a product itself, no `.attalabs.dev` domain). Had real code and a task PR (#557, the Library-picker feature) before ever getting a registry row — added retroactively once that gap was noticed. `tools/*` carries no `-ai` suffix (internal-tooling convention, like `apps/desktop`, `apps/attalabs`).

> **vinaya** — Vinaya: the npm-distributed reference implementation of AEG, installed into any GitHub repository. One app folder, three workspaces: `apps/vinaya/cli` (the `vinaya` command — init/check/pr/issue/doctor/upgrade/eject/demo/waiver), `apps/vinaya/web` (**Vinaya Studio**, ported from the old AEG Studio app), and `apps/vinaya/sources` (the StateSource adapters — forge-backed primary, file-backed transitional). Imports `@atta/aeg-core` unchanged; the vinaya-namespace migration of shared code rides the later npm extraction, never a standalone rename. The registry row deliberately precedes the code. "Vinaya is the reference implementation of AEG": AEG stays the model's name (`aeg-root/` is untouched); Vinaya is the tool. Pāli name by elective aesthetic. `apps/vinaya` carries no `-ai` suffix (meta/infra convention).

> **ui** — `@atta/ui` (`packages/ui`): the shared component-library package four apps (`vada`, `herald`, `attalabs`, `vinaya`) compile against — four swappable design-system libraries (`basic`/`animate`/`retro`/`brutal`) behind one component contract, plus the canvas particle system, topbar/footer composites, and theme tokens. Listed in `.aeg/packages` as its own collision domain since before this row, but had no registry row — any task touching `packages/ui/**` had no `Project:` whose declared path actually covered it, forcing a `blast-radius-ack:` line instead of real ownership (the same gap `aeg-forge-state` closed for its own domain). No `packages/ui/specs/` directory exists; its doctrine lives in the `.claude/skills/ui-*` family (`ui-components`, `ui-library-system`, `ui-theme-tokens`, `ui-canvas-animation`, `ui-branding`, `ui-cms-theme`) instead. Registered retroactively (found while planning the build-determinism and cross-library-compile-safety tasks in #887/#888).

> **attalabs** — The AttaLabs ecosystem hub app (`@atta/attalabs-web`/`-mobile`/`-mcp-server`, serving `attalabs.dev`), distinct from **Atta** (the deep-thinking AI product — Vāda+Vitakka+Sati; its dedicated app scaffold, `apps/atta-ai`, was retired — Atta remains a real, code-less concept, not a registered project). Registered here because it has real code and its own `apps/attalabs/specs/`, but had no registry row until it was added retroactively (found while sizing an unrelated task's `Project(s)` field). `apps/attalabs` carries no `-ai` suffix (meta/infra-app convention, like `apps/desktop`).

> **aeg-core** — `@atta/aeg-core` (`packages/aeg-core`): the pure, no-I/O package the AEG product runs on. Two capabilities: parse a repo's AEG artifacts (registry, tranche files) into a typed model, and `deriveTranche(tranche, forgeFacts)` → per-task derived status + the dependency/conflict graph + dispatch eligibility, mirroring `tranche-model.md` §3 exactly. Both **AEG Studio** (local, the first consumer) and the future **Portal** (hosted) read through this same substrate; they differ only in how they fetch the inputs. Registered as a project because a task declares `Project: aeg-core` — a package may be a project, per this file's framing above.

> **aeg-forge-state** — `@atta/aeg-forge-state` (`packages/aeg-forge-state`): the one sanctioned adapter that reads live GitHub forge state (Milestone + labeled Issues) and derives the typed `Tranche`/`Task` shapes `aeg-core`'s pure evaluators consume — `gh`-CLI-only, read-only, zero topology file. Listed in `.aeg/packages` as its own collision domain (distinct from `aeg-core`) since before this row, but had no registry row of its own — any task editing its `src/**` had no `Project:` whose declared path actually covered it, forcing every prior task to fall back on a `blast-radius-ack:` line instead of a real ownership match. Registered retroactively (found while planning follow-on forge-adapter test-coverage and label-vocabulary work) for the same reason `attalabs` and `admin` were: real code, its own collision domain, no row.

## How `Project` is validated

This registry is the **authority for valid project names.** A `Project:` value is valid iff every name in it is a row above. The Planner and Developer resolve `Project:` against this file; an unmatched name (a typo like `vda`, or unregistered) makes the task malformed and the agent refuses rather than guessing — *"Project 'vda' isn't registered; did you mean 'vada', or run `aeg add-project` first?"* Can also run mechanically in `verify-docs`.

## A task can span multiple projects — and that is normal

`Project` is **multi-valued.** A task carries as many projects as it genuinely touches: usually one (`Project: vada`), sometimes several (`Project: engine, herald`, or more). Not an exception — cross-project PRs are an expected shape. The Planner decides split-vs-combine by **verification coupling** (see `tranche-model.md` §6): provable independently → separate tasks with a `depends-on` edge; provable only as a unit → one task / branch / PR / multiple projects. The same `Ticket:` rides on all resulting tasks, so work stays atomic in Jira however it's shaped in AEG.

When a task lists multiple projects, every mechanism fans out: the Developer reads every listed project's specs; the PR is reviewed through each project's lens (more projects = more review lenses = proportionally more rigor, matching the wider blast radius); the Archivist updates every listed project's `state.md` (non-derivable operational facts; `now.md` is retired).

## Routing vs. conflicts — two different granularities

`Project` is the **coarse routing/ownership label** — "whose specs, whose state." It is **not** the conflict unit. Conflicts happen at the **package / collision-domain level**:

- **Collision domains are packages**, listed in a rarely-changed static file, `.aeg/packages`. Known cross-cutting paths that couple tasks across package boundaries — **lockfiles, `migrations/`, codegen outputs (protobuf/GraphQL/OpenAPI), monorepo config (tsconfig/eslint/turbo)** — are declared as their own collision domains.
- Two tasks conflict if they touch the same collision domain. The canonical case: a task generalizing `@atta/engine` (a package Vāda shares) conflicts with any in-flight Vāda task touching the engine — different projects, same package, real collision. So conflict detection keys on **packages, not projects**.
- Conflicts are **declared by the Planner** (`conflicts-with` edges) and **static**. The gate is forge-answerable with zero stored state: "is a `conflicts-with` sibling's PR open?" There is **no dynamic path-overlap scanner** — that would need a live task→changed-files map, the mutable state AEG eliminates (forbidden; see `tranche-model.md` §9). When unsure two tasks collide, declare the conflict and serialize.

Don't conflate them: `Project` = whose specs/state; `conflicts-with` (via collision domains) = whose files.

---

Project backlogs (held / future items, out of the AEG flow) live alongside each project's specs as `<path>/specs/<project>-backlog.md`. Cross-cutting / ecosystem items are cut as backlog Issues on the forge (the old `specs/ecosystem-backlog.md` was deleted).
