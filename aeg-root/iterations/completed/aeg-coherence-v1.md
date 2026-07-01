# Iteration: aeg-coherence-v1 — June–July 2026
Lifecycle: complete

Goal: Make governance coherence machine-derived — code↔doc (doc-owners + verify-docs C5)
and plan↔forge (verify-coherence oracle) — enforced deterministically, surfaced in Studio.
Ownership declared in `aeg-root/doc-owners`; plan↔forge drift detected by
`scripts/verify-coherence.ts`; both seams dormant when nothing is declared; grown
incrementally per task.

**Expanded 2026-06-30 (D-069 — AEG self-enforcement charter):** the iteration now also makes AEG enforce its own forge-lifecycle and role-seam contracts mechanically — honest terminal-status derivation (T6), forge-lifecycle CI gates incl. `Closes #N` + closing/archiving back-pressure (T2), and structural gates for the planner→brief (T7) and brief→developer (T8) contracts, and free agent git guardrails — a `PreToolUse` merge-gate (no agent merges a red PR) + a main-commit block + worktree-first discipline (T9). The "done" lifecycle (close → close-out → archive) and the planner→brief / brief→developer contracts move from *trusted* to *enforced*; agent merge/commit safety is enforced for free at the harness (no branch protection needed). See tasks 6–9.

**Va dispatches ahead of T2–T5** (Principal priority: plan↔forge oracle is the top
development priority for this iteration).

**Refactored 2026-07-01 (D-070, Planner):** tasks 3, 4, 5, 7, 8 moved out — see per-row
markers below. Each was built on `scripts/verify-coherence.ts` / `verify-docs.ts`, which
`aeg-consolidation` refactors into `@atta/aeg-core`; rebuilding them on the old scripts
would be throwaway work. Tasks Va/Vb/1/2/6/9 shipped and stand as this iteration's
delivered scope. No open task work remains in this iteration after the move; it is
closable by the Iteration Archivist under the D-070 gate.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| #  | Task                                                                                                                                | Issue | Project(s) | Depends-on        | Conflicts-with |
|----|-------------------------------------------------------------------------------------------------------------------------------------|-------|------------|-------------------|----------------|
| Va | `verify-coherence.ts` — deterministic plan↔forge coherence oracle; zero LLM calls; checks A1/A2/A3 (merge↔close), T1/T2/T3 (topology), D1 (deps), L1/L2/L3 (lifecycle), N1/N2/M1/M2/M3 (delegated to T2); JSON + human report; CI-runnable. **Dispatch-first — priority over T2–T5.** | #229  | aeg        | #214              | —              |
| Vb | Studio "Check Coherence" panel (renders Va's oracle live) + **honest status badges** (`dropped`/`incoherent` from T6; the "stale render / force-dynamic" premise is disproven — see #230 re-scope) | #230  | aeg        | #229, #250        | —              |
| 1  | Coherence seam: `aeg-root/doc-owners` file (code→doc bindings) + `verify-docs` C5 coverage gate + `Doc-ack`/`Doc-waiver` PR-body fields + D-062 full entry | #214  | aeg        | —                 | —              |
| 2  | Enforcement hardening: decision-number integrity + manifest validity + completeness scoreboard (reserves D-063) **+ forge-lifecycle CI gates: `Closes #N` pre-merge + verify-coherence as blocking check (A1/A2/A3/L1/L2) + in-iteration back-pressure + `aeg:incoherent` (D-069 re-scope)** | #217  | aeg        | #214, #250        | #251, #252     |
| 6  | Honest terminal-status derivation + constitution charter: `deriveStatus` reads `stateReason`; add `dropped`/`incoherent` to `DerivedStatus`; create `aeg:incoherent`; §3/§14 + iterations/README §3 (carries D-069) | #250  | aeg        | —                 | —              |
| 9  | Agent git guardrails: `PreToolUse` merge-gate hook (deny `gh pr merge`/`gh api`/MCP merge unless `gh pr checks` green) + Husky main-commit block + worktree-first Step 0 in roles + `coordination.md` universal rule + lessons entry | #254  | aeg        | —                 | #217, #251, #252 |

**All 6 tracked tasks above are merged.** This iteration carries no further live topology —
tasks 3, 4, 5, 7, 8 were moved out entirely (not merely annotated) so the Studio's
forge-derived status stops querying their still-open Issues under this iteration's name.
Full move record:

## Tasks moved out (D-070, 2026-07-01 — not live topology, historical record only)

- **3** — Bind-all + staleness audit: drive linkage to 100%, emit fix punch-list → `aeg-governance-hardening` task 3 (#218)
- **4** — Planner §7 auto-derivation from `doc-owners` → `aeg-governance-hardening` task 4 (#219)
- **5** — Coherence completeness verification (100% gate) → `aeg-consolidation` task 3, re-scoped (#220)
- **7** — Planner→Brief rationale-completeness gate (R1) → `aeg-governance-hardening` task 1 (#251)
- **8** — Brief→Developer brief-validation gate → `aeg-governance-hardening` task 2 (#252)

## Backlog (this iteration, not yet dispatched)

- **Fix punch-list (tasks 10…n) — spawned by task 3.** ~~The staleness audit in task 3 (#218) emits one new Issue per contradiction it finds between a newly-bound doc and `D-001 … D-063`. Those Issues are the iteration's fix punch-list and must all close before task 5 (#220) can pass its 100%-coherence exit gate.~~ **Superseded (D-070, 2026-07-01):** task 3 moved to `aeg-governance-hardening` task 3 (#218) before spawning any punch-list Issues; the punch-list (if any) will spawn under that iteration instead. Nothing was cut under this backlog lane.

## Cross-iteration dependencies

- None at plan time. `aeg-coherence-v1` touches `scripts/verify-docs.ts` + `aeg-root/{state-machine.md, doc-owners, roles, contracts}` + `aeg-project/decisions.md`. No open iteration's `Project(s)` column lists `aeg`; `vada-production-v1` and `herald-agents-v2` are product-code iterations, file-disjoint by construction. Safe to run fully in parallel with them.
- A T1 Planner readiness re-check is required before any subsequent task in this iteration dispatches: confirm no new iteration has declared a `scripts/verify-docs.ts` task in the interim.
