# Iteration: Cetana V0.5 CLI ladder — finish the terminal loop

**Goal (execution, not product-why):** complete the terminal orchestration loop (`status`, `abort`/`resume`, `reply`) so Cetana is daily-driver usable from the CLI, plus one independent hosted-MCP fix.

**Repo:** atta.ai (monorepo) · **Team Leader:** Dani · **Opened:** 2026-06-03

This is the first iteration under the panel-endorsed model: each task **is a GitHub Issue**, this file holds **topology only**, and **status is derived from the forge** (Issue/branch/PR/merge state) — never written here. To see live status, query the forge (`gh pr list`, the Issues view), not this file.

---

## Tasks (topology)

| # | Task | Issue | Product | Depends-on | Conflicts-with |
|---|------|-------|---------|------------|----------------|
| 1 | `cetana status` — point-in-time view of running / blocked / recently-completed tasks | *(create)* | cetana | — | 2, 3 |
| 2 | `cetana abort` + `cetana resume` | *(create)* | cetana | 1 | 1, 3 |
| 3 | `cetana reply` — unblock a task from the CLI | *(create)* | cetana | 2 | 1, 2 |
| 4 | stdio MCP session URL → `vada.attalabs.dev` (currently hardcodes `vada.ai`) | *(create)* | vada | — | — |

**Edges explained.** Tasks 1→2→3 are the V0.5 ladder: a strict `depends-on` chain (locked in `cetana-spec.md` §10). They also `conflicts-with` each other because all three edit the same CLI router collision domain (`apps/cetana-ai/cli` — `index.ts` / `output.ts`); the dependency chain already serializes them, and the conflict edges make the collision explicit. Task 4 touches a different collision domain (`apps/vada-ai` stdio MCP) and a different product — no edges, so it runs in parallel. It is the independent, hand-to-the-junior slot.

*(`Issue` shows `(create)` because these tasks become GitHub Issues when the iteration is dispatched; the Planner creates them, assigns to promote `backlog → todo`, and the forge carries status from there.)*

## Backlog (committed to this iteration, not yet scoped)

*(none — the four tasks above are the full V0.5 ladder slice. Later rungs (F10+) live in `apps/cetana-ai/specs/cetana-backlog.md`, out of the flow, until pulled into a future iteration.)*

---

## How status works here (no status column by design)

| Status | Forge fact |
|--------|-----------|
| `backlog` | Issue open, unassigned |
| `todo` | Issue open, assigned, no branch |
| `in-flight` | branch `task/cetana-cli-ladder/<n>` exists, no PR |
| `in-review` | PR open |
| `changes-requested` | PR `reviewDecision: CHANGES_REQUESTED` |
| `merged` | PR merged (Issue auto-closes) |
| `blocked` | `aeg:blocked` label |

## Dispatch rules (the multi-developer lock)

- Don't start a task whose `depends-on`'s PR isn't merged. (So task 2 waits for task 1's PR to merge; task 3 for task 2's.)
- Don't start a task while a `conflicts-with` sibling's PR is open.
- One assignee per task.

(v1: trusted, not enforced — read and complied with by agents/humans. Mechanical enforcement arrives when a dispatch tool enforces the gates at dispatch.)

## Done

Closes when every task's PR is merged (Issue auto-closed) or a task is explicitly moved to the next iteration.

---

*The first iteration of Atta Agentic Execution Governance. Held / future / research items live in per-product backlogs (`apps/<product>/specs/<product>-backlog.md`) and `docs/ecosystem-backlog.md` — out of the flow. See `iterations/README.md` for the model and `roles/planner.md` for how this file is produced.*
