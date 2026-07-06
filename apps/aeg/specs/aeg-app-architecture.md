# AEG — app architecture

**Status:** draft
**Scope:** the AEG product — now understood as **two products over a shared core** (AEG-product D-001): **Studio** (the local repo-reading tool) and **Portal** (the public deployed docs/marketing/download site), both consuming `@atta/aeg-core`. Plus the `aeg.sh` scaffolder.
**Last updated:** 2026-06-23 (PR resolution: closing PR via CLOSED_EVENT, branch-named PR as fallback — §3.2).

This spec is the canonical reference for AEG **the product**. It is distinct from AEG **the model** (the governance/flow constitution), which lives at the repo root in `aeg-root/` (`state-machine.md`, `aeg-manual-flow.md`, `iterations/README.md`, the role docs, `contracts/`) and governs the whole monorepo. The model is the thing; this product makes the thing visible and adoptable.

> **AEG does not know its orchestrator.** AEG is forge-native and orchestrator-independent (D-029): it runs by hand, on any repo, with zero orchestration tooling. Cetana is one optional tool that automates AEG's dispatch/escalation slice — **Cetana knows AEG; AEG does not know Cetana.** This product reflects that asymmetry: the AEG UI reads the forge and renders execution state; it treats an orchestrator like Cetana as *one thing that writes to the forge*, surfaced read-only, never as a dependency or a contained component. Cetana is a sibling product at `apps/cetana-ai/`, not part of this folder.

---

## 0. Two products over a shared core (AEG-product D-001) — read this first

What was originally written as "the AEG product" (one hosted SaaS app) is actually **two products with different audiences, data sources, and deploy stories, sharing one core.** This section governs; where older sections below (§2, §3.2, §3.3, §5) describe a single hosted app with GitHub-App auth, a token vault, a webhook cache, and Clerk, read them as **the deferred hosted-Studio possibility**, not the default.

```
packages/aeg-core/            @atta/aeg-core — SHARED. Parse AEG artifacts → typed model;
                              deriveIteration(file, forgeFacts) (pure); the docs logic
                              (frontmatter, nav, surfaced manifest, coherence). Pure —
                              zero framework deps. Both products consume it.
apps/aeg/web/
  studio/                     AEG Studio — the LOCAL repo-reading tool.   ← V1 (aeg-ui-v1)
  portal/                     AEG Portal — the PUBLIC deployed site.       ← FUTURE iteration
```

