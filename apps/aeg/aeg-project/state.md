# AEG (product) — Current State

**Last updated:** 2026-06-10 (product folder scaffolded)
**Purpose:** what is true right now for AEG **the product** (the UI + `aeg.sh`). For ecosystem-wide state see root `aeg-project/state.md`. For the AEG **model**, see root `aeg-root/` (constitution, manual-flow, iterations, roles).

---

## Status

**Spec-only scaffold. No code yet.** `apps/aeg/` was created 2026-06-10 to give AEG-the-product a real home (it was previously folderless, with its UI write-up living in the ecosystem backlog). Contents:

- `apps/aeg/specs/aeg-app-architecture.md` — canonical product architecture (UI surfaces, three layers, `aeg.sh`)
- `apps/aeg/specs/aeg-backlog.md` — product plan (the UI decomposition + the scaffolder), moved from the ecosystem backlog
- `apps/aeg/specs/aeg-decisions.md` — product-local decision log (empty)
- `apps/aeg/aeg-project/{state,now}.md` — this state layer (per D-037)

No `apps/aeg/web` yet. The product is the **designated first real iteration**; building it is itself the first run of the flow.

## What it is (one line)

A read-only web UI that visualizes a repo's AEG execution — iteration DAGs + forge-derived status + the backlogs — with an attention-queue default view; plus `aeg.sh`, a neutral scaffolder that lets any repo adopt the AEG structure. Deploy target `aeg.attalabs.dev`.

## Relationship to Cetana (recorded so it is not re-litigated)

AEG the product does **not** contain or depend on Cetana. AEG is forge-native and orchestrator-independent (D-029). Cetana is the optional orchestrator that automates AEG's dispatch/escalation slice and lives at `apps/cetana-ai/`. **Cetana knows AEG; AEG does not know Cetana.** The UI may render an orchestrator's activity as read-only forge facts; it never holds the orchestrator as a sub-component.

## Identity / stack

Single Clerk app, `.attalabs.dev` cookie (ecosystem model, like Vāda — not Herald's standalone Clerk). `@atta/crypto` for the GitHub-token vault, `@atta/db` for the cache schema, `@atta/ui` + `@atta/ui/engine-flow` (React Flow) for rendering. `apps/aeg` carries no `-ai` suffix (meta/infra-app convention).

## Next

Plan the first iteration from `aeg-backlog.md`: start with the pure `deriveIteration(file, forge)` module (no I/O, exhaustively testable), then GitHub App read-only auth + encrypted token store, then the webhook fact-cache, then the queue / repo-rollup / DAG surfaces. `aeg.sh` sequences alongside the derive module (shared structure schema).
