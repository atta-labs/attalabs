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
| vada     | `apps/vada-ai`        | `apps/vada-ai/specs/`       | `apps/vada-ai/aeg-project/`   |
| cetana   | `apps/cetana-ai`      | `apps/cetana-ai/specs/`     | `apps/cetana-ai/aeg-project/` |
| herald   | `apps/herald-ai`      | `apps/herald-ai/specs/`     | `apps/herald-ai/aeg-project/` |
| aeg      | `apps/aeg`            | `apps/aeg/specs/`           | `apps/aeg/aeg-project/`       |
| aeg-core | `packages/aeg-core`   | `packages/aeg-core/specs/`  | (state tracked globally for now)     |
| atta     | `apps/atta-ai`        | `apps/atta-ai/specs/`       | (state tracked globally for now)     |
| desktop  | `apps/desktop`        | `apps/desktop/specs/`       | (state tracked globally for now)     |

> **aeg** — AEG **the product**: a read-only web UI (`apps/aeg/web` → `aeg.attalabs.dev`) that visualizes a repo's AEG execution (iteration DAGs + forge-derived status + backlogs, attention-queue default view), plus `aeg.sh`, a neutral scaffolder that lets any repo adopt the AEG structure. Distinct from AEG **the model** (the governance constitution at repo-root `aeg-root/`). Spec-only scaffold today, no `apps/aeg/web` code yet; it is the designated first real iteration. **Orchestrator-independent: AEG does not know Cetana** — Cetana (the optional orchestrator, `apps/cetana-ai`) knows AEG, not the reverse; it is a sibling, never contained here (D-029, D-038). `apps/aeg` carries no `-ai` suffix (meta/infra-app convention, like `apps/attalabs`, `apps/desktop`).

> **aeg-core** — `@atta/aeg-core` (`packages/aeg-core`): the pure, no-I/O package the AEG product runs on. Two capabilities: parse a repo's AEG artifacts (registry, iteration files) into a typed model, and `deriveIteration(iteration, forgeFacts)` → per-task derived status + the dependency/conflict graph + dispatch eligibility, mirroring `iterations/README.md` §3 exactly. Both **AEG Studio** (local, the first consumer) and the future **Portal** (hosted) read through this same substrate; they differ only in how they fetch the inputs. Registered as a project because the iteration `aeg-ui-v1` declares `Project: aeg-core` on several tasks — a package may be a project, per this file's framing above.

> **desktop** — AttaLabs Desktop: a Tauri shell embedding the existing web products unchanged (Next `standalone` in a Node sidecar) plus a local CLI transport so products ride the user's `claude`/`codex` subscription. Spec set is DRAFT / NOT RATIFIED (see `apps/desktop/specs/`). No `apps/desktop` code exists yet — the folder currently holds specs only.

## How `Project` is validated

This registry is the **authority for valid project names.** A `Project:` value is valid iff every name in it is a row above. The Planner and Developer resolve `Project:` against this file; an unmatched name (a typo like `vda`, or unregistered) makes the task malformed and the agent refuses rather than guessing — *"Project 'vda' isn't registered; did you mean 'vada', or run `aeg add-project` first?"* Can also run mechanically in `verify-docs`.

## A task can span multiple projects — and that is normal

`Project` is **multi-valued.** A task carries as many projects as it genuinely touches: usually one (`Project: vada`), sometimes several (`Project: engine, herald`, or more). Not an exception — cross-project PRs are an expected shape. The Planner decides split-vs-combine by **verification coupling** (see `iterations/README.md` §6): provable independently → separate tasks with a `depends-on` edge; provable only as a unit → one task / branch / PR / multiple projects. The same `Ticket:` rides on all resulting tasks, so work stays atomic in Jira however it's shaped in AEG.

When a task lists multiple projects, every mechanism fans out: the Developer reads every listed project's specs; the PR is reviewed through each project's lens (more projects = more review lenses = proportionally more rigor, matching the wider blast radius); the Archivist updates every listed project's `state.md`/`now.md`.

## Routing vs. conflicts — two different granularities

`Project` is the **coarse routing/ownership label** — "whose specs, whose state." It is **not** the conflict unit. Conflicts happen at the **package / collision-domain level**:

- **Collision domains are packages**, listed in a rarely-changed static file, `.aeg/packages`. Known cross-cutting paths that couple tasks across package boundaries — **lockfiles, `migrations/`, codegen outputs (protobuf/GraphQL/OpenAPI), monorepo config (tsconfig/eslint/turbo)** — are declared as their own collision domains.
- Two tasks conflict if they touch the same collision domain. The canonical case: a task generalizing `@atta/engine` (a package Vāda shares) conflicts with any in-flight Vāda task touching the engine — different projects, same package, real collision. So conflict detection keys on **packages, not projects**.
- Conflicts are **declared by the Planner** (`conflicts-with` edges) and **static**. The gate is forge-answerable with zero stored state: "is a `conflicts-with` sibling's PR open?" There is **no dynamic path-overlap scanner** — that would need a live task→changed-files map, the mutable state AEG eliminates (forbidden; see `iterations/README.md` §9). When unsure two tasks collide, declare the conflict and serialize.

Don't conflate them: `Project` = whose specs/state; `conflicts-with` (via collision domains) = whose files.

---

Project backlogs (held / future items, out of the AEG flow) live alongside each project's specs as `<path>/specs/<project>-backlog.md`. Cross-cutting / ecosystem items live in `specs/ecosystem-backlog.md` (D-037).