- **AEG Studio (local).** Launched at a repo root, **no auth**. Reads *this repo's* AEG artifacts off disk + reads **GitHub locally** (the operator's own already-authenticated token / `gh`) for live per-task status. Renders this repo's governance. The first iteration builds this.
- **AEG Portal (public, future).** Deployed at `aeg.attalabs.dev`. Explains AEG to the world — the full documentation via the shared docs logic — plus the `aeg.sh` download and marketing. Renders *the model itself*, not anyone's repo data. **Not built in V1.**
- **`@atta/aeg-core` (shared).** The parser + `deriveIteration` + the docs logic. Built in V1 (Studio needs it); the Portal inherits the docs logic for free (the F5 lesson — build the shared thing shared the first time, global D-042). The package is **pure** — no react/next/UI dependencies (task 28, #372); presentation components live in the consuming app.

**OQ-aeg-3 is resolved local-first by D-001.** The hosted apparatus (GitHub App, encrypted token vault, webhook cache, multi-tenant Clerk, billing) is *not* how Studio works and is *not* in either V1 product. A hosted multi-tenant Studio is a later, separate deployment decision, never a blocker for the local tool.

### V1 scope — `aeg-ui-v1` (AEG Studio, local-first)

**In:** `@atta/aeg-core` (parse + `deriveIteration` + shared docs renderer); AEG Studio at `apps/aeg/web/studio` — top-bar + sidebar shell (modeled on Vāda's archived "science" doc layout), one root project, sidebar of projects → iterations (active/archived), iteration topology table, tasks as a **kanban** by derived status, **task detail** (brief read from the PR body), the **task-dependency-graph** view (`@atta/ui/engine-flow`) (removed, see #290), full **docs** section (the whole model — constitution, roles, flow, contracts, routes, meanings — via the shared renderer); **live per-task status read from GitHub with the operator's local token**; an **AEG icon** (find/design — placeholder "AEG" text until it exists).

**Out (V1):** no auth / Clerk, no GitHub App, no encrypted token vault, no webhook cache, no hosting / SaaS, no multi-repo (this repo only), no write actions, no cost/token metrics, no `aeg.sh`, **no Portal**.

---

## 1. Product shape

The AEG product is a deployed **UI that makes a repo's agentic execution legible**. It reads two inputs and renders the live picture:

1. **The repo's AEG artifacts** — the thin iteration topology files (`aeg-root/iterations/*.md`: task↔Issue map, `depends-on` / `conflicts-with` edges, grouping) and the backlogs (`specs/*-backlog.md`: the plan).
2. **The Git forge** (GitHub) — the source of *derived* execution status (Issue open/assigned, branch `task/<iteration>/<n>` existence, PR open, review decision, merge). AEG never stores status; it projects it from the forge, exactly as the model prescribes.

> **§0 refinement:** in **Studio (V1)** these two reads are both *local* — the artifacts off disk, the forge via the operator's own token. The webhook-cache / GitHub-App machinery in §3.2–§3.3 belongs to the deferred *hosted* Studio, not V1.

From those it renders: an **attention queue** (what needs a human now — default view), **repos grouped by tag** (by company, by product), each repo's **iterations**, and each iteration's **task DAG** (the "task dependency graph" in the UI). Plus the **plan** (backlogs) alongside execution — because retiring `roadmap.md` (D-029) removed the single whole-plan view, and this UI is where it returns (OQ-cross-14).

> **§0 refinement:** Studio V1's home is the **per-repo project/iteration view with the sidebar**, not a cross-repo attention queue (V1 is single-repo). The attention-queue-as-home framing is a candidate for the hosted/multi-repo future and intersects OQ-aeg-1.

**AEG-only.** A repo must practice AEG to render — the UI is not a general GitHub dashboard; it reads the AEG artifacts and the AEG branch/label conventions. A repo that does not practice AEG shows nothing meaningful.

**Single-tenant *usage*, multi-repo *architecture*.** The first user is Dani, watching his own repos. But the data model is multi-repo and tag-grouped from day one (repos cluster by company and by product), so the same product serves a team without a reshape. *(§0 refinement: V1 Studio is single-repo by launch context; the multi-repo data model is a `@atta/aeg-core` shape, realized in the UI later.)*

---

## 2. Surfaces (routes)

Mirror Vāda/Herald: a Next.js App Router app, flat routes under a signed-in `(app)` group (a route group adds no URL segment).

> **§0 refinement — this section describes the *hosted* shape and is partially deferred.** Studio V1 has **no auth/sign-in**, so there is no signed-in `(app)` guard and no `/settings` connections page. Studio's V1 surfaces are the **sidebar-doc layout**: a root view, project pages, iteration pages (table → kanban → task detail), the task-dependency-graph view (removed, see #290), and the docs section. The route list below is retained as the eventual/hosted target.

```
app/(app)/layout.tsx        shared signed-in layout: auth guard + shell + shared TopBar
app/(app)/queue/            /queue        attention queue — logged-in home (what needs a human now)
app/(app)/repos/            /repos        connected repos, grouped by tag (company / product)
app/(app)/repos/[repo]/     /repos/:repo  one repo: its iterations + backlog
app/(app)/iterations/[id]/  /iterations/:id  one iteration: the task DAG + per-task derived status
app/(app)/settings/         /settings     connections (GitHub App), API keys, account
app/(marketing)/            marketing / landing + the AEG explainer
```

- The DAG renders via `@atta/ui/engine-flow` (React Flow / `@xyflow/react`) — the same renderer Vāda uses. No new graph dependency. **In the UI it is labelled "task dependency graph," not "DAG"** (DAG stays in the model docs) (removed from Studio, see #290).

---

## 3. The three layers

The product decomposes into three clean layers, in dependency order.

### 3.1 `deriveIteration(file, forge)` — pure projection (no I/O)

A pure function: given a parsed iteration topology file + a snapshot of forge facts (Issues, branches, PRs, reviews, merges), return the iteration's derived state — each task's status (in-flight / in-review / changes-requested / merged / blocked), the DAG with edges, and which tasks are dispatch-eligible (depends-on merged, no conflicting sibling PR open). **No network, no storage, no GitHub client.** This is the heart of the product and the easiest thing to test exhaustively, so it is built and tested first, in isolation. **Lives in `@atta/aeg-core` (§0).**

### 3.2 GitHub read path — local adapter (V1) vs. hosted GitHub App (deferred)

> **§0 refinement — Studio V1 ships the local read adapter; the hosted GitHub App + encrypted token store stay deferred.**

**Local read adapter (V1 — implemented).** Studio runs next to the operator's checkout and reads GitHub with the operator's own already-authenticated token. The adapter lives at `apps/aeg/web/studio/src/lib/forge/` and exposes:

```
fetchForgeFacts({ owner, repo, iteration, tasks, token? })
  → Promise<{ facts: Map<TaskId, ForgeFacts>; unavailable: boolean; reason?: string }>
```

The `ForgeFacts` shape is owned by `@atta/aeg-core` (`packages/aeg-core/src/types.ts`) — the adapter imports it; it does not redefine it. The branch ref convention is `task/<iteration>/<id>` (per `aeg-root/iterations/README.md`).

**Label-based task ref resolution (D-055).** Active iteration `.md` topology files carry `#TBD` for issue numbers (task IDs are assigned before the GitHub Issue exists). The adapter resolves real issue numbers at render time: `fetchForgeTasksByLabel(owner, repo, slug)` queries Issues tagged `iteration:<slug>` and parses task IDs from the title pattern `[<slug>] <id> — <title>`. The resolved refs are merged with topology refs so `deriveIteration` can derive real per-task status even before the `.md` is updated. Archived iterations that no longer carry the label degrade gracefully (empty result → topology refs only → all tasks shown as `backlog`). The Studio surfaces aggregate progress counts (merged / active / todo / backlog / blocked) on iteration cards and a Status column on the iteration detail task table. That table also renders a subordinate "Assigned" chip on `todo` rows when `ForgeFacts.assigned` is true — a display-only dispatch-visibility signal (someone has claimed the task's Issue) that does not feed `deriveIteration` or the `DerivedStatus` union (D-059 excludes assignment from status derivation). Similarly display-only: the snapshot carries a `prRefs` map (PR number + forge URL + state per task, extracted from the same batched query — `ForgeFacts` itself stays identity-free), which the task table uses to link `in-review` rows to their PR; Issue numbers link to the forge via the snapshot's resolved `{ owner, repo }`.

Implementation contract:

- **Read-only, always** (D-029). No writes, no labels written, no comments posted. The GraphQL query is a `query`, never a `mutation`.
- **Local auth, no auth system.** Token resolution: explicit override → `GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token`. The adapter never builds an auth flow and never persists a token.
- **Server-only.** The I/O modules import `node:child_process` (for the `gh` fallback) — Next.js refuses to bundle this file into a client component. The token never reaches the browser.
- **One batched GraphQL query per snapshot.** Issue facts, ref existence, and the latest PR for each task are aliased into a single request — rate-limit-friendly, and `pullRequest.reviewDecision` is a first-class field, so we never aggregate REST `/reviews`.
- **PR resolution strategy: closing PR first, branch-named PR as fallback.** For each task's Issue the adapter queries `timelineItems(CLOSED_EVENT)` to find the PR that actually closed the issue — this is branch-name-independent and handles PRs whose head branch does not match the `task/<iteration>/<id>` convention (e.g. `task/vada-production-v1/T1` vs. the guessed `task/vada-production-v1/1`). The branch-based `pullRequests(headRefName: ...)` query is retained as a fallback for in-flight tasks where the issue is still open and the conventional branch name applies.
- **Pure mapper, isolated I/O.** The `(raw GitHub data) → ForgeFacts` mapping (`map-forge-facts.ts`) is pure and unit-tested with fixtures; the I/O layer (`fetch-forge-facts.ts`) is the only place that talks to GitHub. This mirrors `@atta/aeg-core`'s purity discipline.
- **Graceful no-token degradation.** Missing token / network failure / 401 / 403 / repo not visible → returns `{ facts: empty map, unavailable: true, reason }` rather than throwing. `deriveIteration` then maps every task to `backlog` (the conservative read defined in `types.ts`), so Studio still renders the file-derived topology; only live status is absent. The `unavailable` flag is the soft signal Studio can surface ("live status unavailable") without inferring it from an empty map.
- **No cache, no webhook, no persistent store.** That is the deferred hosted path below.

**Hosted GitHub App + encrypted token store (DEFERRED — hosted only).** For a future hosted multi-tenant Studio that holds *other people's* credentials, the design remains: a **GitHub App** (OAuth, **read-only**, per-repo) with tokens encrypted at rest via `@atta/crypto`. Read-only is a hard constraint there too — the AEG UI observes; it never writes status, never moves an Issue, never merges. **Studio V1 ships none of this**; it is retained here as the hosted-future design.

### 3.3 Webhook-fed forge-fact cache

> **§0 refinement — DEFERRED (hosted only).** A live multi-tenant board needs this to stay within rate limits; **Studio V1 does not** — a local single-repo tool reads on demand. Retained as the hosted-future design.

A webhook-fed cache stores **forge facts** (Issue state, branch existence, PR state, review decision, merge) — never authored status. The cache is a performance projection of the forge, not a second source of truth; on conflict the forge wins. `deriveIteration` runs against the cache.

### 3.4 The docs pipeline (shared logic, app-local presentation) — V1

The shared docs **logic** in `@atta/aeg-core` (frontmatter parsing, nav building, the surfaced manifest, coherence evaluation — all pure, zero framework deps) processes the `aeg-root/` model docs (constitution, roles, flow, contracts, routes & meanings) following **Vāda's local-markdown content pattern** (local `.md` under a content dir → a reader component; see `apps/vada-ai/web/content/` + the archived "science" doc layout). The React **presentation components** (`DocPage`, `DocSidebar`, `StickyDocHeader`) live in Studio at `apps/aeg/web/studio/src/app/docs/_components/` — moved out of aeg-core by task 28 (#372) so the shared package stays framework-free. **Studio V1 uses both** for its docs section; **the future Portal reuses the same shared logic** for its public documentation (the F5 lesson, global D-042) and brings its own presentation layer (or a then-shared UI package, decided when the Portal is built).

The docs nav is **manifest-driven, not hardcoded** (D-079). Studio's loader (`apps/aeg/web/studio/src/lib/docs/load-aeg-docs.ts`) filters every parsed doc through `isSurfacedDoc` from `@atta/aeg-core/docs` — the same "surfaced doc" manifest (`packages/aeg-core/src/docs/surfaced-manifest.ts`) that backs the `verify-docs` C6 coherence gate. There is **no "Iterations" nav section**: active iteration topology files, `.tokens.md` ledgers, `projects.md`, and `discovery/` artifacts are this repo's execution state, not model documentation, and are excluded by the manifest. `iterations/README.md` — the generic explainer of the iterations mechanism itself — is the one exception the manifest carves out; it renders under **Overview** via `section: Overview` frontmatter, not a dedicated section.

### 3.5 Studio's UI-generate wiring (fresh-worktree bootstrap, aeg-governance-hardening #330)

Studio consumes `@atta/ui`'s "atta" library the same way `apps/atta-ai/web` does, but nests one level deeper (`apps/aeg/web/studio` vs. `apps/{app}/web`). It needs the identical generate pipeline: a `generate` script (`bun scripts/generate-ui.ts` → `generateUIIndex('atta')`) that `turbo.json`'s `dev` task now depends on, plus a `next.config.ts` self-heal call and `webpack`/`turbopack` aliasing of `@atta/ui/components` to the generated file — otherwise a fresh worktree's `packages/ui/generated/` is absent and Studio 500s with "Module not found: Can't resolve '@atta/ui/components'" the moment a route imports it (e.g. `/projects`).

Studio's extra nesting also exposed a latent bug in the shared `getGeneratedDir()` in `packages/ui/scripts/generate-ui.ts`: it resolved the output directory as a fixed "3 levels up from `process.cwd()`", which is correct for `apps/{app}/web` callers but silently wrote Studio's generated files to `apps/packages/ui/generated/` instead of the real `packages/ui/generated/` at the repo root — an easy-to-miss failure since typecheck and the webpack/turbopack alias configs point at the *expected* location regardless of where generation actually wrote. The fix walks up from `process.cwd()` to the directory containing `turbo.json` (the monorepo root) instead of hardcoding a depth, so it is correct for every app regardless of nesting depth.

---

## 4. `aeg.sh` — the adoption scaffolder

The product is not only the UI. Adopting AEG in a fresh repo means laying down a specific folder structure (the `aeg-root/` model docs, `iterations/`, the `specs/*-backlog.md` convention per D-037, the branch/label conventions). Doing that by hand is error-prone and is the friction that keeps AEG from spreading beyond this monorepo.

`aeg.sh` is a **neutral scaffolder script** (a D-029 build follow-up): run it in a repo, answer a couple of prompts (or pass flags), and it creates the AEG structure — including, when you **specify a project/unit**, that unit's folders (`apps/<unit>/specs/<unit>-backlog.md`, `apps/<unit>/aeg-project/{state,now}.md`) following the D-037/D-041 convention. It is *neutral* — it encodes the AEG model, not Atta-specific content — so any team can adopt the architecture.

Relationship to the products: the scaffolder lays down what Studio reads; the **Portal hosts its download**. They are the halves of "make AEG adoptable": `aeg.sh` writes the structure, Studio renders a repo, the Portal explains the model and distributes the scaffolder. **Status:** specified, not built. Sequenced in `aeg-backlog.md`. **Not in `aeg-ui-v1`.**

---

## 5. Identity & data

> **§0 refinement — DEFERRED for Studio V1.** Studio V1 has **no identity layer** (local tool, operator's own machine and token). The Clerk / `.attalabs.dev`-cookie model below applies to the **future hosted Studio and/or the Portal's authenticated areas** if any ever exist (the Portal is largely public read-only and may need no auth at all).

Under the single-Clerk-app, `.attalabs.dev`-cookie model (like Vāda). Reuses `@atta/crypto` for the GitHub token vault (hosted only), `@atta/db` for the cache schema (hosted only), `@atta/ui` (incl. `@atta/ui/engine-flow`) for rendering. Deploy target `aeg.attalabs.dev` (covered by the `*.attalabs.dev` wildcard CNAME) — **that deploy target is the Portal**; Studio is not deployed.

Folder naming: `apps/aeg` carries **no `-ai` suffix**, matching the meta/infra-app convention (`apps/attalabs`, `apps/desktop`). AEG is infrastructure for building, not an end-user AI product.

---

## 6. What this product is NOT

- **Not a general GitHub dashboard.** It renders AEG repos via AEG conventions; a non-AEG repo shows nothing meaningful.
- **Not a writer.** Read-only against the forge. It never stores or mutates execution status — that would recreate the racing status model D-029 eliminated. It projects; it does not author. (Studio reads GitHub read-only with the operator's token; it never writes.)
- **Not Cetana, and does not contain Cetana.** Cetana is the optional orchestrator (a sibling product). The UI may *render* an orchestrator's activity as forge facts, but the orchestrator is never a dependency or a sub-package here. AEG does not know Cetana.
- **Not a planning tool.** The backlog is the seam where AEG meets whatever planning tool a team uses; AEG renders the plan but is indifferent to how it was authored.
- **Studio is not deployed; the Portal is not a repo-viewer.** The two products do not blur: Studio = local, your repo; Portal = public, the model.

---

## 7. Dogfooding

The AEG product is built *through* AEG: **AEG Studio is the designated first real iteration (`aeg-ui-v1`)**. Building the thing that visualizes the flow, using the flow, is the intended proof. Studio's own `aeg-project/` (state + now) and this `specs/` set follow the same conventions the product reads — Studio can render its own repo.
