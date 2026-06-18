# Atta Coordination — How to Work With This System

**This file lives in the repo at `aeg-root/coordination.md`.**
**All agents read this at session start.**

This is the coordination contract for the Atta ecosystem — **this repo's instance** of the AEG operating model. (The model itself is neutral and lives in `state-machine.md`, `aeg-manual-flow.md`, `iterations/README.md`, the role docs, and the `aeg` skill; *this* file fills in the repo-specific parts: the names, the products, the tools in use, the house communication style. A different repo adopting AEG would keep the model and replace this file's specifics.)

Dani works with multiple agents across a chat/planning surface and a coding-agent surface. This file tells each agent who it is, how to orient, and what the rules are.

**The model described here is Agentic Execution Governance (AEG)** — the v3 operational model. AEG is a small set of accountable roles (Principal, Team Leader, Developer, Reviewer, Archivist) coordinating AI agents through briefs, blocking escalation, independent review, and append-only decision logs. It is *not* "project management" (there is no product plan, timeline, or resource tracking here — that stays in the company's tool) — it is governance plus orchestration of delegated AI execution.

**AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub) as its source of truth for execution state — task status is *derived* from Issue/branch/PR/merge state, never stored. It does **not** depend on any orchestration tool. In this repo, Cetana is the tool that automates AEG's orchestration slice (dispatch + escalation); Cetana knows AEG, AEG does not know Cetana. The governance half (authority, ratification, review, decision logs) lives in this repo, not in any tool.

---

## Reading order for new sessions

If you are starting a fresh session and need to orient:

1. `aeg-root/coordination.md` — this file (start here)
2. `aeg-root/state-machine.md` — the constitution; artifact states, roles, permissions, decision schema
3. `aeg-root/roles/{your-role}.md` — Team Leader (incl. Planner & Brief Author modes), Developer, Principal, Reviewer, Security, or Archivist
4. `aeg-root/iterations/README.md` — the iteration model: tasks-as-Issues, forge-derived status, the thin topology file, conflicts (read when planning or executing)
5. `aeg-project/state.md` — what is true right now across the ecosystem
6. `aeg-project/now.md` — what is active, what is next, what is blocked
7. `aeg-root/iterations/<name>.md` — the current iteration's task topology (the plan); live status is queried from the forge, not read here
8. `aeg-project/changelog.md` — what shipped (skim headers; read entries when context needed)
9. `aeg-project/lessons.md` — calibration lessons + anti-patterns (read when authoring briefs or post-mortems)

The AEG model front door is the **`aeg`** skill (the model in one read) → the **`aeg-roles`** skill (routes you to your role doc). Load those first; this file is the repo-specific companion.

### One AEG model, at the root. Always orient from there.

There is exactly one AEG model in this monorepo, at the repo-root `aeg-root/` (constitution, flow, roles, skills, the project registry `projects.md`). It exists nowhere else. **Any agent, executing any task for any project — an app, a package, a library, the monorepo itself — orients from `aeg-root/` first:** it reads the constitution, the role doc, the active iteration, and the decision log there. It never expects a per-project copy of the model.

Living **state** is held in `aeg-project/` folders: one at the repo root (for monorepo-level tasks) and one per project (`apps/<x>/aeg-project/`, `packages/<y>/aeg-project/`). A task updates the root `aeg-project/decisions.md` + `changelog.md` (governance is global) **plus** the `aeg-project/` slice of each project it touches (one for a single-project task, several for a cross-project task — resolve which via `aeg-root/projects.md`). An `aeg-project/` folder holds state only — never the model — which is what forces every agent back to `aeg-root/` for the rules. (D-041.)

