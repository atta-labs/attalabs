# AEG (product) — Decision Log

Status: draft

Product-local decisions for AEG **the product** (the UI + `aeg.sh` scaffolder). Model-level / cross-product decisions live in the global log (`aeg-project/decisions.md`) — notably D-029 (the AEG model) and D-030 (provenance / spec-conformance / observe mode).

**Schema:** see `state-machine.md` Section 6. Append-only — never edit existing entries.

> **Numbering is per-log** (`state-machine.md` §6). This log runs its own `D-###` sequence; "AEG-product D-001" is distinct from "global D-001". Disambiguate by naming the log.

---

## D-001 — AEG is two products (local Studio + public Portal) over a shared core; resolves OQ-aeg-3 local-first

**Date:** 2026-06-12
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (AEG-UI scoping session, June 12, 2026)
**Ratified by:** Principal (in-session)

**Context:** The architecture spec (`aeg-app-architecture.md`) described "the AEG product" as a single hosted SaaS app doing everything — GitHub App auth, an encrypted token vault, a webhook cache, Clerk identity — which is what left OQ-aeg-3 (local-first vs hosted) open and made the first iteration hard to bound. Scoping the first iteration surfaced that the product is really **two distinct products with different audiences, data sources, and deploy stories**, sharing one core. Naming that split resolves OQ-aeg-3 by construction: the value ships local-first with zero SaaS liability, and the hosted/public surface becomes its own separate thing rather than a deploy-mode of the tool.

**Decision:** AEG-the-product is **two products over a shared core package**:

1. **`@atta/aeg-core`** (shared package, `packages/aeg-core`) — parses a repo's AEG artifacts (the `aeg-root/` model + each `aeg-project/` state + `aeg-root/iterations/*.md` topology) into a typed model; `deriveIteration(file, forgeFacts)` (pure projection — per-task derived status, the dependency graph, dispatch-eligibility); **and the shared docs renderer** (renders the `aeg-root/` model docs, following Vāda's local-markdown content pattern). Both products consume it.

2. **AEG Studio** (`apps/aeg/web/studio`) — the **local** repo-reading tool. A Next.js app launched at a repo root, **no auth**, that reads *this repo's* AEG artifacts off disk and reads **GitHub locally** (the operator's own already-authenticated token / `gh`) for live per-task status. Renders this repo's governance: projects → iterations → tasks (kanban by derived status) → task detail (brief from the PR body) + the task-dependency-graph view + the full docs. **This is the first iteration (`aeg-ui-v1`).**

3. **AEG Portal** (`apps/aeg/web/portal`) — the **public, deployed** site at `aeg.attalabs.dev`. Its job is to explain AEG to the world (the full documentation — constitution, roles, flow, contracts, routes, meanings — rendered via the shared docs renderer), offer the **`aeg.sh` download**, and carry marketing. It renders *the model itself*, not anyone's repo data. **A separate future iteration — explicitly NOT built in `aeg-ui-v1`.**

**Local-first resolves OQ-aeg-3:** the hosted apparatus the old spec implied (GitHub App, encrypted token vault, webhook cache, multi-tenant Clerk, billing) is **not** how Studio works — Studio is local and reads the operator's own token directly. None of that infrastructure is needed for either V1 product. If a *hosted, multi-tenant* version of Studio is ever wanted (watching repos you're not checked out on), that is a later, separate deployment decision — not a blocker for, or a part of, the local tool. OQ-aeg-3 is resolved **local-first**; hosted is deferred indefinitely and is not OQ-aeg-1/-2's concern.

**Alternatives rejected:**
- One product, two deploy modes (local vs hosted) — the original spec's implicit framing: rejected. The two surfaces have different audiences (an operator watching their own repo vs. the public/companies/curious readers), different data (your repo+token vs. the model docs+a download), and different liability (none vs. a token vault holding others' credentials). They are two products; pretending they're one deploy-flag produced the unresolved OQ-aeg-3 and a bloated first-iteration scope.
- Build the public Portal now, alongside Studio: rejected for V1 — it widens the iteration, and the Portal's highest-value content (the docs) depends on the shared docs renderer that Studio builds anyway. Build the renderer once (in `@atta/aeg-core`), ship Studio, then the Portal is mostly landing + download + the inherited renderer.
- Bury the docs renderer inside Studio: rejected — the Portal is *mostly* that renderer; building it shared the first time (the F5 lesson, global D-042) means the second consumer inherits it for free instead of forcing a later extraction.

**Consequences:**
- `aeg-app-architecture.md` gains a "V1 scope / product split" section: studio/portal structure, Studio = local + own-token, Portal = future, shared `@atta/aeg-core` incl. docs renderer. The hosted GitHub-App / webhook-cache / Clerk material is re-scoped as "the deferred hosted-Studio possibility," not the default architecture.
- OQ-aeg-3 in `aeg-backlog.md` is marked resolved (local-first) by this entry; OQ-aeg-1 (primary viewer) and OQ-aeg-2 (forge-derived vs cost/token tier) remain open and are unaffected.
- Folder structure: `apps/aeg/web/studio/`, `apps/aeg/web/portal/` (future), `packages/aeg-core/`. `apps/aeg/web/` groups the two web surfaces.
- The first iteration `aeg-ui-v1` builds Studio + `@atta/aeg-core` (incl. the shared docs renderer) only. The Portal is a named future iteration.
- Type 1 for the product-shape blast radius (it redefines what "the AEG product" is), not for irreversibility. Lock NO — revisit after Studio V1 is real and the Portal iteration is planned.

---
