# Products in this repo

**The product registry.** Declares the products in this repo and where each one's specs and per-product PM live. The `Product` field on an iteration task resolves against this file: `Product: vada` → the Developer reads that product's specs, the Archivist updates its per-product PM.

## What a product is (and isn't)

A product is **a `(name, folder)` pair the developer declared** — nothing more. It is *not* derived from the folder tree, *not* required to match a `package.json` name, *not* required to be a single package. AEG does not define what a product "really" is; the developer does, by choosing a name and a home folder when registering it.

The folder is simply **the home for that product's specs and status** (`<path>/specs/`, `<path>/project-management/`). A product may be one package, an app, or a business grouping built from several packages — AEG doesn't care. It only needs one declared folder to route to.

- **Identity = the registry row.** A product exists because it has a row here, not because a folder with some name exists somewhere. Nothing searches the tree; names are unique by this registry, paths are whatever the human gave.
- **Path = declared, never derived.** The `--path` is a required argument to `aeg add-product`; the tool stores it, it does not compute or discover it.

**Presence of this file means this is a multi-product repo** — the `Product` field on a task is required. A single-product repo has **no** `products.md`; every task shares one product, so the field is omitted, and status lives in the root `project-management/`. The registry appears only when there is more than one product to disambiguate.

## Registry

| Product | Path             | Specs                       | Per-product PM                       |
|---------|------------------|-----------------------------|--------------------------------------|
| vada    | `apps/vada-ai`   | `apps/vada-ai/specs/`       | `apps/vada-ai/project-management/`   |
| cetana  | `apps/cetana-ai` | `apps/cetana-ai/specs/`     | `apps/cetana-ai/project-management/` |
| herald  | `apps/herald-ai` | `apps/herald-ai/specs/`     | `apps/herald-ai/project-management/` |
| atta    | `apps/atta-ai`   | `apps/atta-ai/specs/`       | (status tracked globally for now)    |

## How `Product` is validated

This registry is the **authority for valid product names.** A `Product:` value is valid if and only if every name in it is a row above. The Developer's entry gate resolves `Product:` against this file to find the specs path(s); if a name has no matching row (a typo like `vda`, or an unregistered name), the brief is malformed and the agent refuses rather than guessing — *"Product 'vda' isn't in the registry; did you mean 'vada', or run `aeg add-product` first?"* The same check can run mechanically in `verify-docs` later.

## A task can span multiple products — and that is normal

`Product` is **multi-valued.** A task carries as many products as it genuinely touches: `Product: vada` for most work, `Product: engine, herald` (or four, or more) when the change spans them. This is not an exception or an escape hatch — cross-product PRs are a normal, expected shape.

The Planner decides split-vs-combine by one test — **verification coupling** (see `iterations/README.md` §3):
- If the pieces are each provable on their own → separate single-product tasks with a `depends-on` edge.
- If the change can only be *tested* as a unit (e.g. refactor the shared engine *and* migrate the first consumer onto it, because the only proof the refactor is correct is the consumer working) → **one task, one branch, one PR, multiple products.**

When a task lists multiple products, every mechanism fans out across all of them:
- **Routing** — the Developer reads every listed product's specs.
- **Review** — the PR is reviewed through each product's lens (the engine reviewer checks the engine's *other* consumers still work; the Herald reviewer checks Herald uses the new engine correctly). More products = more review lenses = proportionally more rigor. That is the point, not a tax.
- **Conflicts** — see below; conflict is package-level, so a multi-product task conflicts with in-flight work touching *any* of the packages it spans.
- **Close-out** — the Archivist updates every listed product's `state.md` / `now.md`.

The honest tradeoff: a multi-product PR is bigger and has a wider blast radius, so it is *more* dangerous to merge — which is exactly why it earns multi-lens review. Rigor scales with risk; the model does not discourage these, it reviews them harder.

## Routing vs. conflicts — two different granularities

`Product` is the **coarse routing/ownership label** — "whose specs, whose PM." It is deliberately *not* the conflict unit. Conflicts happen at the **package/path level**: two tasks collide if they touch the same code, even across different products. The canonical case: a task generalizing `@atta/engine` (a package Vāda shares) conflicts with any in-flight Vāda task touching the engine — regardless of product labels — because they hit the same package. So conflict detection keys on packages, not products; a product spanning packages, and a package shared across products, are both handled by working at the package grain. Don't conflate them: `Product` = whose specs/PM; `conflicts-with` = whose files.

---

Product backlogs (held / future items, out of the AEG flow) live alongside each product's specs as `<path>/specs/<product>-backlog.md`. Cross-cutting / ecosystem items live in `docs/ecosystem-backlog.md`.
