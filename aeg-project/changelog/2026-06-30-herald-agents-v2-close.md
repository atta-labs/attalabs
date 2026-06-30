## June 30, 2026 — herald-agents-v2 iteration close-out

### Herald / AEG

**herald-agents-v2** (8 tasks, June 18–29, 2026) — Iteration close-out. All task work merged; iteration file archived to `aeg-root/iterations/completed/herald-agents-v2.md`.

**Iteration summary:**
- **T1 (#167, PR #148)** — Housekeeping: Archivist close-outs (herald-onto-engine + aeg-ui-v1), herald backlog fix, herald-ai/aeg-project state/now rewrite.
- **T2 (#168, PR #150)** — Agent migration: `packages/agents/forensic-hiring-auditor/` (YAML + GitHub tool + MatchReport schema + NO-FIT gate) + Herald thin consumer + Bulk Audit green. Established D-051 (agent implementation packages at `packages/agents/<name>/`).
- **T3 (#169, PR #156)** — Herald MCP: `herald__audit` live at `herald.attalabs.dev/api/mcp`.
- **T4 (#170, PR #191)** — Bulk Audit UX overhaul: N×M matrix result rendering, report cards, cell status, overall flow polish.
- **T5 (#171, PR #193)** — Report quality: evidence-tiered prompt (High/Medium/Low signal classification, recency weighting, quantitative grade thresholds, interview hook rules) + `tests/fixtures/` before/after evidence, 14 regression guard tests.
- **T6 (#172, no PR)** — Abuse cap (per-owner per-day rate limit): verified already-implemented during T7 deploy verification. Closed by Principal — D-033 follow-up satisfied; per AEG no-PR-backing close rule.
- **T7 (#173, PR #235)** — Deploy verification: Phase 2 flows + Bulk Audit. Code paths verified (avatar upload, CV upload, bio save, onboarding, Bulk Audit batch shape). Critical finding: prod `ANTHROPIC_API_KEY` likely expired → #234 opened. One fix: Drizzle `username` unique constraint name pinned to `herald_profiles_username_key`.
- **T8 (#210, PR #213)** — Owner `/ui` + `/settings` relocated under `/[username]/(owner)/`; topbar `extraActions` Settings + Theme icon buttons. Ratifies D-061.

**Open item — #234:** Production audit engine returning partial fallback on all non-BYOK calls (expired/revoked `ANTHROPIC_API_KEY`). Not a task; tracked as a standalone bug. Principal to decide: (a) rotate prod key in Vercel + re-verify, or (b) accept-and-defer.

**Coherence note:** T6 and T7 sat merged-but-Todo for days because per-task Archivist close-outs were not dispatched at merge time. Flagged for aeg-coherence-v1 T2 (#217) — the enforcement mechanism this drift class is meant to block.