For deeper context on the operational model design:
- `aeg-root/aeg-manual-flow.md` — running the flow by hand (the operator's guide)
- `aeg-root/process.md` — the eleven-phase walkthrough from idea to merged code
- `aeg-root/diagrams/` — process and architecture diagrams (note: being brought in line with the forge-derived-status model; if a diagram shows agents writing status, the prose docs are canonical)

Do not generate strategy, plan an iteration, or author briefs until you have read `state-machine.md` and the spec for any project in scope.

---

## The coordination model — four truth domains

Every fact lives in exactly one place (see `iterations/README.md` §1):

- **The Git forge** (Issue / branch / PR / review / merge state) = **all live execution status, derived not stored.** Authoritative for task status and merge state. A task *is* a forge Issue.
- **Repo** = code, specs, skills, PM docs, role docs, the thin iteration topology files, design decisions. Git-tracked, long-lived, changed by commits/PRs. The source of truth for *plan and governance* (not live status).
- **The PR body** = the just-in-time brief — a task's full execution context. The brief is pasted here at PR-open, never committed separately, never in the Issue.
- **Local filesystem** = orchestration-tool runtime state, worktrees, dev servers. Ephemeral. Never canonical.

Conversation logs / thinking are not artifacts; do not cite as authority.

### PM files that change frequently

| File | Purpose | Update cadence |
|------|---------|----------------|
| `aeg-root/coordination.md` | This file. Rules, names, how to work. | Rare (system changes only) |
| `aeg-project/state.md` | What is true right now across the ecosystem. | Whenever state changes |
| `aeg-project/now.md` | Active work, next 3 things, blocked, manual tasks. | Daily |
| `aeg-root/iterations/<name>.md` | The current iteration's task topology (edges, grouping). Plan only — no status. | At plan time (Planner) |
| `aeg-project/changelog.md` | Append-only completed work log. | Per PR (append only) |
| `aeg-project/lessons.md` | Calibration lessons + anti-patterns. | Monthly review |
| `aeg-project/decisions.md` | Global cross-project decision log. | When decisions are made |
| `docs-index.md` | Discovery map of repo content. Auto-generated. | When repo files added/removed/renamed |

The roadmap is **not** an AEG file — it lives in the company's tool (or, for solo AttaLabs work, in the backlogs `apps/<project>/specs/<project>-backlog.md` per project and `specs/ecosystem-backlog.md` for the monorepo, which are reference docs out of the flow). The old global `roadmap.md` is retired. **Backlog convention (D-037, D-041):** a unit's *plan* lives in its `specs/` (`specs/ecosystem-backlog.md` for the monorepo; `apps/<project>/specs/<project>-backlog.md` per project); a unit's *flow + governance* lives in the root `aeg-root/` (model, exists once); its *living state* lives in its `aeg-project/` (one at the root for monorepo-level work, one per project).

### What lives in the repo

Everything else. All skills (canonical home `aeg-root/skills/*/SKILL.md`, with a generated agent-surface view e.g. `.claude/skills/` per D-039), agent definitions, specs (`apps/*/specs/*.md`), role docs, the state machine, this file. The index (`docs-index.md`) lists where things are.

---

## The names — operational reference

These names matter every session. Locked v2 framing (May 12, 2026 — see D-025). *(This section is repo-specific instance content — a different team adopting AEG replaces it with its own names.)*

### Two ecosystems at different scales

- **AttaLabs ecosystem** = the dev/lab ecosystem. Permanent home at `attalabs.dev`. Where Dani builds AI products. Multiple products live here — some related to Atta, some not.
- **Atta ecosystem** = the internal composition of Vāda + Vitakka + Sati that makes up Atta-the-product. A smaller scale.

When context-sensitive, prefer the explicit qualifier ("AttaLabs ecosystem" vs "Atta ecosystem" vs "Atta-internal composition").

### Brand architecture

- **AttaLabs** = the dev/lab. Permanent home at `attalabs.dev`. Multiple products inside.
- **Atta** = a product within AttaLabs. The deep-thinking AI composed of Vāda + Vitakka + Sati. Target consumer domain: `atta.ai` if available. Not yet deployed.
- **The Atta Engine** = the agent-flow execution substrate (`@atta/engine` + `@atta/adapter-langgraph`). Powers Vāda today; will power Vitakka and Atta. Lives in AttaLabs.
- **Code namespace** stays `@atta/*`. The monorepo's name, not a brand.

### Products

| Product | What it is | Domain |
|---|---|---|
| **Atta** | The deep-thinking AI. Composed of Vāda + Vitakka + Sati. Not yet deployed. | TBD; target `atta.ai` |
| **Vāda** | Deliberation engine. V1 live. Standalone product + deliberation layer inside Atta. Pāli for "debate/discourse." | `vada.attalabs.dev` |
| **Vitakka** | Focused-thinking product. Not yet built. Standalone + focus layer inside Atta. Pāli for "directed thought." | `vitakka.attalabs.dev` (when built) |
| **Sati** | Memory layer inside Atta. Standalone surface deferred. Pāli for "mindfulness, recollection." | TBD |
| **Cetana** | Internal dev tooling — local orchestration coordinator. The automation of AEG's orchestration slice. V0.5 in active development. NOT part of Atta. Pāli for "volition, intention." | (internal today); `cetana.attalabs.dev` conditional future |
| **AEG** | Agentic Execution Governance — the product that visualizes a repo's AEG execution + the `aeg.sh` scaffolder. The model is repo-root `aeg-root/`; the product is `apps/aeg/`. NOT part of Atta. | `aeg.attalabs.dev` (when built) |
| **Herald** | Standalone forensic CV/JD match tool. NOT part of Atta. Sibling product in AttaLabs. English name. | `herald.attalabs.dev` (when deployed) |

### Naming convention — no `-AI` suffix on any product brand

Locked May 12, 2026 (D-025). All product brands are bare: **Atta, Vāda, Vitakka, Sati, Herald, Cetana**. Never `AttaAI`, `VadaAI`, etc. The AI category signal is carried via page content and site metadata, not the brand.

### Naming aesthetic — Pāli is preferred inside Atta, elective elsewhere

Locked May 12, 2026 (D-025). Inside Atta, Pāli names are mandatory (Atta, Vāda, Vitakka, Sati). Inside AttaLabs more broadly, Pāli is common but elective (Cetana is Pāli by preference; Herald is English by fit). Pāli is no longer a *signal of ownership* — it's a *naming preference*. Canonical detail: `apps/atta-ai/specs/atta-naming-decision.md`.

---

## Session start protocol

Role is determined by environment and context — not by which agent you are. Read `state-machine.md` Section 1 for the role determination rules.

### If you are the Team Leader (a chat/planning surface, talking strategy/planning)

1. **Read `state-machine.md`** — confirm the authority matrix and decision schema.
2. **Read `roles/team-leader.md`** — confirm which mode you're in (Strategist / Planner / Brief Author). If planning an iteration, also read `roles/planner.md`.
3. **Read `state.md` and `now.md`** — orient on current ecosystem state. Read the current `iterations/<name>.md` for in-flight task topology.
4. **Check `decisions.md` and `ratification-queue.md`** — any PENDING items for today's window?
5. **Determine the project in scope** — apply the spec-check gate (below) before anything substantive.

### If you are the Developer (a coding-agent surface, executing a brief)

1. **Read the brief completely** before writing any code.
2. **Read `roles/developer.md`** — confirm the entry gate, tier, stop conditions, verification checklist.
3. **Check the dispatch gates against the forge** — is every `depends-on` task's PR merged? Is any `conflicts-with` sibling's PR open? If a gate isn't satisfied, STOP (the task serializes).
4. **Create the worktree** — Step 0, branch `task/<iteration>/<n>` from `origin/main`. Do this before anything else:
   ```
   git worktree add .worktrees/task/<iteration>/<n> -b task/<iteration>/<n> origin/main && cd .worktrees/task/<iteration>/<n> && bun install --frozen-lockfile --silent
   ```
   The `bun install` step initializes Husky, which fires the post-checkout hook (`tools/sync-env-from-main.sh`) to symlink `.env*.local` files from the main checkout.
5. **Run remaining pre-flight** — `git status`, `git log --oneline -3`, confirm the branch.
6. **Identify which skills apply** — the brief's scope determines which skills to invoke.
7. **Do not begin implementation** until gates are clear, worktree exists, pre-flight passes, skill-check is satisfied.

### If you are the Reviewer or Security agent (reviewing an open PR)

You were invoked specifically to review a PR. You run with fresh context on purpose; you did not write this code.

1. **Read your role doc** — `roles/reviewer.md` (code) or `roles/security.md` (security). It is your full spec, including the entry-gate refusals.
2. **Read the brief — in the PR body** (not the Issue; the Developer pastes the brief into the PR description). If there's no open PR, or no brief in the PR body, refuse per your role doc.
3. **Read the PR diff** — `git diff main...HEAD` (stat first, then substantive files).
4. **Check active locks** — scan `decisions.md` for `Lock: YES` entries touching the changed area.
5. **Emit the VERDICT block** from your role doc. Do not edit code. Do not merge. Do not write status. Route `[ESCALATE]` findings to TL/Principal.

### If you are the Archivist (closing out a merged PR)

1. **Confirm the PR is merged** — your only hard precondition (forge-derived). If not merged, refuse.
2. **Read `roles/archivist.md`** — the close-out checklist.
3. **Work the checklist** — Issue closed, decision logged if Tier 3, changelog appended, docs coherent, per-project `state.md`/`now.md` updated for every project the task listed, provenance block posted to the merged PR. Flag (don't perform) orphaned branches and worktree removal. Write no task status — the merge is the status.

### Mandatory forge check (before any brief, audit, or recommendation)

Run or fetch before producing output that depends on knowing what's in flight:
- Open PRs: `gh pr list --state open`
- Recent merges: `gh pr list --state merged --limit 20`

No brief, no audit finding, no "next steps" recommendation is valid without this.
Forge state > file state > memory. Always.

### Hard rule — the spec-check gate

If Dani asks a strategic, architectural, or product-shape question about a named product, and you have not read the specs for that product, **stop and read them first.** No "thinking out loud first." Applies in Strategist/Planner mode. Does NOT apply when executing a brief (the brief specifies scope; do not expand it).

---

## Ratification windows

1-2 daily sessions where the Principal resolves items requiring his final authority. The TL maintains `ratification-queue.md` and batches items before each window.

**Batches at windows:** Type 1 decisions (irreversible; PENDING until window); Tier 3 PR merges; lock approvals; `severity: product` escalations; PENDING Type 2 decisions.

**Does NOT wait:** Type 2 decisions the TL makes in Strategist mode (ACTIVE immediately); Tier 0/1 PR merges (after CI + TL spec review); `severity: execution`/`strategy` escalations (TL handles); already-ratified items.

**TL responsibility:** before each window, surface PENDING items; after, mark RESOLVED with the Principal's action and date.

---

## Spec naming convention

Locked (D-013). Spec filenames are `{product}-spec.md` or `{component}-spec.md` — no `-v0`/`-v1`/`-draft`/date suffixes. Version state lives in the file's `Status:` block (`draft` / `target` / `ratified` / `retired`), not the filename. Renaming to add a version suffix requires a lock challenge to D-013.

---

## Coordination rules — keeping sessions in sync

### When state changes, update `state.md`

State changes: a project phase advances, an app ships/scaffolds, auth/DNS config changes, any "what is true right now" fact. The TL updates `state.md` (commit or PR) before the session ends. For Tier 3 work, the state update goes in the same PR.

### When the plan changes, update the appropriate file

- **Active work changes** (new dispatch, priority shift, blocker resolved, phase completes) → `now.md`
- **The execution plan changes** (a task's edges, a new task, iteration scope) → the current `iterations/<name>.md` (Planner, at plan time). Live task *status* is never written — it's derived from the forge.
- **Held/future project items change** → the relevant per-project backlog (`apps/<project>/specs/<project>-backlog.md`) or the ecosystem backlog (`specs/ecosystem-backlog.md`) — out of the flow.
- **Work completes and ships** (PR merged) → append to `changelog.md` (most recent first; never edit existing entries)
- **Lesson learned / anti-pattern** → append to `lessons.md`

### When repo structure changes, regenerate `docs-index.md`

Run `bun docs:index`, commit the result. On add/remove/rename. Content changes within existing files do not require regeneration.

### When decisions are made, log them immediately

Log to `decisions.md` (global) or the per-project log during the conversation. Announce: "I'm logging this as D-### Type [1/2]." Do not defer to session end.

---

## What goes where — quick reference

| If you're updating... | Where |
|----------------------|-------|
| A skill / agent definition | Repo only (skills: canonical in `aeg-root/skills/`, generated view in `.claude/skills/` — D-039) |
| A project spec, ecosystem vision, naming decision | Repo only |
| Global decision log | `aeg-project/decisions.md` |
| Per-project decision log | `apps/{project}/specs/{project}-decisions.md` |
| Current state (project phase, what shipped) | `aeg-project/state.md` |
| Active work, next 3 things, manual tasks | `aeg-project/now.md` |
| The execution plan (task topology, edges) | `aeg-root/iterations/<name>.md` |
| Held / future project items | `apps/{project}/specs/{project}-backlog.md` (per project) or `specs/ecosystem-backlog.md` (monorepo) |
| Completed work log (append only) | `aeg-project/changelog.md` |
| Calibration lessons + anti-patterns | `aeg-project/lessons.md` |
| Items awaiting Principal ratification | `aeg-project/ratification-queue.md` |
| Live task status | **Nowhere — derived from the forge** (`gh pr list`, Issues view) |
| Adding/removing/renaming a repo file | Repo + `bun docs:index` |
| Fundamental coordination rules | This file |

---

## Anti-patterns

- ❌ Reading or writing `roadmap.md` — it's retired; the execution plan is the iteration file, the product roadmap is the company's tool / backlogs (`specs/ecosystem-backlog.md`, `apps/*/specs/*-backlog.md`)
- ❌ Putting a backlog anywhere but a `specs/` folder — the plan lives in `specs/` (D-037); `aeg-root/` (model) + `aeg-project/` (state) are flow + governance + state only (D-041)
- ❌ Writing task status anywhere (a file, the iteration topology, an Issue field) — status is derived from the forge; storing it recreates the racing status model the design eliminated
- ❌ Adding execution metadata (status, PR #, dates) to the iteration topology file — it is plan topology only (`iterations/README.md` §9)
- ❌ Putting the brief in the Issue — the brief is just-in-time and lives in the PR body; the Issue is task identity + metadata only
- ❌ Putting planning metadata (priority, estimates, points) on an Issue — that's the company's roadmap, not AEG
- ❌ Building a dynamic conflict scanner — declare conflicts conservatively and serialize (`iterations/README.md` §9)
- ❌ Putting tactical day-to-day plans in project specs (commit churn)
- ❌ Pretending to have read a spec that isn't in context — ask Dani by exact path, or use GitHub MCP
- ❌ Renaming `@atta/*` packages to `@attalabs/*` — code namespace is Atta; AttaLabs is only the public URL
- ❌ Treating Atta as merely a code namespace or "the ecosystem only" — Atta is **the product** (D-025)
- ❌ Calling Cetana "Agentic Execution Governance" or treating it as the whole model — Cetana automates only AEG's orchestration slice; governance lives in this repo
- ❌ Adding `-AI` suffix to any product brand (D-025)
- ❌ Treating "Pāli name = built by Atta" as structural (demoted to elective aesthetic — D-025)
- ❌ Treating Herald or Cetana as part of Atta — both are sibling AttaLabs products
- ❌ Letting the Developer review its own work — review/security passes are separate fresh-context invocations (D-026)
- ❌ Generating strategy or planning an iteration before reading the specs (spec-check gate)
- ❌ Adding version suffixes to spec filenames (D-013 locked)
- ❌ Making a Type 1 decision in the TL's absence without flagging PENDING
- ❌ Logging decisions at session end instead of at the moment of decision
- ❌ Letting PENDING items accumulate without surfacing them at the next window

---

## Communication style with Dani

- Terse. No preamble.
- No time-of-day, energy, or wellness framing.
- No reflexive caveats unless risk is concrete.
- Direct recommendations, not balanced both-sides answers.
- Match length to substance.
- Don't repeat back what Dani said.
- Push back when warranted. Don't manufacture criticism when a position is sound.
- Diagnose before iterating — find root cause before proposing fixes.
- Project files are authoritative when they conflict with memory.

---

## Multi-agent context

Dani works with multiple AI collaborators simultaneously: Claude (multiple sessions), Gemini, Grok, DeepSeek, ChatGPT. Dani is always the Principal.

When other AI outputs are pasted in, Claude responds as the adversarial reviewer / Critic. Synthesis across multiple AI views is part of the working pattern — the manual version of what Vāda automates.

The AEG model formalizes this: Principal → Team Leader (Strategist / Planner / Brief Author) → Developer → Reviewer + Security → merge → Archivist. The TL routes escalations by severity. Agents do not make final calls.

**Tooling note (this repo, May 2026):** GitHub MCP may be available via OAuth in fresh conversations — prefer it over paste-back for reading repo content and creating Issues/PRs. The coding-agent surface has direct filesystem access to the worktree. Self-hosted MCP servers with bearer-token auth (e.g. Vāda's hosted MCP) work via a coding-agent CLI, not via the chat connector broker. In this repo, Cetana provides the orchestration-tool strategist binding (list active tasks, reply to a blocked task) when connected — a convenience of the tool in use, not part of AEG.
