# Iteration: aeg-ui-v1 — June 2026

Lifecycle: active

**Goal (execution, not roadmap-why):** build **AEG Studio** — the local, no-auth tool that reads *this* monorepo's AEG artifacts off disk and reads GitHub locally (operator's own token) for live per-task status, and renders this repo's governance: projects → iterations → tasks (kanban by derived status) → task detail (brief from the PR body), a task-dependency-graph view, and the full model documentation. Plus the shared **`@atta/aeg-core`** package (parser + `deriveIteration` + the shared docs renderer) that Studio runs on and the future public **Portal** will inherit.

**Center of gravity:** `@atta/aeg-core` (the shared substrate) + AEG Studio (its first consumer). Per AEG-product D-001, AEG is two products over this core — **Studio** (local, this iteration) and **Portal** (public, future). This iteration builds the core and Studio only; the Portal is explicitly out.

**Repo:** attalabs (`daniboomerang/atta.ai`)   ·   **Team Leader:** Dani

> **Status is derived from the forge, not stored here.** This file is topology + the planner's durable rationale only. Live status is `gh pr list` / the forge, never written here. Per `iterations/README.md` §11, the Archivist sets `Lifecycle: complete` and moves this file to `iterations/completed/` when every task is merged — it is never deleted (the rationale is durable history).

