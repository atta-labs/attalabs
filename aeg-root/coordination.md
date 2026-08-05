---
sidebar_title: Coordination
---
# Atta Coordination — How to Work With This System

**This file lives in the repo at `aeg-root/coordination.md`.**
**All agents read this at session start.**

This is the coordination contract for the Atta ecosystem — **this repo's instance** of the AEG operating model. (The model itself is neutral and lives in `state-machine.md`, `aeg-manual-flow.md`, `tranche-model.md`, the role docs, and the `aeg` skill; *this* file fills in the repo-specific parts: the names, the products, the tools in use, the house communication style. A different repo adopting AEG would keep the model and replace this file's specifics.)

Dani works with multiple agents across a chat/planning surface and a coding-agent surface. This file tells each agent who it is, how to orient, and what the rules are.

**The model described here is Agentic Execution Governance (AEG)** — the v3 operational model. AEG is a small set of accountable roles (Principal, Planner / Brief Author, Developer, Reviewer, Archivist) coordinating AI agents through briefs, blocking escalation, and independent review. It is *not* "project management" (there is no product plan, timeline, or resource tracking here — that stays in the company's tool) — it is governance plus orchestration of delegated AI execution.

**AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub) as its source of truth for execution state — task status is *derived* from Issue/branch/PR/merge state, never stored. It does **not** depend on any orchestration tool. The governance half (authority, ratification, review) lives in this repo, not in any tool.

---

## Reading order for new sessions

If you are starting a fresh session and need to orient:

