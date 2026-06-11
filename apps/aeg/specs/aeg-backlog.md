# AEG — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future items for AEG **the product** (the UI + the `aeg.sh` scaffolder). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it. Per D-037, this plan lives in `specs/`; the product's flow + governance + living state live in `apps/aeg/aeg-project/`.

Moved here 2026-06-10 from `specs/ecosystem-backlog.md`, where the AEG-UI write-up lived while the product had no folder. The model-level AEG build-out items (entry gates in role docs, Archivist checklist, Planner mode, dispatch-gate enforcement) stay in the ecosystem backlog — those improve the *model* and touch root `aeg-root/`, not this product.

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

---

## Open product-shape questions (unresolved — resolve by building, not by debating)

These were surfaced in the June 10 product-shape discussion and are deliberately left **open**. The first iteration (the read path / `deriveIteration` + a single rendered view) does not depend on resolving them — both candidate audiences and both deploy models share the same core engine. Decide each *after* there is something real to look at.

- **OQ-aeg-1 — Who is the primary viewer: the eng-leader (observe & trust) or the dev (operate)?**
  The discussion leaned toward AEG-UI as an **observability / trust instrument for the people not in the terminal** — TLs, PMs, CTOs who are anxious that AI is changing the codebase invisibly and want to *see it is governed*. That reframes the product thesis from "a nicer board for devs" to "the pane of glass that proves AI work is controlled" — a stronger reason for an eng-leader (the buyer) to pay. But it is not yet decided vs. the dev-operation framing (attention queue as home). **Consequence if leader-first:** the home screen is a governance overview ("across your repos, here's what AI did this week, what's reviewed, what's pending a human"), not the dev's attention queue. Resolve after the first iteration renders real data. Both framings build on the same `deriveIteration` core, so the engine is built either way; only the first *view* differs (cheap, late, reversible).

- **OQ-aeg-2 — What is forge-derived vs. what needs a new fact source (the cost/token tier)?**
  A key finding: the observability a leader most wants splits in two.
  - **Forge-derived (free; works on any AEG repo, zero extra infra):** task progress, Jira/ticket links (the brief's `Ticket:` field), files-changed-per-PR, review cycles / human↔agent iteration count (PR commit + review timestamps), which role did what (PR timeline + the D-030 provenance block), issues found in review (review verdicts + REQUEST_CHANGES count). This is the honest, dependency-free **Tier 1** of the UI.
  - **NOT forge-derived (needs the execution layer to emit it):** token consumption, money spent, actual agent/model used at runtime (Claude Code vs Codex), how long an agent ran. The forge never sees these. The **only** component positioned to emit them is the orchestrator (Cetana, or a documented "emit usage in this format" contract) — it is the only thing present when the agent burns tokens. So a usage/cost **Tier 2** is an *optional enhancement* that lights up when the execution layer cooperates; it must not become a dependency of the pure-forge Tier 1, and AEG stays indifferent to *which* orchestrator (exactly like the existing "render orchestrator activity as forge facts" item below). **Open:** whether to build Tier 2 at all, and whether to couple it to Cetana emission or define a neutral usage-fact contract. Resolve after Tier 1 forge observability proves out.

- **OQ-aeg-3 — Deploy model: local-first (self-hosted, single-tenant) vs. hosted public SaaS?**
  The current architecture spec (§3.2 GitHub App, §3.3 webhook cache, §5 Clerk) quietly commits to **hosted public SaaS** — which is a real business with real weight: account management, an encrypted vault holding *other people's* GitHub credentials (a serious liability surface), webhook infra, GitHub App review, multi-tenant isolation, billing. That sits in tension with AEG's core identity ("forge-native, depends on nothing external, runs by hand"): a hosted service that holds everyone's tokens is nearly the opposite stance. **The resolution is probably not either/or:** `deriveIteration` is identical regardless of deploy model — the only difference is the I/O edge (local: read files off disk + your own token; hosted: GitHub App + webhook cache + token vault). So a **local-first** version (run it next to your repo, your token, zero accounts/vault) ships the real value with none of the SaaS liability, and **hosted becomes a later optional deployment of the same core** — consistent with "the UI is optional, like Cetana is optional." **Open:** confirm local-first as the default and hosted as a later tier, vs. committing to hosted from the start (e.g. if watching repos you are not checked out on, from a phone, is a day-one requirement). Resolve before building task 2 (auth/token store), since that task is the fork point.

  **Design caution captured alongside these (not an OQ, a guardrail):** per-agent/per-role "performance reports" are valuable as **descriptive** observability ("here's what happened") but dangerous as **evaluative** scoring ("agent X is slow, role Y causes rework"). The moment the dashboard ranks agents or people, it becomes a surveillance tool and the measured parties game it (smaller PRs to look clean, fewer review comments to seem issue-free). Build observability that *informs*, not that *scores*. Decide which is being built before designing any report.

---

## `aeg.sh` — the adoption scaffolder

- **Neutral AEG scaffold + downloadable `aeg.sh`** (a D-029 build follow-up). A script that lays down the AEG folder structure in any repo, and — given a specified project/unit — creates that unit's folders following D-037 / D-041 (`apps/<unit>/specs/<unit>-backlog.md` + `apps/<unit>/aeg-project/{state,now}.md`). Neutral: encodes the model, not Atta content. The interactive product supersedes the static `diagrams/` as the model's explanation. Sequence after (or alongside) the UI's derive module — they share the iteration-file/structure schema. (Per D-041: subcommand is `aeg add-project`; the model is scaffolded into `aeg-root/`, state into `aeg-project/`.)

## Later / open

- **Render orchestrator activity (e.g. Cetana) as forge facts.** When an orchestrator dispatches/escalates, that shows up on the forge; surface it read-only in the queue. AEG stays indifferent to *which* orchestrator. Not before the core read path works. (This is the mechanism OQ-aeg-2's Tier 2 builds on.)
- **Provenance block surfacing (D-030).** Once the Archivist posts provenance to merged PRs, render it in the iteration history view — the legible, exportable audit trail (the regulated wedge). Depends on D-030 provenance being produced in practice. (Directly feeds OQ-aeg-1's leader-observability framing.)
- **Multi-tenant hardening.** The architecture is multi-repo/tagged from day one, but team usage (multiple humans, per-user GitHub App installs, permissions) is hardening deferred until the single-user product proves out. (Coupled to OQ-aeg-3 — only relevant in the hosted tier.)

---

*AEG the product visualizes AEG the model. The model lives at repo-root `aeg-root/` (D-041). Cetana (the optional orchestrator) is a sibling at `apps/cetana-ai/` — AEG does not know Cetana.*
