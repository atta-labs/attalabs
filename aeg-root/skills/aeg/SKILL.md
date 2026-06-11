---
name: aeg
description: The front door to Agentic Execution Governance (AEG) — the operating model every agent works inside. Load at the start of ANY session in this repo, before doing anything substantive, regardless of role. Covers what AEG is, the four truth domains, forge-derived status, the iteration topology file, where the plan vs the flow vs governance live, the dispatch gates, the brief, the anti-regression rules, the orient-from-root layout (`aeg-root/` model + `aeg-project/` state — D-041), and the model-vs-product distinction. Ends by routing to the aeg-roles skill and the reading order. Does NOT cover role specifics (see aeg-roles + roles/*.md) or brief authoring (see brief-authoring).
---

<!-- CANONICAL SOURCE (D-039). This file is the canonical home of the `aeg` skill, inside the AEG unit (aeg-root/skills/). The copy at .claude/skills/aeg/SKILL.md is a GENERATED VIEW produced by `aeg generate-skills` for the agent harness that loads from .claude/ — edit THIS file, then regenerate; never edit the generated view by hand. A different agent (e.g. Codex) generates its own view from this same source. -->

# AEG — the operating model (front door)

**Load this first, every session, before anything substantive — whatever your role.** It is the one-read picture of how work happens in this repo. When you finish it you will know what AEG is, what is true and where it is stored, and which role doc to open next. It does not reproduce the role docs or the brief rules — it points to them.

AEG = **Agentic Execution Governance.** It is a small set of accountable roles coordinating AI agents through briefs, independent review, blocking escalation, and append-only decision logs. It is **governance + orchestration of delegated AI execution** — it is *not* project management: there is no plan, timeline, or resource tracking inside AEG (that lives in the backlogs / a company tool, outside the flow).

AEG is **agent-agnostic and tool-agnostic.** The roles below describe *what an agent must do*, not which agent does it — any capable coding agent (Claude Code, Codex, or another) can take a role by reading its doc. The model names no vendor as a dependency.

---

## 1. AEG is two things sharing one name (don't confuse them)

- **AEG the model** — this operating model: the governance/flow constitution. It lives at repo-root `aeg-root/` (the model exists once, at the root only — D-041) and governs the whole repo. *This skill is the model.*
- **AEG the product** — a deployed UI that *visualizes* a repo's AEG execution, plus `aeg.sh`, a scaffolder that lays the AEG structure into any repo. In this repo it lives at `apps/aeg/`.

When someone says "AEG," default to the model unless the context is clearly the product (the UI, the website, the scaffolder).

## 2. Forge-native, orchestrator-independent

AEG runs on **the Repo + the Git forge (GitHub/GitLab) + plain git worktrees**, and depends on **no orchestration tool**. It can be run entirely by hand. An orchestrator may *automate* the dispatch/escalation slice, but knowledge flows one way: **a tool may know AEG; AEG does not know the tool.** Never assume an orchestrator exists; never make the model depend on one. *(In this repo, the optional orchestrator is Cetana — but the model never names it as a requirement.)*

## 3. The four truth domains — every fact lives in exactly one place

1. **The Git forge** (Issue / branch / PR / review / merge state) = **all live execution status, DERIVED not stored.** A task *is* a forge Issue. There is no status field and no `status:*` label anywhere — status is *read* from the forge:
   - branch `task/<iteration>/<n>` exists → in-flight
   - PR open → in-review · review = CHANGES_REQUESTED → changes-requested
   - PR merged → merged · `aeg:blocked` label → blocked
   Labels are only `tier:*`, `aeg:blocked`, `needs:*-input` — never status.
2. **The Repo** = code, specs, skills, PM docs, role docs, the thin iteration topology files, decisions. The source of truth for **plan and governance** (not live status).
3. **The PR body** = the **just-in-time brief** — a task's full execution context, pasted (not committed), never in the Issue.
4. **Local filesystem** = orchestration-tool runtime, worktrees, dev servers. Ephemeral, never canonical.

Conversation logs / thinking are **not** artifacts — never cite them as authority.

## 4. Where the plan / the flow / governance live (D-037)

- **The plan (backlogs)** → a unit's `specs/`: `specs/<unit>-backlog.md` (per unit / per project) and a repo-level backlog in the root `specs/`. **Out of the flow.** The Planner *may* read it to compose an iteration but the flow never operates on it.
- **The flow + governance (the model)** → the **root** `aeg-root/`: the constitution, the role docs, the skills, the iteration files. Exists **once**, at the repo root only (D-041).
- **The living state** → `aeg-project/`: one at the repo root (for monorepo-level work) and one per unit (`apps/<x>/aeg-project/`, `packages/<y>/aeg-project/`). Holds only `state.md`, `now.md`, `changelog.md`, `decisions.md`, `lessons.md`, `ratification-queue.md` — never the model.
- **`roadmap.md` is retired** (D-029). Never read or write it.

The model layer exists **once**, at repo-root `aeg-root/`. A unit's `aeg-project/` carries only that unit's *living state* — never a copy of the model. The AEG skills are part of the model and live at `aeg-root/skills/` (canonical); the `.claude/skills/` copies are a generated view (D-039).

## 5. The iteration — AEG's top-level artifact

An iteration (`aeg-root/iterations/<name>.md`) is a **thin topology file**: task→Issue map, `depends-on` / `conflicts-with` edges, grouping. **No status, no PR numbers, no dates, no priority, no estimates.** It is the active slice of work the Planner pulled from a backlog. The link from backlog → iteration is a *human* (the Planner), not a file. (Full model: `aeg-root/iterations/README.md`.)

## 6. Conflicts and the two dispatch gates

Conflicts are **declared, package-level, and static** (collision domains in `.aeg/packages`) — there is **no dynamic path-overlap scanner**. When unsure two tasks collide, declare the conflict and serialize. Two gates, both forge-answerable with zero stored state:
- never start a task whose `depends-on` isn't **merged**;
- never start a task while a `conflicts-with` sibling's **PR is open**.

## 7. The brief

The brief is the task's full execution context: **just-in-time, pasted not committed, lands in the PR body**, frozen at dispatch, amended only via escalation. If it isn't in the brief, it doesn't exist. Authoring rules: the **brief-authoring** skill. Brief Step 0 is always worktree creation (`git worktree add .worktrees/task/<iteration>/<n> -b task/<iteration>/<n> origin/main`).

## 8. Roles (one line each — load the role doc for detail)

Principal → Team Leader → Developer → Reviewer (code + security) → merge, plus the non-conversational Archivist. The TL has three modes: Strategist (architecture/decisions), Planner (intent + backlog slice → an iteration), Brief Author (writes the brief). **Do not operate from this list — load your role doc.** The **aeg-roles** skill routes you to the right one.

## 9. Tiers, decisions, ratification (the governance layer)

- **Tiers** (D-003): Tier 0 trivial · Tier 1 implementation · Tier 3 project/roadmap. No Tier 2. When in doubt, Tier 3.
- **Decisions** are append-only `D-###` entries in `decisions.md` (repo-level) or `<unit>/specs/<unit>-decisions.md` (per unit). **Type 1** = irreversible (Principal ratifies; PENDING until a window). **Type 2** = reversible (TL may ratify). `Lock: YES` = a closed branch a brief must acknowledge or formally challenge. Never edit an entry in place — supersede with a new one.
- **Ratification windows**: 1–2 daily; the Principal resolves Type 1s, Tier 3 merges, lock approvals, `severity:product` escalations.
- **verify-docs** (`.github/workflows/verify-docs.yml`) is a real blocking CI gate (D-027): changed specs need a `Status:` block, Tier 1+ code needs a doc change, Tier 3 needs a decision entry.

## 10. The anti-regression rules — never violate

- ❌ Never write task status anywhere (file, Issue field, label) — it is derived from the forge.
- ❌ Never add execution metadata (status, PR #, dates) to the iteration topology file — topology only.
- ❌ Never put the brief in the Issue — it lives in the PR body.
- ❌ Never put planning metadata (priority, estimates, points) on an Issue — that's the roadmap, outside AEG.
- ❌ Never build a dynamic conflict scanner — declare conservatively and serialize.
- ❌ Never read or write `roadmap.md` — retired.
- ❌ Never put a backlog anywhere but a `specs/` folder (D-037).
- ❌ Never let a Developer review its own work — review is a separate fresh-context invocation.

## 11. What to do next (the reading order)

After this skill, load in order: **`aeg-roles`** (routes you to your role doc) → your **`aeg-root/roles/<role>.md`** → **`aeg-root/iterations/README.md`** (if planning or executing) → **`aeg-project/state.md`** + **`now.md`** (current state) → the active **`iterations/<name>.md`** if one exists. The canonical session-start protocol is `aeg-root/coordination.md`; this skill is its fast front-door summary, not a replacement. When the two disagree, `coordination.md` and `state-machine.md` win.
