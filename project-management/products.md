# Products in this repo

**The product registry.** Declares the products in this repo and where each one's specs and per-product PM live. The `Product` field on an iteration task resolves against this file: `Product: vada` → the Developer reads `apps/vada-ai/specs/`, the Archivist updates `apps/vada-ai/project-management/`.

**Presence of this file means this is a multi-product repo** — the `Product` field on a task is required. A single-product repo has **no** `products.md`; every task shares one product, so the `Product` field is omitted entirely. The file appears only when there is more than one product to disambiguate.

| Product | Code path        | Specs                       | Per-product PM                      |
|---------|------------------|-----------------------------|-------------------------------------|
| vada    | `apps/vada-ai`   | `apps/vada-ai/specs/`       | `apps/vada-ai/project-management/`  |
| cetana  | `apps/cetana-ai` | `apps/cetana-ai/specs/`     | `apps/cetana-ai/project-management/`|
| herald  | `apps/herald-ai` | `apps/herald-ai/specs/`     | `apps/herald-ai/project-management/`|
| atta    | `apps/atta-ai`   | `apps/atta-ai/specs/`       | (status tracked globally)           |

Product backlogs (held / future items, out of the AEG flow) live alongside each product's specs as `apps/<product>/specs/<product>-backlog.md`. Cross-cutting / ecosystem items live in `docs/ecosystem-backlog.md`.
