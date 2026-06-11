# AEG — app architecture

**Status:** draft
**Scope:** the AEG product — the web app (`apps/aeg/web`) that visualizes Atta Agentic Execution Governance, plus the `aeg.sh` scaffolder that lets any repo adopt the AEG structure.
**Last updated:** 2026-06-10 (product folder scaffolded).

This spec is the canonical reference for AEG **the product**. It is distinct from AEG **the model** (the governance/flow constitution), which lives at the repo root in `aeg-root/` (`state-machine.md`, `aeg-manual-flow.md`, `iterations/README.md`, the role docs) and governs the whole monorepo. The model is the thing; this product makes the thing visible and adoptable.

> **AEG does not know its orchestrator.** AEG is forge-native and orchestrator-independent (D-029): it runs by hand, on any repo, with zero orchestration tooling. Cetana is one optional tool that automates AEG's dispatch/escalation slice — **Cetana knows AEG; AEG does not know Cetana.** This product reflects that asymmetry: the AEG UI reads the forge and renders execution state; it treats an orchestrator like Cetana as *one thing that writes to the forge*, surfaced read-only, never as a dependency or a contained component. Cetana is a sibling product at `apps/cetana-ai/`, not part of this folder.

---

## 1. Product shape

The AEG product is a deployed **UI that makes a repo's agentic execution legible**. It reads two inputs and renders the live picture:

1. **The repo's AEG artifacts** — the thin iteration topology files (`aeg-root/iterations/*.md`: task↔Issue map, `depends-on` / `conflicts-with` edges, grouping) and the backlogs (`specs/*-backlog.md`: the plan).
2. **The Git forge** (GitHub) — the source of *derived* execution status (Issue open/assigned, branch `task/<iteration>/<n>` existence, PR open, review decision, merge). AEG never stores status; it projects it from the forge, exactly as the model prescribes.

From those it renders: an **attention queue** (what needs a human now — default view), **repos grouped by tag** (by company, by product), each repo's **iterations**, and each iteration's **task DAG**. Plus the **plan** (backlogs) alongside execution — because retiring `roadmap.md` (D-029) removed the single whole-plan view, and this UI is where it returns (OQ-cross-14).

**AEG-only.** A repo must practice AEG to render — the UI is not a general GitHub dashboard; it reads the AEG artifacts and the AEG branch/label conventions. A repo that does not practice AEG shows nothing meaningful.

**Single-tenant *usage*, multi-repo *architecture*.** The first user is Dani, watching his own repos. But the data model is multi-repo and tag-grouped from day one (repos cluster by company and by product), so the same product serves a team without a reshape.

---

## 2. Surfaces (routes)

Mirror Vāda/Herald: a Next.js App Router app at `apps/aeg/web`, flat routes under a signed-in `(app)` group (a route group adds no URL segment).

```
app/(app)/layout.tsx        shared signed-in layout: auth guard + shell + shared TopBar
app/(app)/queue/            /queue        attention queue — logged-in home (what needs a human now)
app/(app)/repos/            /repos        connected repos, grouped by tag (company / product)
app/(app)/repos/[repo]/     /repos/:repo  one repo: its iterations + backlog
app/(app)/iterations/[id]/  /iterations/:id  one iteration: the task DAG + per-task derived status
app/(app)/settings/         /settings     connections (GitHub App), API keys, account
app/(marketing)/            marketing / landing + the AEG explainer
```

