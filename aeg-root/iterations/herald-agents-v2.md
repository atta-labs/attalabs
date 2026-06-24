# Iteration: herald-agents-v2 — June–July 2026
Lifecycle: active

Goal: Extract forensic-hiring-auditor intelligence into `packages/agents/forensic-hiring-auditor/`
(D-046 first execution), make Herald a thin consumer, overhaul Bulk Audit UX, improve report
quality, expose Herald MCP, close housekeeping debt from two completed iterations.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                                                                                                | Issue | Project(s)          | Depends-on | Conflicts-with           |
|---|-------------------------------------------------------------------------------------------------------------------------------------|-------|---------------------|------------|--------------------------|
| 1 | Housekeeping — Archivists (herald-onto-engine + aeg-ui-v1) + herald backlog fix + herald-ai/aeg-project state/now rewrite           | #167  | herald, aeg         | —          | —                        |
| 2 | Agent migration — `packages/agents/forensic-hiring-auditor/` (YAML + GitHub tool + MatchReport schema + NO-FIT gate) + Herald thin consumer + Bulk Audit stays green | #168  | herald, engine, aeg-core | #167  | —                        |
| 3 | Herald MCP — `herald__audit` at `herald.attalabs.dev/api/mcp`                                                                       | #169  | herald              | #168       | —                        |
| 4 | Bulk Audit UX overhaul — matrix result rendering, report cards, cell status, overall flow                                           | #170  | herald              | #168       | #181 (vada-production-v1/6) |
| 5 | Report quality — research existing forensic hiring frameworks + vendor-diverse LLM review + real improvement to agent YAML/prompt with fixture-based before/after evidence | #171  | herald, aeg-core    | #168       | —                        |
| 6 | Abuse cap — per-owner per-day rate limit on public profile audits (D-033 follow-up)                                                 | #172  | herald              | #168       | —                        |
| 7 | Deploy verification — `herald.attalabs.dev` Phase 2 flows (avatar, CV upload, bio save, onboarding, Bulk Audit with real BYOK)      | #173  | herald              | #168       | —                        |
| 8 | Owner `/ui` + `/settings` relocated under `/[username]` (owner-gated, build-time library per D-035) + topbar Palette/Settings icon buttons via `extraActions` + Bulk Audit excluded from profile layout. Supersedes D-036 route/nav (→ D-060). | #210 | herald | — | — |

## Backlog (this iteration, not yet dispatched)

- Per-audit (one-off) vendor + model override on Bulk Audit — deferred post-V1, not in scope.
- Herald Phase 4 (recruiter as distinct B2B surface) — future, not in scope.

## Cross-iteration dependencies

- Task 1 (#167) must merge before herald-agents-v2 task 2 (#168) can dispatch AND before
  vada-production-v1 task 1 (#175) can dispatch (Planner readiness gate on both).
- Task 4 (#170) conflicts-with vada-production-v1/6 (#181) (SmartTextInput extraction). Serialize:
  #181 merges first (extract to @atta/ui), then #170 consumes it.
- Task 2 (#168) must merge before vada-production-v1 task 1 (#175) (Vāda YAML migration follows the
  package structure established here).
