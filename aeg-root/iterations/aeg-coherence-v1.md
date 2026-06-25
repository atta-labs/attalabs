# Iteration: aeg-coherence-v1 — June–July 2026
Lifecycle: active

Goal: Make doc/spec/skill coherence a machine-derived constitutional seam — ownership
declared in `aeg-root/doc-owners`, coverage enforced by `verify-docs` (C5), dormant when
nothing is declared, grown incrementally per task.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                                                                                                | Issue | Project(s) | Depends-on | Conflicts-with |
|---|-------------------------------------------------------------------------------------------------------------------------------------|-------|------------|------------|----------------|
| 1 | Coherence seam: `aeg-root/doc-owners` manifest + `verify-docs` C5 coverage gate + `Doc-waiver` / `Doc-ack` labels + D-062 full entry | #214  | aeg        | —          | —              |

## Backlog (this iteration, not yet dispatched)

- **T2 — decision-number reservation + duplicate D-NNN check.** Add a CI step (or a `verify-docs` C6) that scans open PRs + `aeg-project/decisions.md` for duplicate or skipped `D-NNN` numbers, and surfaces the next free number. Closes the failure mode that just bit task 8 (parallel branches both claimed D-060, recovered via post-merge renumber to D-061).
- **T3 — Planner §7 auto-derivation from doc-owners.** Once the manifest exists (T1), the Planner stops hand-curating the "Docs to keep coherent" list — it derives it from the manifest + the boundary's intended files. The Planner output becomes the input C5 reads at PR time, so plan and gate cannot drift.
- **T4 — one-time staleness audit of existing skills/specs against current decisions.** Walk `D-001 … D-061` and the `.claude/skills/` set + product specs; populate the initial manifest entries; flag any skill/spec that contradicts a current decision and needs a follow-up cleanup PR. Bounded one-shot — no automation, just the seed pass.

## Cross-iteration dependencies

- None at plan time. `aeg-coherence-v1` touches `packages/aeg-core` + `scripts/verify-docs.ts` + `.github/labels.yml` + `aeg-root/doc-owners/` + `aeg-project/decisions.md`. No open iteration's `Project(s)` column lists `aeg` or `aeg-core`; `vada-production-v1` and `herald-agents-v2` are product-code iterations, file-disjoint by construction. Safe to run fully in parallel with them.
- A T1 Planner readiness re-check is required before any subsequent task in this iteration dispatches: confirm no new iteration has declared an `aeg-core` / `scripts/verify-docs.ts` task in the interim.
