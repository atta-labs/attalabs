# Cetana — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future / research items for Cetana (the orchestration tool, not the flow). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

Migrated from the retired global `roadmap.md` (June 3, 2026; roadmap retired by D-029). The active V0.5 CLI ladder (F7/F8/F9) lives in the current iteration at `project-management/iterations/cetana-cli-ladder.md`, not here.

---

## Dogfood + V1 gate (after the CLI ladder ships)

- **F10 — first real-world dispatch.** Validate the orchestration loop on a real task (candidate: a Vāda Reviewer-prompt iteration). Milestone, not a code task.
- **F11 — V0.5 dogfood window.** ≥20 tasks dispatched through Cetana (V0 + V0.5 combined); document "wish this were visual" moments as they occur. Required evidence for the D-023 gate.
- **F12 — V1 UI gate evaluation.** Check D-023 conditions: ≥20 tasks, ≥3 concurrent, documented friction. TL presents evidence to the ratification queue; Principal decides.
- **F13 — V1 build (only if F12 passes).** Tauri shell + dashboard + native notifications + menu-bar status. Hard guardrails (per the retired roadmap's history — see git history of `roadmap.md`): don't build if V0/V0.5 reduces friction enough; don't build mid-workstream; time-box hard at ~7 days.

## Cetana beyond orchestration (V0.7+, after the dogfood window)

- **MCP wrapping of Spec Kit templates.** `cetana.specify(description)` → `spec.md`, `cetana.plan(spec_path)` → `plan.md`, `cetana.tasks(plan_path)` → `tasks.md`, using Spec Kit's template formats. About *authoring* artifacts. Depends on V0 stable + brief-authoring pattern settled. Not before V0.5 ships.
- **Cetana as a Vāda team flow** — compose orchestration + deliberation. When a Cetana-dispatched agent opens a PR, fire a Vāda deliberation team (spec reviewer + code reviewer + risk auditor + Principal-perspective synthesizer) and post the synthesis as a PR comment; Principal makes the merge call. About *deliberating over* artifacts. Why not now: V0.5 is locked as the CLI ladder; the orchestration loop needs the 4-week dogfood first; premature coupling is risky; the Principal-throughput question is unresolved (see `lessons.md` on review-rigor degradation). Revisit after F11 generates evidence about which dispatch decisions would benefit from deliberation.

These two are related — one is about authoring artifacts, the other about deliberating over them. They could land together or separately. Track opens after F12.

---

*Note on naming: Cetana automates only the orchestration slice of AEG; it is not AEG itself. See `project-management/coordination.md`.*
