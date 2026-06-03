# Iteration: Cetana V0.5 CLI ladder — finish the terminal loop

**Goal (execution, not product-why):** complete the terminal orchestration loop (`status`, `abort`/`resume`, `reply`) so Cetana is daily-driver usable from the CLI, plus one independent hosted-MCP fix.

**Repo:** atta.ai (monorepo) · **Team Leader:** Dani · **Opened:** 2026-06-03

---

## Tasks (scoped, dispatchable)

| # | Task | Product | Ticket | Depends-on | Conflicts-with | Owner | Status | PR |
|---|------|---------|--------|------------|----------------|-------|--------|----|
| 1 | `cetana status` — point-in-time view of running / blocked / recently-completed tasks | cetana | F7 | — | (F8, F9 in backlog) | Dani | todo | — |
| 2 | stdio MCP session URL → `vada.attalabs.dev` (currently hardcodes `vada.ai`) | vada | E7 | — | — | — | todo | — |

Tasks 1 and 2 touch different products (`apps/cetana-ai/cli` vs `apps/vada-ai` stdio MCP) and different files — no conflict, so they can run in parallel. Task 2 is the independent, hand-to-the-junior slot.

## Backlog (committed to this iteration, not yet ready to dispatch)

- **`cetana abort` + `cetana resume`** (cetana, F8) — depends-on task 1; conflicts-with the other CLI commands (shared `index.ts` / `output.ts` router). Promote to a Task row once `cetana status` (task 1) is merged.
- **`cetana reply`** (cetana, F9) — depends-on F8; conflicts-with the other CLI commands. Completes the full terminal orchestration loop. Promote once abort+resume merges.

These sit in `backlog` because the V0.5 ladder is a strict chain (F7 → F8 → F9, locked in `cetana-spec.md` §10) and they all edit the same CLI router files — so they must serialize. Scoping them into briefs before task 1 lands would be premature.

## Status legend

`backlog` → `todo` → `in-flight` → `in-review` → `merged`.  `blocked` = off to the side (waiting on a dependency, a conflict to clear, or an escalation answer).

## Dispatch rules (the multi-developer lock)

- Do not start a task whose `depends-on` is not yet `merged`.
- Do not start a task while a `conflicts-with` sibling is `in-flight` or `in-review`.
- One owner per task at a time.

(v1: trusted, not enforced — read and complied with by agents/humans. Mechanical enforcement arrives when Cetana enforces the gates at `dispatch`.)

## Done

The iteration closes when every Task is `merged` or explicitly moved to the next iteration. F8/F9 graduate from backlog → todo as their dependencies land; if they don't fit this cycle they carry to the next.

---

*The first iteration of Atta Agentic Execution Governance, converted from the retired `roadmap.md`. Held / future / research items moved to per-product backlogs (`apps/<product>/specs/<product>-backlog.md`) and `docs/ecosystem-backlog.md` — both out of the flow. See `iterations/README.md` for the model.*
