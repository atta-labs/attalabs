# Iteration: herald-hardening-v1 — July 2026
Lifecycle: active

Goal: Close out the items left dangling after herald-agents-v2's close (2026-06-30) — fix the
still-open production audit bug (#234), and correct the stale AEG bookkeeping
(`aeg-project/state.md`, `specs/herald-backlog.md`) so both reflect herald-agents-v2's actual
completion.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                                                          | Issue | Project(s)      | Depends-on | Conflicts-with |
|---|------------------------------------------------------------------------------------------------|-------|-----------------|------------|----------------|
| 1 | Housekeeping — fix stale `herald-backlog.md` + `aeg-project/state.md`                          | #347  | herald          | —          | —              |
| 2 | Production audit engine returning partial fallback (YAML tracing bug), carried from herald-agents-v2 T7 | #234  | herald          | —          | —              |
| 4 | Footer: strip cross-product nav + per-product links, inline mark+name                          | #355  | herald, atta, vada, vitakka, attalabs | — | — |
| 5 | Topbar buttons: Sign-out + Settings drifted from D-061's outline spec                           | #356  | herald          | —          | —              |

**Note:** task 3 is intentionally absent — its Issue (#348, pricing-table gap) was dropped before
promotion to this table (see "Dropped during planning" below); the number is retired, not reused.

## Dropped during planning

- **Pricing-table gap (was T3, #348) — closed, stale premise.** `herald-backlog.md` claimed the
  pinned model (`claude-sonnet-4-20250514`) was missing from adapter's `PRICING` table.
  `.claude/skills/herald-engine/SKILL.md` (read after initial planning) and the current YAML
  (`packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml:7`) show the model was
  repinned to `claude-sonnet-4-6` at some point after that note was written — already priced.
  Issue closed with explanation; no task carried forward. Residual finding (PRICING is a small
  hardcoded allowlist disconnected from `@atta/models`' dynamic 12-vendor catalog, so an
  off-allowlist BYOK selection still nets $0.00) is a cross-product `adapter-langgraph` gap, not
  a Herald task — not in this iteration's scope.

## Backlog (this iteration, not yet dispatched)

- `/ui` editor library-preview hint ("previewing — not saved") — nicety, not a bug (D-035 preserved either way). No Issue cut; dispatch only if prioritized.
- Report-quality follow-up — the pre-existing `herald-backlog.md` line asking for a dedicated signal-weighting/gap-specificity iteration appears superseded by herald-agents-v2 T5 (#171, evidence-tiered prompt rewrite + fixture regression tests). Not carried forward as a task; re-open only if a concrete, specific gap is identified.
- Logo direction (trumpet/horn + AI signal arcs) — not locked; not plannable as a dev task until a direction is chosen. Parked.
- Upstash Redis creds (expired) / `MASTER_ENCRYPTION_KEY` presence — operational, not code; tracked in `aeg-project/state.md`'s pending-manual-operations list, not as iteration tasks.
- Herald Phase 5 (recruiter B2B surface) — out of scope per prior iteration close; do not spec until prioritized.
- Per-audit vendor/model override on Bulk Audit — deferred post-V1 per herald-agents-v2's own backlog lane; still deferred.

## Cross-iteration dependencies

None. Tasks 1, 2, and 5 are herald-project-local. Task 4 touches the shared `packages/ui/footer`
component (blast radius: herald, atta, vada, vitakka, attalabs) — checked `vada-production-v1.md`,
`aeg-studio-cleanup.md`, and `aeg-governance-hardening.md` directly plus all open PRs for overlap
on `packages/ui/footer` or `packages/ui/topbar`: none found.