> **Readiness gate (run explicitly, per `roles/planner.md`):** intent bounded ✅ (Studio local-first read path + docs; Portal out); specs reachable ✅ (`apps/aeg/specs/aeg-app-architecture.md` §0/§3, `aeg-backlog.md`); code readable ✅ (`@atta/aeg-core` is greenfield; reuse surfaces verified: `@atta/ui/engine-flow`, `@atta/ui/topbar`, `@atta/ui/footer`, Vāda's `content/` + archived "science" doc layout, `apps/vada-ai/web` shell); shared substrate inspectable ✅ (`@atta/ui` consumers known — Vāda, Herald; this iteration *consumes* `@atta/ui` additively, does not change it, so no cross-product blast radius); locked decisions known ✅ (AEG-product D-001 two-product split + local-first; D-029 read-only/derived-status; D-036 shared TopBar props); registry resolves ✅ (`aeg` registered; new `aeg-core` package registered as part of task 1). Concurrency ✅ — **disjoint from `herald-onto-engine`**: that iteration touches `engine`, `adapter-langgraph`, `herald`; this one touches `aeg-core` (new), `apps/aeg`, and *consumes* `@atta/ui` without editing it. **No shared collision domain → the two iterations run fully parallel** (`iterations/README.md` §5, §11).

---

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|-----------|------------|----------------|
| 1 | `@atta/aeg-core` — AEG-artifact parser + `deriveIteration` (pure) | #94 | aeg-core | — | — |
| 2 | Scaffold `apps/aeg/web/studio` + top-bar/sidebar shell | #95 | aeg | — | — |
| 3 | Local GitHub read adapter → forge facts for `deriveIteration` | #97 | aeg, aeg-core | 1 | — |
| 4 | Projects + iterations pages (sidebar nav, topology table, active/archived) | #98 | aeg | 1, 2 | 5, 6 |
| 5 | Kanban + task detail (columns by derived status; brief from PR body) | #100 | aeg | 1, 2, 3 | 4, 6 |
| 6 | Task-dependency-graph view (`@atta/ui/engine-flow`) | #99 | aeg | 1, 2 | 4, 5 |
| 7 | Shared docs renderer in `@atta/aeg-core` + Studio docs section | #101 | aeg-core, aeg | 1, 2 | — |
| 8 | AEG icon — find/design | #96 | aeg | — | — |

**Wave structure (max concurrency, from the edges):**
- **Wave 1 (parallel):** 1 (#94, `aeg-core` parser), 2 (#95, shell scaffold), 8 (#96, icon) — three independent foundations, no shared surface. (2 can stub data until 1 lands; 8 is pure asset work.)
- **Wave 2:** 3 (#97, GitHub read) — needs 1's types.
- **Wave 3 (serialized within the app surface):** 4 (#98), 5 (#100), 6 (#99) all build pages inside `apps/aeg/web/studio` and share the app's routing/layout surface, so they **conflict with each other** (same collision domain: the Studio app shell wiring). Run them one at a time: **4 → 6 → 5** (4 establishes the project/iteration nav the others hang off; 6 is read-only-ish graph; 5 is the richest, needs 3's live status + PR-body read, so last). 7 (#101, docs) touches `aeg-core` + a separate docs route, so it can run **parallel to one** of 4/5/6 if desired, but to stay safe it's simplest to slot it after 4.
- Max *cross-iteration* concurrency with `herald-onto-engine`: unlimited (disjoint).

> **Note on the 4/5/6 conflict:** these are same-project, same-app-shell tasks. The model's conflict rule is package-level; here the collision domain is the Studio app's shared layout/routing files. Declaring them mutually `conflicts-with` and serializing is the conservative, correct call (`iterations/README.md` §5 — "when unsure, declare and serialize"). If, at brief time, the surfaces prove cleanly separable (distinct route files, no shared layout edits), they may parallelize — but the plan declares the conflict.

---

## Task details — Planner's rationale per task (full rationale also in each Issue body)

### Task 1 — `@atta/aeg-core`: AEG-artifact parser + `deriveIteration` (pure) · Issue #94
**Project(s):** aeg-core · **Depends-on:** — · **Conflicts-with:** —

- **Boundary:** a new shared package `packages/aeg-core` (`@atta/aeg-core`). Two pure capabilities: (a) **parse** a repo's AEG artifacts — `aeg-root/projects.md` (the registry), `aeg-root/iterations/*.md` (topology tables + edges + lifecycle marker), and the per-project `aeg-project/` state — into a typed model; (b) **`deriveIteration(parsedFile, forgeFacts)`** → per-task derived status, the dependency/conflict graph, dispatch-eligibility. **Pure: no I/O, no GitHub client, no filesystem reads** (the caller passes file contents + forge facts in). What this is NOT: not the GitHub read (task 3 supplies `forgeFacts`), not the docs renderer (task 7, separate concern in the same package), not any UI.
- **Sizing:** passes the four tests — one verification story (given fixture files + a forge-fact snapshot, the typed model + derived statuses are correct), one agent can hold it (pure functions + types + tests), bounded file surface (the new package only), single failure mode (a parse or a derivation is wrong). It is the cleanest, most testable unit and everything depends on it, so it is wave-1 lead.
- **Project(s) + blast radius:** new package `aeg-core`, no consumers yet → zero blast radius. (Studio becomes the first consumer in later tasks; the Portal later. Designing it pure + standalone now is what lets both consume it.)
- **Dependency rationale:** none. Foundation.
- **Traps to avoid:** keep it **pure** — the temptation is to read files/call GitHub inside it; don't, or it becomes untestable and couples to a runtime. The parser must tolerate the *real* current artifact shapes (the `herald-onto-engine` iteration file's table + rationale blocks; the `aeg-ui-v1` file's; the lifecycle marker just added) — use the live files as fixtures. `deriveIteration` must mirror the status table in `iterations/README.md` §3 exactly (don't invent statuses).
- **Suggested agent-class:** **mid-to-high** — pure logic, but the parsing + derivation correctness is the heart of the product; worth careful work and exhaustive tests.
- **Stop-and-escalate:** if the artifact formats turn out under-specified for reliable parsing (ambiguous table shapes across iteration files), STOP and escalate `severity:strategy` — the fix may be to tighten the iteration-file format in the model, not to write a fragile parser.

### Task 2 — Scaffold `apps/aeg/web/studio` + top-bar/sidebar shell · Issue #95
**Project(s):** aeg · **Depends-on:** — · **Conflicts-with:** —

- **Boundary:** create the Next.js app at `apps/aeg/web/studio` (mirroring the Vāda/Herald app setup — App Router, `@atta/ui` styles, Biome, tsconfig) and build the **shell**: a **top bar** (reusing `@atta/ui/topbar`, with the **AEG icon slot top-left** — placeholder "AEG" text until task 8) **plus a left sidebar** (modeled on Vāda's archived "science" doc layout, `apps/vada-ai/web/src/app/(main)/_archived-science`). No auth, no `(app)` guard. The shell renders with stubbed/empty data — real data arrives in tasks 4–7. What this is NOT: not the pages' content (4/5/6), not docs (7).
- **Sizing:** passes the four tests — one verification story (the app boots locally, the top-bar+sidebar shell renders, nav scaffolding works), one agent can hold it (app config + layout), bounded file surface (the new app dir), single failure mode (the app doesn't boot / shell doesn't render).
- **Project(s) + blast radius:** `aeg` (the new app). **Consumes `@atta/ui` (topbar, styles) additively — does NOT edit it**, so Vāda/Herald are NOT in the blast radius (re-confirm: no `@atta/ui` source change). If the shell needs a `@atta/ui` change, that's a scope change → escalate.
- **Dependency rationale:** none — can scaffold against stub data before `aeg-core` lands. (Kept independent of task 1 deliberately so wave 1 has two parallel foundations.)
- **Traps to avoid:** **do not edit `@atta/ui`** — reuse `TopBar` via its existing props (`isSignedIn`/`accountMenu` exist per global D-036; Studio is no-auth so pass the no-auth shape). Confirm whether Studio uses the CMS-library chrome pattern (like Herald, D-035) or plain `@atta/ui` (simpler; likely correct for an infra tool). Copy the Next.js worktree-root resolution fix the other apps needed (`next.config.ts`).
- **Suggested agent-class:** **mid** — app scaffold + layout reuse; mechanical but multi-file. Reference the existing app setups closely.
- **Stop-and-escalate:** if scaffolding reveals the shell genuinely needs a new shared `@atta/ui` capability (not just reuse), STOP and escalate `severity:strategy` (it pulls Vāda/Herald into scope).

### Task 3 — Local GitHub read adapter → forge facts for `deriveIteration` · Issue #97
**Project(s):** aeg, aeg-core · **Depends-on:** 1 · **Conflicts-with:** —

- **Boundary:** the thin adapter that, running locally with the operator's own GitHub auth (the `gh` CLI token or a `GITHUB_TOKEN` env), fetches the **forge facts** `deriveIteration` consumes — Issue state/assignment, branch existence (`task/<iteration>/<n>`), PR state, review decision, merge — for this repo, and maps them to the `forgeFacts` type task 1 defined. Read-only. What this is NOT: not `deriveIteration` itself (task 1), not the UI that displays the result (tasks 4–6), not a GitHub App / vault / webhook cache (deferred, hosted-only, D-001 §3.2–3.3).
- **Sizing:** passes the four tests — one verification story (against this real repo, the adapter returns correct current forge facts that drive correct derived statuses), one agent can hold it (one read module + its types), bounded file surface (the adapter, likely in `aeg-core` or a thin `studio` lib calling `aeg-core` types), single failure mode (a forge read is wrong/missing).
- **Project(s) + blast radius:** `aeg` + `aeg-core` (the fact-shape may live in `aeg-core` as a type, the fetch in the app). No other consumers.
- **Dependency rationale:** **depends-on 1** — it produces the `forgeFacts` shape task 1 defined; that type must exist first.
- **Traps to avoid:** **read-only, always** (D-029 — the UI never writes the forge). Use the operator's existing auth; **do not** build an auth system. Handle the no-token / unauthenticated case gracefully (the file-derived topology still renders; only live status is absent) — Studio must be useful even before GitHub is reachable. Mind rate limits but **do not** build the webhook cache (that's the deferred hosted path).
- **Suggested agent-class:** **mid** — a contained read adapter; the GitHub API surface is well-trodden.
- **Stop-and-escalate:** if read-only local auth can't cover what the kanban needs (e.g. a datum only available via an App), STOP and escalate `severity:strategy` rather than reaching for the hosted machinery.

### Task 4 — Projects + iterations pages (sidebar nav, topology table, active/archived) · Issue #98
**Project(s):** aeg · **Depends-on:** 1, 2 · **Conflicts-with:** 5, 6

- **Boundary:** populate the **sidebar** with the repo's projects (from `aeg-core`'s parse), and build the **project page** → its **iterations** (active/archived, from the lifecycle marker) → the **iteration topology table** (the parsed table). This is the navigational spine: root project → projects → iterations → (table). What this is NOT: not the kanban/task-detail (task 5), not the graph (task 6).
- **Sizing:** passes the four tests — one verification story (launch on this repo → sidebar lists the real projects → drill to an iteration → its real topology table renders), one agent can hold it (the nav + table pages), bounded file surface (these routes + sidebar wiring), single failure mode (nav/table doesn't render the parsed model).
- **Project(s) + blast radius:** `aeg` only.
- **Dependency rationale:** **depends-on 1** (the parsed model) **and 2** (the shell to render inside). **Conflicts-with 5 and 6** — all three add pages inside the Studio app and touch shared layout/routing; serialize (this one first — it builds the nav spine the others hang off).
- **Traps to avoid:** active/archived comes from the **lifecycle marker** + `completed/` location (`iterations/README.md` §11), not from inventing a status. Read topology from `aeg-core`, don't re-parse in the component.
- **Suggested agent-class:** **mid** — standard data-driven pages over a parsed model.
- **Stop-and-escalate:** if the parsed model from task 1 is missing something these pages need, escalate back toward task 1's scope (`severity:strategy`).

### Task 5 — Kanban + task detail (columns by derived status; brief from PR body) · Issue #100
**Project(s):** aeg · **Depends-on:** 1, 2, 3 · **Conflicts-with:** 4, 6

- **Boundary:** the **kanban** view of an iteration's tasks — columns = derived statuses (`todo`/`in-flight`/`in-review`/`changes-requested`/`merged`/`blocked`), each task placed in its column by **live** status (from task 3). Click a task → **task detail**: read the **brief** (from the **PR body** — the model's home for the brief), show status/progress, link to the Issue/PR. What this is NOT: not the graph (task 6), not the nav/table (task 4).
- **Sizing:** passes the four tests — one verification story (an iteration's real tasks land in the right columns by live status; opening one shows its real brief from the PR body), one agent can hold it (the kanban + detail views), bounded file surface (these routes/components), single failure mode (wrong column placement or brief not fetched).
- **Project(s) + blast radius:** `aeg` only.
- **Dependency rationale:** **depends-on 1** (derived status), **2** (shell), **3** (live forge facts + the PR-body fetch for the brief). It is the richest task and the most dependency-laden, so it runs **last** in the app-surface wave. **Conflicts-with 4 and 6** (shared app shell).
- **Traps to avoid:** the **brief lives in the PR body** (`iterations/README.md` §7) — fetch it from the PR, not the Issue (the Issue holds the rationale, not the brief). Derived status must come from `aeg-core`'s `deriveIteration`, not re-derived in the component. Handle the no-PR-yet / no-token cases (a `backlog`/`todo` task has no brief yet).
- **Suggested agent-class:** **mid-to-high** — the most stateful view (live data, columns, detail fetch), though still Herald-free and bounded.
- **Stop-and-escalate:** if the PR-body brief isn't reliably fetchable read-only, or derived status needs a fact task 3 doesn't supply, escalate `severity:strategy`.

### Task 6 — Task-dependency-graph view (`@atta/ui/engine-flow`) · Issue #99
**Project(s):** aeg · **Depends-on:** 1, 2 · **Conflicts-with:** 4, 5

- **Boundary:** render an iteration's tasks as a **graph** (UI label: **"task dependency graph"**) using `@atta/ui/engine-flow` (React Flow / `@xyflow/react`) — nodes = tasks, **depends-on = directed arrows**, **conflicts-with = dashed/undirected links**. Optional per-node live-status tint if task 3's data is present (additive, not required for V1). What this is NOT: not the kanban (task 5), not the nav (task 4).
- **Sizing:** passes the four tests — one verification story (an iteration's real depends-on/conflicts-with edges render as a correct directed graph), one agent can hold it (one graph view reusing engine-flow), bounded file surface (the graph route/component), single failure mode (graph/edges render wrong).
- **Project(s) + blast radius:** `aeg` only. **Reuses `@atta/ui/engine-flow` as-is** — verify no change needed to the shared renderer (if a change *is* needed, Vāda enters scope → escalate).
- **Dependency rationale:** **depends-on 1** (the graph structure from the parse) **and 2** (shell). **Conflicts-with 4 and 5** (shared app shell). Independent of task 3 (structure is file-derived; live tint is optional).
- **Traps to avoid:** the two edge types are different (directed depends-on = a DAG; undirected conflicts-with = symmetric) — render them distinctly. Reuse engine-flow's existing node/edge components; **do not** fork or modify `@atta/ui/engine-flow`.
- **Suggested agent-class:** **mid** — reuse of an existing renderer over a parsed graph.
- **Stop-and-escalate:** if engine-flow can't express the two edge types without a shared-package change, STOP and escalate `severity:strategy` (pulls Vāda into scope).

### Task 7 — Shared docs renderer in `@atta/aeg-core` + Studio docs section · Issue #101
**Project(s):** aeg-core, aeg · **Depends-on:** 1, 2 · **Conflicts-with:** —

- **Boundary:** add the **docs renderer** to `@atta/aeg-core` — render the `aeg-root/` model docs (constitution, roles, flow, contracts, routes & meanings — **everything**) following **Vāda's local-markdown pattern** (local `.md` → reader component; ref `apps/vada-ai/web/content/` + the archived "science" doc layout). Then wire Studio's **docs section** to it (sidebar-doc layout). Built **shared** so the future Portal inherits it (AEG-product D-001). What this is NOT: not Studio-only (the renderer is shared), not the Portal (future).
- **Sizing:** passes the four tests — one verification story (the full `aeg-root/` model renders as browsable docs in Studio via the shared renderer), one agent can hold it (the renderer + the docs route), bounded file surface (the renderer in `aeg-core` + Studio's docs route), single failure mode (docs don't render/navigate).
- **Project(s) + blast radius:** `aeg-core` (the renderer) + `aeg` (Studio's docs route). The renderer is a **new shared capability** with one consumer now (Studio) and one future (Portal) — design it consumer-agnostic.
- **Dependency rationale:** **depends-on 1** (lives in the `aeg-core` package created there) **and 2** (rendered in Studio's shell). No conflict — separate package surface + a distinct docs route, so it can parallelize with one of 4/5/6 if desired.
- **Traps to avoid:** reuse Vāda's **existing** markdown rendering approach — don't invent a new MDX pipeline. Keep the renderer **content-source-agnostic** (it takes markdown + a nav structure; it doesn't hardcode Studio's filesystem) so the Portal can feed it the same `aeg-root/` docs from a deployed context. Render the *whole* model per the Principal's intent — constitution, roles, flow, contracts, routes, meanings — not a subset.
- **Suggested agent-class:** **mid** — pattern reuse, but the shared-renderer design (consumer-agnostic) wants care.
- **Stop-and-escalate:** if Vāda's doc pattern can't be cleanly shared (it's too app-coupled to extract), escalate `severity:strategy` — the fix is a small shared extraction, decided deliberately.

### Task 8 — AEG icon (find/design) · Issue #96
**Project(s):** aeg · **Depends-on:** — · **Conflicts-with:** —

- **Boundary:** produce the **AEG icon/logo** asset (we don't have one) for the top-left of the shell (and later the Portal/favicon). Deliver the asset + drop it into the icon slot task 2 leaves as placeholder text. What this is NOT: not the shell (task 2 leaves a placeholder), not branding beyond the mark.
- **Sizing:** trivially bounded — one asset. Passes all four tests by being a single deliverable.
- **Project(s) + blast radius:** `aeg` only (an asset + a one-line swap).
- **Dependency rationale:** none — pure asset work, parallel to everything. (The shell's placeholder means task 2 doesn't block on it.)
- **Traps to avoid:** it's a design/taste task, not code — may be Principal-driven or need a design pass. Keep it an SVG that fits the `@atta/ui` aesthetic; don't let it block the shell (placeholder covers that).
- **Suggested agent-class:** **fast / or Principal** — asset sourcing/design, minimal code. (Could be done by hand by the Principal; flagged as a task so it isn't forgotten.)
- **Stop-and-escalate:** none material; if it needs a real design decision, that's the Principal's call.

---

## Open questions / notes for dispatch

- **Issues cut** (#94–#101); the topology above is live. Assigning an Issue is the `backlog → todo` promotion.
- **Dispatch order:** wave 1 = **1 (#94), 2 (#95), 8 (#96)** in parallel (parser, shell, icon). Then 3 (#97). Then the app-surface wave **4 (#98) → 6 (#99) → 5 (#100)** serialized (shared shell), with 7 (#101) slottable after 4.
- **Runs fully parallel with `herald-onto-engine`** — disjoint collision domains (that iteration: engine/adapter/herald; this: aeg-core/apps-aeg/+ consumes @atta/ui read-only). No cross-iteration serialization needed (`iterations/README.md` §5, §11).
- **Resolves AEG-product D-001's first iteration.** OQ-aeg-1 (primary viewer) and OQ-aeg-2 (cost/token tier) remain open and are NOT in V1 — Studio's single-repo local read path doesn't need them.
- **The `@atta/ui` reuse is additive** across tasks 2/5/6 — none edits `@atta/ui`. If any task finds it must, that's a scope change pulling Vāda/Herald into the blast radius → escalate before proceeding.
- **Prototypes the model's iteration-lifecycle + cross-iteration-concurrency rules** (just added to `iterations/README.md` §11) — this is the first iteration to run *concurrent* with another.
- **`aeg-core` registers as a project row (task-1 decision, June 14).** At task-1 dispatch the Brief Author leaned "don't register `aeg-core`"; the Developer's dig overturned that, correctly: `projects.md` explicitly allows a project to be "one package," the iteration's `Project(s)` column already names `aeg-core` four times (rows 1, 3, 7), and the model's own validation rule (`projects.md` §"How `Project` is validated") makes every one of those cells **malformed** without a registry row — and forcing the pure parser to special-case an unregistered name would couple it to a hidden convention that breaks on the next such package. So `aeg-core` gets a registry row (`packages/aeg-core` · `packages/aeg-core/specs/` · state-tracked-globally, mirroring the `atta`/`desktop` pattern), added by task 1. **Precedent for the model:** a **shared package may be a registry row** — registry identity is about routing/validation resolution, not app-vs-package ontology; `aeg-core` is the first package-as-project. A one-line note belongs in `projects.md` §"What a project is" so the next shared package (e.g. if Cetana grows a parser consumer) follows the same path rather than re-litigating — **do this after task 1's PR lands** (task 1 already edits `projects.md`; adding the note on main now would collide with that branch).
