# Products in this repo

**The product registry.** Declares the products in this repo and where each one's specs and per-product PM live. The `Product` field on a task (a GitHub Issue) resolves against this file: `Product: vada` → the Developer reads that product's specs, the Archivist updates its per-product PM.

## What a product is (and isn't)

A product is **a `(name, folder)` pair the developer declared** — nothing more. Not derived from the folder tree, not required to match a `package.json` name, not required to be a single package. AEG does not define what a product "really" is; the developer does, by choosing a name and a home folder when registering it.

The folder is simply **the home for that product's specs and status** (`<path>/specs/`, `<path>/project-management/`). A product may be one package, an app, or a grouping built from several packages.

- **Identity = the registry row.** A product exists because it has a row here, not because a folder with some name exists somewhere. Nothing searches the tree; names are unique by this registry, paths are whatever the human gave.
- **Path = declared, never derived.** `--path` is a required argument to `aeg add-product`; the tool stores it.

**Presence of this file means this is a multi-product repo** — the `Product` field is required. A single-product repo has **no** `products.md`; every task shares one product, so the field is omitted, and status lives in the root `project-management/`. The registry appears only when there is more than one product to disambiguate.

## Registry

| Product | Path             | Specs                       | Per-product PM                       |
|---------|------------------|-----------------------------|--------------------------------------|
| vada    | `apps/vada-ai`   | `apps/vada-ai/specs/`       | `apps/vada-ai/project-management/`   |
| cetana  | `apps/cetana-ai` | `apps/cetana-ai/specs/`     | `apps/cetana-ai/project-management/` |
| herald  | `apps/herald-ai` | `apps/herald-ai/specs/`     | `apps/herald-ai/project-management/` |
| aeg     | `apps/aeg`       | `apps/aeg/specs/`           | `apps/aeg/project-management/`       |
| atta    | `apps/atta-ai`   | `apps/atta-ai/specs/`       | (status tracked globally for now)    |
| desktop | `apps/desktop`   | `apps/desktop/specs/`       | (status tracked globally for now)    |

> **aeg** — AEG **the product**: a read-only web UI (`apps/aeg/web` → `aeg.attalabs.dev`) that visualizes a repo's AEG execution (iteration DAGs + forge-derived status + backlogs, attention-queue default view), plus `aeg.sh`, a neutral scaffolder that lets any repo adopt the AEG structure. Distinct from AEG **the model** (the governance constitution at repo-root `project-management/`). Spec-only scaffold today, no `apps/aeg/web` code yet; it is the designated first real iteration. **Orchestrator-independent: AEG does not know Cetana** — Cetana (the optional orchestrator, `apps/cetana-ai`) knows AEG, not the reverse; it is a sibling, never contained here (D-029, D-038). `apps/aeg` carries no `-ai` suffix (meta/infra-app convention, like `apps/attalabs`, `apps/desktop`).

> **desktop** — AttaLabs Desktop: a Tauri shell embedding the existing web products unchanged (Next `standalone` in a Node sidecar) plus a local CLI transport so products ride the user's `claude`/`codex` subscription. Spec set is DRAFT / NOT RATIFIED (see `apps/desktop/specs/`). No `apps/desktop` code exists yet — the folder currently holds specs only.

## How `Product` is validated

This registry is the **authority for valid product names.** A `Product:` value is valid iff every name in it is a row above. The Planner and Developer resolve `Product:` against this file; an unmatched name (a typo like `vda`, or unregistered) makes the task malformed and the agent refuses rather than guessing — *"Product 'vda' isn't registered; did you mean 'vada', or run `aeg add-product` first?"* Can also run mechanically in `verify-docs`.

## A task can span multiple products — and that is normal

`Product` is **multi-valued.** A task carries as many products as it genuinely touches: usually one (`Product: vada`), sometimes several (`Product: engine, herald`, or more). Not an exception — cross-product PRs are an expected shape. The Planner decides split-vs-combine by **verification coupling** (see `iterations/README.md` §6): provable independently → separate tasks with a `depends-on` edge; provable only as a unit → one task / branch / PR / multiple products. The same `Ticket:` rides on all resulting tasks, so work stays atomic in Jira however it's shaped in AEG.

When a task lists multiple products, every mechanism fans out: the Developer reads every listed product's specs; the PR is reviewed through each product's lens (more products = more review lenses = proportionally more rigor, matching the wider blast radius); the Archivist updates every listed product's `state.md`/`now.md`.

## Routing vs. conflicts — two different granularities

`Product` is the **coarse routing/ownership label** — "whose specs, whose PM." It is **not** the conflict unit. Conflicts happen at the **package / collision-domain level**:

- **Collision domains are packages**, listed in a rarely-changed static file, `.aeg/packages`. Known cross-cutting paths that couple tasks across package boundaries — **lockfiles, `migrations/`, codegen outputs (protobuf/GraphQL/OpenAPI), monorepo config (tsconfig/eslint/turbo)** — are declared as their own collision domains.
- Two tasks conflict if they touch the same collision domain. The canonical case: a task generalizing `@atta/engine` (a package Vāda shares) conflicts with any in-flight Vāda task touching the engine — different products, same package, real collision. So conflict detection keys on **packages, not products**.
- Conflicts are **declared by the Planner** (`conflicts-with` edges) and **static**. The gate is forge-answerable with zero stored state: "is a `conflicts-with` sibling's PR open?" There is **no dynamic path-overlap scanner** — that would need a live task→changed-files map, the mutable state AEG eliminates (forbidden; see `iterations/README.md` §9). When unsure two tasks collide, declare the conflict and serialize.

Don't conflate them: `Product` = whose specs/PM; `conflicts-with` (via collision domains) = whose files.

---

Product backlogs (held / future items, out of the AEG flow) live alongside each product's specs as `<path>/specs/<product>-backlog.md`. Cross-cutting / ecosystem items live in `specs/ecosystem-backlog.md` (D-037).
