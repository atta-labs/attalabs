# Iteration: vinaya-studio-v1 — July 2026
Lifecycle: active

Goal: `apps/vinaya/web` = Vinaya Studio — a direct copy of `apps/aeg/web` with the
product renamed, conformed to the locked renderer contract (governance state enters only
via `@atta/aeg-core`'s public API + the `apps/vinaya/sources` StateSource adapters /
the versioned `check --json` shape; one-way imports, both directions), plus the
`vinaya studio` launcher command. `apps/aeg` stays untouched until the deferred
deprecation iteration. Full task rationale lives on each Issue; this file holds
topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                          | Issue | Project(s) | Depends-on                              | Conflicts-with |
|---|----------------------------------------------------------------|-------|------------|------------------------------------------|----------------|
| 1 | Copy apps/aeg/web → apps/vinaya/web, rename to Vinaya Studio  | #388  | vinaya     | aeg-governance-hardening #368, aeg-governance-hardening #372, aeg-forge-state-v1 #429 | — |
| 2 | Renderer contract: state only via aeg-core public API + sources | #389 | vinaya     | 1, vinaya-cli-v1 #382                    | —              |
| 3 | vinaya studio launcher command                                 | #390  | vinaya     | 1, vinaya-cli-v1 #381                    | —              |

## Cross-iteration dependencies

- **Task 1 waits for `aeg-governance-hardening` #368 (task 26) + #372 (task 28) + `aeg-forge-state-v1`
  #429 (task 5)** — all three reshape the exact Studio surface being copied (the TL-flagged
  moving target; resolved: wait, don't fork). The `aeg-forge-state-v1` edge is the more
  consequential of the three: it changes Studio's actual DATA SOURCE (file-reads → the forge
  adapter), not just its UI surface — copying before it lands would fork the pre-migration
  Studio, requiring the exact same data-source swap to be redone a second time on the copy.
- **Task 2 consumes `vinaya-cli-v1` #382** (the sources package it swaps onto); **task 3
  consumes `vinaya-cli-v1` #381** (the bin/router it registers into).