- Logged-in home is `/queue` (the attention queue is the default view — the product's point is "what needs me now").
- Nav: **Queue · Repos · Settings**. Iterations and repo detail are reached by drilling in, not top-level nav.
- The DAG renders via `@atta/ui/engine-flow` (React Flow / `@xyflow/react`) — the same renderer Vāda uses for its engine-flow visualization. No new graph dependency.

---

## 3. The three layers

The product decomposes into three clean layers, in dependency order. This is also the build order (see `aeg-backlog.md`).

### 3.1 `deriveIteration(file, forge)` — pure projection (no I/O)

A pure function: given a parsed iteration topology file + a snapshot of forge facts (Issues, branches, PRs, reviews, merges), return the iteration's derived state — each task's status (in-flight / in-review / changes-requested / merged / blocked), the DAG with edges, and which tasks are dispatch-eligible (depends-on merged, no conflicting sibling PR open). **No network, no storage, no GitHub client.** This is the heart of the product and the easiest thing to test exhaustively, so it is built and tested first, in isolation.

### 3.2 GitHub App auth + encrypted token store

Connect a repo via a **GitHub App** (OAuth, **read-only**, per-repo). Tokens are encrypted at rest with `@atta/crypto` (the same envelope-encryption backbone Vāda uses for provider keys — AES-256-GCM, AAD-bound, `MASTER_ENCRYPTION_KEY`). Read-only is a hard constraint: the AEG UI observes; it never writes status, never moves an Issue, never merges. (Writing is what an orchestrator like Cetana does — and the UI only *reads the result* of that writing, from the forge.)

### 3.3 Webhook-fed forge-fact cache

Raw GitHub reads do not scale within rate limits for a live board. A webhook-fed cache stores **forge facts** (Issue state, branch existence, PR state, review decision, merge) — never authored status. The cache is a performance projection of the forge, not a second source of truth; on conflict the forge wins. `deriveIteration` runs against the cache.

---

## 4. `aeg.sh` — the adoption scaffolder

The product is not only the UI. Adopting AEG in a fresh repo means laying down a specific folder structure (the `aeg-root/` model docs, `iterations/`, the `specs/*-backlog.md` convention per D-037, the branch/label conventions). Doing that by hand is error-prone and is the friction that keeps AEG from spreading beyond this monorepo.

`aeg.sh` is a **neutral scaffolder script** (a D-029 build follow-up, moved here as part of the product): run it in a repo, answer a couple of prompts (or pass flags), and it creates the AEG structure — including, when you **specify a project/unit**, that unit's folders (`apps/<unit>/specs/<unit>-backlog.md`, `apps/<unit>/aeg-project/{state,now}.md`) following the D-037/D-041 convention (plan in `specs/`, model in root `aeg-root/`, state in `aeg-project/`). It is *neutral* — it encodes the AEG model, not Atta-specific content — so any team can adopt the architecture.

Relationship to the UI: the scaffolder lays down what the UI reads. They are two halves of "make AEG adoptable": `aeg.sh` writes the structure, the UI renders it. The interactive product supersedes the static `diagrams/` as the explanation of the model.

**Status:** specified, not built. Sequenced in `aeg-backlog.md`.

---

## 5. Identity & data

Under the single-Clerk-app, `.attalabs.dev`-cookie model (like Vāda, unlike Herald's standalone Clerk app). The AEG product is part of the AttaLabs ecosystem proper. Reuses `@atta/crypto` for the GitHub token vault, `@atta/db` for the cache schema, `@atta/ui` (incl. `@atta/ui/engine-flow`) for rendering. Deploy target `aeg.attalabs.dev` (covered by the `*.attalabs.dev` wildcard CNAME).

Folder naming: `apps/aeg` carries **no `-ai` suffix**, matching the meta/infra-app convention (`apps/attalabs`, `apps/desktop`) rather than the product-app convention (`apps/vada-ai`, `apps/herald-ai`). AEG is infrastructure for building, not an end-user AI product.

---

## 6. What this product is NOT

- **Not a general GitHub dashboard.** It renders AEG repos via AEG conventions; a non-AEG repo shows nothing meaningful.
- **Not a writer.** Read-only against the forge. It never stores or mutates execution status — that would recreate the racing status model D-029 eliminated. It projects; it does not author.
- **Not Cetana, and does not contain Cetana.** Cetana is the optional orchestrator (a sibling product). The UI may *render* an orchestrator's activity as forge facts, but the orchestrator is never a dependency or a sub-package here. AEG does not know Cetana.
- **Not a planning tool.** The backlog is the seam where AEG meets whatever planning tool a team uses; AEG renders the plan but is indifferent to how it was authored.

---

## 7. Dogfooding

The AEG product is built *through* AEG: it is the designated first real iteration (`aeg-backlog.md`). Building the thing that visualizes the flow, using the flow, is the intended proof. Its own `aeg-project/` (state + now) and this `specs/` set follow the same conventions the product reads — the product can render its own repo.
