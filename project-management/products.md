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

This registry is the **authority for valid product names.** A `Product:` value is valid if and only if it is a row above. The Developer's entry gate resolves `Product:` against this file to find the specs path; if there is no matching row (a typo like `vda`, or an unregistered name), the brief is malformed and the agent refuses rather than guessing — *"Product 'vda' isn't in the registry; did you mean 'vada', or run `aeg add-product` first?"* The same check can run mechanically in `verify-docs` later.

## Routing vs. conflicts — two different granularities

`Product` is the **coarse routing/ownership label** — "this task is Vāda work; read Vāda's specs; update Vāda's PM." It is deliberately *not* the conflict unit. Conflicts happen at the **package/path level**: two tasks collide if they touch the same code, even across different products (e.g. both touch a shared `@atta/engine`). So a product may span packages, and the `conflicts-with` edges on the iteration are declared at the finer grain. Don't conflate them: `Product` = whose specs/PM; `conflicts-with` = whose files.

---

Product backlogs (held / future items, out of the AEG flow) live alongside each product's specs as `<path>/specs/<product>-backlog.md`. Cross-cutting / ecosystem items live in `docs/ecosystem-backlog.md`.
