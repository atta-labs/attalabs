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
| 6 | SmartPromptInput attachment tiles wrap instead of scrolling horizontally                        | #455  | herald, vada    | —          | —              |
| 7 | JD file-upload resolution (pdf + markdown)                                                      | #456  | herald          | —          | —              |
| 8 | Export an input-cost estimation utility from adapter-langgraph                                  | #457  | herald, vada    | —          | 11             |
| 9 | New shared tile-collection primitive (DocCollector)                                             | #458  | herald          | —          | —              |
| 10 | Bulk Audit input redesign: two-surface layout, live N×M + cost estimate                        | #459  | herald          | 7, 8, 9    | —              |
| 11 | Single-audit UX: simulated progress, cost display, topbar scroll fix                           | #465  | herald, vada    | —          | 8              |

**Note:** task 3 is intentionally absent — its Issue (#348, pricing-table gap) was dropped before
promotion to this table (see "Dropped during planning" below); the number is retired, not reused.

## Bulk Audit redesign (Planner act, 2026-07-07)

Tasks 6-10 add the Herald Bulk Audit input redesign, planned in a multi-turn design session with the Principal — iterated through interactive mockups, then refined via a "Claude Design" handoff bundle, then extended with a live model-selection label and a token/cost estimate. Split by verification-coupling, not by file: 6 (shared CSS bug, found along the way), 7 (JD file upload), 8 (cost-estimation utility), and 9 (the new `DocCollector` primitive) are each independently verifiable and carry no edges between them; 10 is the integration task and `depends-on` all three of 7/8/9, since the redesigned page can't be verified until they exist. `.docx` support was explicitly deferred (Principal, 2026-07-07) — task 7 covers pdf + markdown only. Task 8 was revised in-session before any brief was written against it: originally scoped as "export the raw pricing table," corrected to "export the estimation function itself," so the chars-to-tokens math lives at the engine/adapter layer and Herald only calls it, rather than duplicating logic in a product app.

**Cap decision:** `MAX_JDS` rises from 5 to 10 (task 10) to match the design's uniform 10-per-side cap — an explicit Principal decision (2026-07-07) resolving a real asymmetry between existing code and the new design, not a silent pick.

Task 8's `estimateInputCost` is related to, but does NOT close, the residual PRICING-vs-catalog gap already flagged below (an off-allowlist BYOK selection still nets no cost estimate — `costUsd: null` — after task 8 lands). That broader gap remains out of scope for this iteration.

## Single-audit UX (Planner act, 2026-07-07)

Task 11 was found live by the Principal during a real, successful single-profile audit run (not from code reading) — the report took ~74s with no progress feedback, the already-computed `estimatedCostUsd` (visible in server logs) was never shown in the UI, and the main Herald topbar became unreachable after a report rendered. Real backend-driven progress (token streaming or a new execution-lifecycle hook) was explicitly ruled out as too large — `packages/adapter-langgraph`'s LLM calls are non-streaming end-to-end and shared with Vāda; a client-side simulated progress indicator was chosen instead. The topbar bug's exact root cause is not yet confirmed — task 11's brief requires live reproduction before any fix, not a guess from the report text.

**Conflicts-with 8, retroactively added to task 8's Issue (#457):** both tasks touch `packages/adapter-langgraph/src/adapter.ts` (same file, different lines — task 8 exports a pre-audit cost estimator; task 11 attaches the already-computed post-audit `estimatedCostUsd` to `Conclusion`'s return shape). Declared to serialize on file-collision grounds, not a logical dependency.

The rate-limiter log lines ("Per-IP/Per-owner rate limit check failed — allowing request") observed in the same session are NOT part of task 11 — traced to the already-tracked expired-Upstash-Redis backlog item below, operational not code.

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

Tasks 6, 8, and 11 touch shared packages (`packages/ui/smart-prompt-input`, `packages/adapter-langgraph`)
with blast radius into `vada` — checked all open PRs (#295, #286, both `vada-production-v1`) directly
for file overlap with `smart-prompt-input.tsx`, `adapter-langgraph`, `audit-input/`, or `BulkAudit.tsx`:
none found.
