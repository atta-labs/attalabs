# AEG — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future items for AEG **the product** (the UI + the `aeg.sh` scaffolder). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it. Per D-037, this plan lives in `specs/`; the product's flow + governance + living state live in `apps/aeg/project-management/`.

Moved here 2026-06-10 from `specs/ecosystem-backlog.md`, where the AEG-UI write-up lived while the product had no folder. The model-level AEG build-out items (entry gates in role docs, Archivist checklist, Planner mode, dispatch-gate enforcement) stay in the ecosystem backlog — those improve the *model* and touch root `project-management/`, not this product.

---

## The product — the designated first real iteration

The AEG UI (`apps/aeg/web` → `aeg.attalabs.dev`) is the designated first iteration to run through the flow. Decomposes into a clean dependency chain (see `aeg-app-architecture.md` §3):

1. **`deriveIteration(file, forge)` — pure projection module.** Given a parsed iteration topology file + a forge-fact snapshot, return per-task derived status, the DAG with edges, and dispatch-eligibility. No I/O, no GitHub client, no storage. Built and tested first, in isolation — it is the heart of the product and the easiest to test exhaustively.
2. **GitHub App auth + encrypted token store.** Per-repo, read-only OAuth via a GitHub App; tokens encrypted at rest with `@atta/crypto`. Read-only is a hard constraint.
3. **Webhook-fed forge-fact cache.** Store forge facts (Issue/branch/PR/review/merge), never authored status; keeps reads fast within rate limits. `deriveIteration` runs against the cache; forge wins on conflict.
4. **Attention queue** (`/queue`) — the default view: what needs a human now (blocked tasks, changes-requested PRs, ratification-pending items).
5. **Repo rollup** (`/repos`) — connected repos grouped by tag (company / product).
6. **Iteration DAG view** (`/iterations/:id`) — the task graph via `@atta/ui/engine-flow`, per-task derived status.

**Must render the plan as well as execution.** Retiring `roadmap.md` removed the single whole-plan view; the UI renders the backlogs (`specs/*-backlog.md`) alongside the iterations (OQ-cross-14). Single-tenant *usage* on a multi-repo, tag-grouped *architecture*.

## `aeg.sh` — the adoption scaffolder

- **Neutral AEG scaffold + downloadable `aeg.sh`** (a D-029 build follow-up). A script that lays down the AEG folder structure in any repo, and — given a specified product/unit — creates that unit's folders following D-037 (`apps/<unit>/specs/<unit>-backlog.md` + `apps/<unit>/project-management/{state,now}.md`). Neutral: encodes the model, not Atta content. The interactive product supersedes the static `diagrams/` as the model's explanation. Sequence after (or alongside) the UI's derive module — they share the iteration-file/structure schema.

## Later / open

- **Render orchestrator activity (e.g. Cetana) as forge facts.** When an orchestrator dispatches/escalates, that shows up on the forge; surface it read-only in the queue. AEG stays indifferent to *which* orchestrator. Not before the core read path works.
- **Provenance block surfacing (D-030).** Once the Archivist posts provenance to merged PRs, render it in the iteration history view — the legible, exportable audit trail (the regulated wedge). Depends on D-030 provenance being produced in practice.
- **Multi-tenant hardening.** The architecture is multi-repo/tagged from day one, but team usage (multiple humans, per-user GitHub App installs, permissions) is hardening deferred until the single-user product proves out.

---

*AEG the product visualizes AEG the model. The model lives at repo-root `project-management/`. Cetana (the optional orchestrator) is a sibling at `apps/cetana-ai/` — AEG does not know Cetana.*