1. `aeg-root/coordination.md` — this file (start here)
2. `aeg-root/state-machine.md` — the constitution; artifact states, roles, permissions, decision schema
3. `aeg-root/roles/{your-role}.md` — Planner / Brief Author (incl. Planner & Brief Author modes), Developer, Principal, Reviewer, Security, or Archivist
4. `aeg-root/tranche-model.md` — the tranche model: tasks-as-Issues, forge-derived status, the thin topology file, conflicts (read when planning or executing)
5. **Per-project state (pinned Issues)** — what is true right now, per project (`aeg`, `vada`, `herald` — one pinned Issue each, found via the repo's native Pinned Issues view, not a memorized number) plus the ecosystem-wide bucket (`aeg-core`/`atta`/`desktop`/`attalabs` + cross-project facts, its own pinned Issue). Non-derivable operational facts; current focus pointer.
6. **Derive current execution state from the forge** — see the "Session-start forge queries" section below
7. `aeg-root/tranches/<name>.md` — the current tranche's task topology (the plan); live status is queried from the forge, not read here. **Post-cutover:** most active tranches no longer have this file at all — task→Issue topology derives straight from the forge (a Milestone + `tranche:<slug>`-labeled Issues). **No active tranche carries this file at all today** — the last tracked exception's file was deleted once its backfill completed (`tranche-model.md` §4); `completed/` tranches keep theirs permanently, by design, and `check-no-disk-state.ts` now CI-blocks adding a new active one.
8. **Lessons log (pinned Issue)** — calibration lessons + anti-patterns, one comment per lesson (read when authoring briefs or post-mortems)

The AEG model front door is the **`aeg`** skill (the model in one read) → the **`aeg-roles`** skill (routes you to your role doc). Load those first; this file is the repo-specific companion.

### One AEG model, at the root. Always orient from there.

There is exactly one AEG model in this monorepo, at the repo-root `aeg-root/` (constitution, flow, roles, skills, the project registry `projects.md`). It exists nowhere else. **Any agent, executing any task for any project — an app, a package, a library, the monorepo itself — orients from `aeg-root/` first:** it reads the constitution, the role doc, and the active tranche there. It never expects a per-project copy of the model.

Living **state** is held in pinned forge Issues (lessons, per-project operational state): one root ecosystem-wide pinned Issue (covering `aeg-core`/`atta`/`desktop`/`attalabs` — projects with no dedicated folder — plus cross-project facts) and one pinned Issue per project with its own folder (`aeg`, `vada`, `herald`, `cetana`). A task updates the pinned state Issue of each project it touches (one for a single-project task, several for a cross-project task — resolve which project via `.vinaya/projects.md`, then which Issue via this list or `gh issue search`). This state layer holds facts only — never the model — which is what forces every agent back to `aeg-root/` for the rules.

For deeper context on the operational model design:
- `aeg-root/aeg-manual-flow.md` — running the flow by hand (the operator's guide)
- `aeg-root/process.md` — the thirteen-phase walkthrough from idea to merged code
- `aeg-root/diagrams/` — process and architecture diagrams (note: being brought in line with the forge-derived-status model; if a diagram shows agents writing status, the prose docs are canonical)

Do not generate strategy, plan a tranche, or author briefs until you have read `state-machine.md` and the spec for any project in scope.

### Session-start forge queries — deriving current state

`now.md` is retired. Current execution state is **derived from the forge**, not read from a file. Run these queries to answer the three orientation questions:

**"What's active?"** — open Issues with an `tranche:<slug>` label, or check open PRs:
```bash
gh issue list --label "tranche:<slug>" --state open
gh pr list --state open
```

**"What's next?"** — open Issues in the current tranche that have no open PR (unassigned branch):
```bash
gh issue list --label "tranche:<slug>" --state open --assignee ""
# Then for each: gh pr list --state open | grep "task/<slug>/"
```

**"What's blocked?"** — Issues with the `aeg:blocked` label:
```bash
gh issue list --label "aeg:blocked" --state open
```

**"What's the current focus?"** — read the ecosystem pinned state Issue's "Current focus" section and the active tranche file at `aeg-root/tranches/<name>.md`.

**"What merged recently?"** — `gh pr list --state merged --limit 20`

No brief, no audit finding, no "next steps" recommendation is valid without this forge check. Forge state > file state > memory. Always.

---

## The coordination model — four truth domains

Every fact lives in exactly one place (see `tranche-model.md` §1):

- **The Git forge** (Issue / branch / PR / review / merge state) = **all live execution status, derived not stored.** Authoritative for task status and merge state. A task *is* a forge Issue.
- **Repo** = code, specs, skills, PM docs, role docs, the thin tranche topology files, design decisions. Git-tracked, long-lived, changed by commits/PRs. The source of truth for *plan and governance* (not live status).
- **The PR body** = the just-in-time brief — a task's full execution context. The brief is pasted here at PR-open, never committed separately, never in the Issue.
- **Local filesystem** = orchestration-tool runtime state, worktrees, dev servers. Ephemeral. Never canonical.

Conversation logs / thinking are not artifacts; do not cite as authority.

### PM files that change frequently

| File | Purpose | Update cadence |
|------|---------|----------------|
| `aeg-root/coordination.md` | This file. Rules, names, how to work. | Rare (system changes only) |
| Per-project state (pinned Issue) | Non-derivable operational facts: known production issues, env-var requirements, phase intent, pending manual ops, current-focus pointer. | Whenever state changes |
| `aeg-root/tranches/<name>.md` | The current tranche's task topology (edges, grouping). Plan only — no status. | At plan time (Planner) |
| Lessons log (pinned Issue) | Calibration lessons + anti-patterns. One new comment per lesson. | Monthly review |
| `docs-index.md` | Discovery map of repo content. Auto-generated. | When repo files added/removed/renamed |

> **`now.md` is retired.** Active work, blocked tasks, and next candidates are derived from the forge (see "Session-start forge queries" above). The forge is the single source of truth for what is happening; the per-project pinned state Issue holds what the forge cannot derive.

The roadmap is **not** an AEG file — it lives in the company's tool (or, for solo AttaLabs work, in the per-project backlogs `apps/<project>/specs/<project>-backlog.md`, which are reference docs out of the flow). The old global `roadmap.md` is retired, and the monorepo-wide `specs/ecosystem-backlog.md` it once sat beside was deleted with the rest of the stale AEG research — cross-cutting items are cut as backlog Issues instead. **Backlog convention:** a unit's *plan* lives in its `specs/` (`apps/<project>/specs/<project>-backlog.md` per project); a unit's *flow + governance* lives in the root `aeg-root/` (model, exists once); its *living state* lives on the per-project pinned Issue (the old per-unit `aeg-project/` state folder is retired).

### What lives in the repo

Everything else. All skills (canonical home `aeg-root/skills/*/SKILL.md`, with a generated agent-surface view e.g. `.claude/skills/`), agent definitions, specs (`apps/*/specs/*.md`), role docs, the state machine, this file. The index (`docs-index.md`) lists where things are.

---

## The names — operational reference

These names matter every session. Locked v2 framing (May 12, 2026). *(This section is repo-specific instance content — a different team adopting AEG replaces it with its own names.)*

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
| **Vinaya** | Agentic Execution Governance made shippable — the CLI plus Vinaya Studio, the UI that visualizes a repo's AEG execution (`apps/vinaya/`). The model is repo-root `aeg-root/`. NOT part of Atta. | `vinaya.attalabs.dev` |
| **Herald** | Standalone forensic CV/JD match tool. NOT part of Atta. Sibling product in AttaLabs. English name. | `herald.attalabs.dev` (when deployed) |

### Naming convention — no `-AI` suffix on any product brand

Locked May 12, 2026. All product brands are bare: **Atta, Vāda, Vitakka, Sati, Herald, Vinaya**. Never `AttaAI`, `VadaAI`, etc. The AI category signal is carried via page content and site metadata, not the brand.

### Naming aesthetic — Pāli is preferred inside Atta, elective elsewhere

Locked May 12, 2026. Inside Atta, Pāli names are mandatory (Atta, Vāda, Vitakka, Sati). Inside AttaLabs more broadly, Pāli is common but elective (Cetana is Pāli by preference; Herald is English by fit). Pāli is no longer a *signal of ownership* — it's a *naming preference*. Canonical detail: root `CLAUDE.md`'s naming bullets.

---

## Session start protocol

Role is determined by environment and context — not by which agent you are. Read `state-machine.md` Section 1 for the role determination rules.

### If you are the Planner / Brief Author (a chat/planning surface, talking strategy/planning)

1. **Read `state-machine.md`** — confirm the authority matrix and decision schema.
2. **Read `roles/planner.md` or `roles/brief-author.md`** — confirm which of the two you are. Planning a tranche is the Planner; authoring one task's brief is the Brief Author.
3. **Read the ecosystem pinned state Issue** — orient on current ecosystem state, known production issues, and pending manual ops; read the relevant per-project pinned Issue too if scoped to one project. Read the current `tranches/<name>.md` for in-flight task topology.
4. **Derive live execution state from the forge** — run the session-start forge queries above: open Issues by `tranche:<slug>`, open PRs, `aeg:blocked` labels.
5. **Check the `needs:principal-input` label** — any labeled Issues/PRs for today's window? (`gh issue list --label needs:principal-input --state open`, `gh pr list --label needs:principal-input --state open` retired the `ratification-queue.md` file in favor of this label query — historical entries preserved on the pinned ratification Issue.)
6. **Determine the project in scope** — apply the spec-check gate (below) before anything substantive.

### If you are the Developer (a coding-agent surface, executing a brief)

1. **Read the brief completely** before writing any code.
2. **Read `roles/developer.md`** — confirm the entry gate, tier, stop conditions, verification checklist.
3. **Check the dispatch gates against the forge** — is every `depends-on` task's PR merged? Is any `conflicts-with` sibling's PR open? If a gate isn't satisfied, STOP (the task serializes).
4. **Create the worktree** — Step 0, branch `task/<tranche>/<n>` from `origin/main`. Do this before anything else:
   ```
   git worktree add .worktrees/task/<tranche>/<n> -b task/<tranche>/<n> origin/main && cd .worktrees/task/<tranche>/<n> && bun install --frozen-lockfile --silent
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
5. **Emit the VERDICT block** from your role doc. Do not edit code. Do not merge. Do not write status. Route `[ESCALATE]` findings to Planner/Principal.

### If you are the Archivist (closing out a merged PR)

1. **Confirm the PR is merged** — your only hard precondition (forge-derived). If not merged, refuse.
2. **Read `roles/archivist.md`** — the close-out checklist.
3. **Work the checklist** — Issue closed, docs coherent, per-project pinned state Issue updated for every project the task listed (remove stale operational notes; `now.md` no longer exists), provenance block posted to the merged PR. Flag (don't perform) orphaned branches and worktree removal. Write no task status — the merge is the status.

### Mandatory forge check (before any brief, audit, or recommendation)

Run or fetch before producing output that depends on knowing what's in flight:
- Open Issues (current tranche): `gh issue list --label "tranche:<slug>" --state open`
- Open PRs: `gh pr list --state open`
- Blocked Issues: `gh issue list --label "aeg:blocked" --state open`
- Recent merges: `gh pr list --state merged --limit 20`

No brief, no audit finding, no "next steps" recommendation is valid without this.
Forge state > file state > memory. Always.

### Hard rule — the spec-check gate

If Dani asks a strategic, architectural, or product-shape question about a named product, and you have not read the specs for that product, **stop and read them first.** No "thinking out loud first." Applies to the Planner and the Brief Author alike. Does NOT apply when executing a brief (the brief specifies scope; do not expand it).

---

## Ratification windows

1-2 daily sessions where the Principal resolves items requiring his final authority. there is no queue file — the Brief Author applies the `needs:principal-input` label to whichever Issue/PR needs ratification and batches the labeled set (`gh issue list --label needs:principal-input`, `gh pr list --label needs:principal-input`) before each window. Historical entries predating this mechanism are preserved on the pinned ratification Issue.

**Batches at windows:** Type 1 decisions (irreversible; PENDING until window); Tier 3 PR merges; `severity: product` escalations; PENDING Type 2 decisions.

**Does NOT wait:** Type 2 decisions the Brief Author makes (ACTIVE immediately); Tier 0/1 PR merges (after CI + Brief Author spec review); `severity: execution`/`strategy` escalations (Brief Author handles); already-ratified items.

**Brief Author responsibility:** before each window, surface PENDING items; after, mark RESOLVED with the Principal's action and date.

---

## Spec naming convention

Locked. Spec filenames are `{product}-spec.md` or `{component}-spec.md` — no `-v0`/`-v1`/`-draft`/date suffixes. Version state lives in the file's `Status:` block (`draft` / `target` / `ratified` / `retired`), not the filename. Renaming to add a version suffix requires a lock challenge to.

---

## Coordination rules — keeping sessions in sync

### Every repo-file change goes through a worktree + PR — no direct commits to `main`

**Universal rule, every role.** Any change to a repo-tracked file — code, specs, skills, role docs, the tranche topology — reaches `main` through a worktree branch + PR + green merge. **No role commits or pushes directly to `main`.** This applies to the Planner editing the tranche file just as much as the Developer editing code: "I only touched a doc" is not an exemption. The drift that produced this rule was a plan commit landing on `main` with no worktree and nothing stopping it.

This is **mechanically enforced**, not merely asked:
- `.husky/pre-commit` refuses a commit while the current branch is `main`; `.husky/pre-push` refuses any push whose target is `refs/heads/main`. (Husky activates per-worktree via the post-checkout hook, so the guards fire in every worktree.)
- The merge-gate hook `.claude/hooks/check-pr-green.sh` (a `PreToolUse` hook wired in `.claude/settings.json`, sibling to `check-skill.sh`) intercepts every agent merge path — `gh pr merge`, `gh api …/merge`, `curl …/merge`, and the GitHub MCP `merge_pull_request` tool — and **denies the merge unless `gh pr checks <pr>` is all-green**. A red or pending PR cannot be merged by an agent. The gate fails closed: if greenness can't be proven, the merge is denied.

The green-merge + no-direct-commit invariants now live in both these hooks and a GitHub setting: repository ruleset `17656829` ("Main protection") requires the `AEG gate suite`, `Typecheck + unit tests`, and `Review gate` checks on `~DEFAULT_BRANCH`, with `bypass_actors: []`. The exception path is the same as everywhere: a `Lock`/override is a Principal action, not an agent one.

The only thing a non-Developer role does *not* route through a worktree is a pure forge action (cutting an Issue, posting a comment, merging via the gate) — those touch the forge, not repo files. Every repo *file* edit goes through the worktree + PR.

### When state changes, update the pinned state Issue

State changes: a project phase advances, an app ships/scaffolds, auth/DNS config changes, a known production issue is resolved, a pending manual op is completed. The Brief Author updates the relevant project's pinned state Issue (`aeg`, `vada`, `herald`, `cetana`, or the ecosystem-wide one) directly (editing an Issue body is a forge action, not a repo-file change — it does not go through a worktree/PR). For Tier 3 work affecting the state Issue, note it in the code PR's body too.

Active work, next candidates, and blocked tasks are **derived from the forge** — they are never written to a file. (`now.md` is retired.)

### When the plan changes, update the appropriate file

- **The execution plan changes** (a task's edges, a new task, tranche scope) → the current `tranches/<name>.md` (Planner, at plan time). Live task *status* is never written — it's derived from the forge.
- **Held/future project items change** → the relevant per-project backlog (`apps/<project>/specs/<project>-backlog.md`) — out of the flow.
- **Lesson learned / anti-pattern** → post a new comment on the pinned lessons Issue — never edit an existing comment

### When repo structure changes, regenerate `docs-index.md`

Run `bun docs:index`, commit the result. On add/remove/rename. Content changes within existing files do not require regeneration.

### When decisions are made, log them immediately

State the decision in the pull request that carries the work, during the conversation. Announce: "I'm treating this as a Type [1/2] decision." Do not defer to session end.

---

## What goes where — quick reference

| If you're updating... | Where |
|----------------------|-------|
| A skill / agent definition | Repo only (skills: canonical in `aeg-root/skills/`, generated view in `.claude/skills/`) |
| A project spec, ecosystem vision, naming decision | Repo only |
| Non-derivable operational facts (production issues, env-var requirements, phase intent, pending manual ops, current-focus pointer) | Per-project pinned Issue: `aeg`, `vada`, `herald`, `cetana`, plus one covering `aeg-core`/`atta`/`desktop`/`attalabs` ecosystem-wide |
| The execution plan (task topology, edges) | `aeg-root/tranches/<name>.md` |
| Held / future project items | `apps/{project}/specs/{project}-backlog.md` (per project); cross-cutting items are cut as backlog Issues |
| Completed work history | `git log` / merged-PR history (redundant with a committed changelog, so none is kept) |
| Calibration lessons + anti-patterns | Pinned lessons Issue, one new comment per lesson |
| Items awaiting Principal ratification | `needs:principal-input` label on the relevant Issue/PR; historical record on the pinned ratification Issue |
| Live task status (what's active, blocked, next) | **Nowhere — derived from the forge** (`gh issue list --label "tranche:<slug>"`, `gh pr list`, Issues view) |
| Adding/removing/renaming a repo file | Repo + `bun docs:index` |
| Fundamental coordination rules | This file |

---

## Anti-patterns

- ❌ Reading or writing `roadmap.md` — it's retired; the execution plan is the tranche file, the product roadmap is the company's tool / backlogs (`apps/*/specs/*-backlog.md`)
- ❌ Putting a backlog anywhere but a `specs/` folder — the plan lives in `specs/`; `aeg-root/` is the model, flow + governance only, and living state is the per-project pinned Issue
- ❌ Writing task status anywhere (a file, the tranche topology, an Issue field) — status is derived from the forge; storing it recreates the racing status model the design eliminated
- ❌ Adding execution metadata (status, PR #, dates) to the tranche topology file — it is plan topology only (`tranche-model.md` §9)
- ❌ Putting the brief in the Issue — the brief is just-in-time and lives in the PR body; the Issue is task identity + metadata only
- ❌ Putting planning metadata (priority, estimates, points) on an Issue — that's the company's roadmap, not AEG
- ❌ Building a dynamic conflict scanner — declare conflicts conservatively and serialize (`tranche-model.md` §9)
- ❌ Putting tactical day-to-day plans in project specs (commit churn)
- ❌ Pretending to have read a spec that isn't in context — ask Dani by exact path, or use GitHub MCP
- ❌ Renaming `@atta/*` packages to `@attalabs/*` — code namespace is Atta; AttaLabs is only the public URL
- ❌ Treating Atta as merely a code namespace or "the ecosystem only" — Atta is **the product**
- ❌ Adding `-AI` suffix to any product brand
- ❌ Treating "Pāli name = built by Atta" as structural (demoted to elective aesthetic)
- ❌ Treating Herald or Vinaya as part of Atta — both are sibling AttaLabs products
- ❌ Letting the Developer review its own work — review/security passes are separate fresh-context invocations
- ❌ Generating strategy or planning a tranche before reading the specs (spec-check gate)
- ❌ Adding version suffixes to spec filenames (locked)
- ❌ Making a Type 1 decision in the Brief Author's absence without flagging PENDING
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

The AEG model formalizes this: Principal → Planner → Brief Author → Developer → Reviewer + Security → merge → Archivist. The Brief Author routes escalations by severity. Agents do not make final calls.

**Tooling note (this repo, May 2026):** GitHub MCP may be available via OAuth in fresh conversations — prefer it over paste-back for reading repo content and creating Issues/PRs. The coding-agent surface has direct filesystem access to the worktree. Self-hosted MCP servers with bearer-token auth (e.g. Vāda's hosted MCP) work via a coding-agent CLI, not via the chat connector broker. An orchestration tool may bind the same conversational surface (list active tasks, reply to a blocked task) — a convenience of whatever tool is in use, never part of the model.
