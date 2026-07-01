# AEG Observability — spec

**Status:** draft
**Product:** AEG (`apps/aeg`)
**Depends-on:** `aeg-coherence-v1` (specifically T7/T8 — the machine-parseable rationale/brief/verdict grammar)
**Related:** realizes the **Tier-1 forge-derived observability** of `aeg-backlog.md` OQ-aeg-2 — the honest, dependency-free half (task progress, roles, review cycles, provenance), *not* the execution-emitted Tier-2 (tokens/cost). Builds on the `deriveIteration` core the backlog names ("The product" task 1), extending it to `derivePipeline` (per-contract-seam). This spec is the focused contract-fulfillment-pipeline slice of the AEG-UI product; it does not resolve OQ-aeg-1/3 (viewer, deploy model).
**Origin:** drafted 2026-07-01 during `aeg-coherence-v1`, when autonomous multi-role orchestration outran the human's ability to see what had happened and what was owed.

---

## The anchor principle

> **Legibility is *derived*, never *logged*.** The orchestration view is computed from forge objects + the existing append-only logs. Zero new stored state. If it can't be derived from GitHub, it isn't shown.

A "run-log" was considered and rejected: a stored status/event file is exactly the racing, drifting, lying state-store that AEG's forge-derived model eliminated. Every contract handoff already leaves a forge trace, so the view is a *derivation* — the same discipline as derived task status, one level up. When this iteration is planned, this principle becomes a D-entry in `apps/aeg/specs/aeg-decisions.md`.

## The derivation

One pure function, `derivePipeline(task) → { stage: state }`, each stage ∈ `done | active | pending | blocked | incoherent`, read entirely from the forge:

| Stage | Derived from (forge) |
|---|---|
| plan (planner→brief) | Issue exists + carries the rationale block |
| brief (brief→developer) | PR exists + brief in body |
| dev | branch commits · **draft PR ⇒ `active`** (see edge cases) |
| code review (developer→reviewer) | PR review carrying `VERDICT: APPROVE \| REQUEST CHANGES` |
| security | PR comment carrying `VERDICT: PASS \| FAIL` |
| verify | `[agent]` evidence comments present + `[principal]` checkboxes ticked |
| merge | PR merged |
| close-out (reviewer→archivist) | `### AEG provenance` comment + changelog entry + ledger row |

The **debt** ("what's owed") is itself derived — it is the set of oracle incoherences: a merged PR with no provenance comment (A2), a merged task PR missing its ledger row (new check), etc. What is owed is *computed*, not remembered.

## User stories (prioritized)

**P1 — Principal live view.** As the Principal, I open the AEG Studio and see the live per-task contract-fulfillment pipeline for the active iteration(s), derived from the forge, so I never cross-reference the forge + topology + decision log + ledger by hand.
*Independent test:* the rendered matrix matches a hand-audit of the forge for a known iteration.

**P1 — Fresh-agent reconstruction.** As an agent picking up a torn-down session, I regenerate the *identical* matrix from repo + forge alone, with no run-log, so orchestration state survives session death.
*Independent test:* two independent agents, same forge, produce the same matrix and the same debt list.

**P2 — Debt as incoherence.** As the Principal, the pipeline surfaces owed work (merged-without-provenance, merged-without-ledger-row) as `incoherent` cells, so nothing is silently missed.
*Independent test:* delete a provenance comment on a merged PR → that task's close-out cell flips to `incoherent`.

**P3 — Live refresh.** As the Principal, the view updates as agents act (poll or event), so streaming progress is visible without a manual reload.
*Independent test:* open a PR on a task → its `brief`/`dev` cells advance on the next refresh.

## Acceptance scenarios

- **Given** a task whose PR has an `APPROVE` code-review comment and a `PASS` security comment but is not yet merged, **when** the pipeline renders, **then** code/security show `done`, merge shows `pending`.
- **Given** a merged task PR with no `### AEG provenance` comment, **when** the pipeline renders, **then** close-out shows `incoherent` and it appears in the debt list.
- **Given** a task with an open *draft* PR, **when** the pipeline renders, **then** dev shows `active` (not `pending`).
- **Given** no forge access (no token), **when** the pipeline renders, **then** it degrades to a clearly-marked "forge unavailable" state — never a fabricated one.

## Success criteria

- 100% of the matrix is computed from forge objects + existing append-only logs; **zero new persisted state files** (verifiable by grep: no new `*.log` / status file introduced).
- Any agent reproduces the same matrix and debt list from the same forge.
- Every "owed" item shown maps to a derivable oracle incoherence, not a stored note.
- The Principal can answer "what happened, what's in flight, what's owed" for an iteration in one glance, without opening the forge, the topology, and the ledger separately.

## Edge cases

- **"Dev active" without stored flag** — a **draft PR** is the forge-native signal for "a developer is working": the Developer opens a draft PR early, marks it ready when done. `dev = active` is then derived, killing the "can't tell running from not-started" gap with no stored state.
- **Non-standard verdict/evidence format** → not parseable → the cell shows `pending`, never a guess. This is why the derivation depends on the T7/T8 grammar.
- **Transient process running, no PR yet** → honestly `dev pending`. This runtime fact is ephemeral by design and is not persisted; if the process dies, there is simply no PR and the task is re-dispatched.
- **Multiple concurrent iterations** — the view renders each active iteration's pipeline; cross-iteration conflicts are out of scope for v1.

## [NEEDS CLARIFICATION]

- **Verdict / test-plan-evidence grammar.** The derivation needs machine-parseable formats for review verdicts and `[agent]` evidence, analogous to the `### AEG provenance` block. This is the *same* grammar work T7/T8 define for the rationale/brief — so this iteration hard-depends on T7/T8. Confirm at plan time that their grammar covers verdicts + evidence, or add it here.
- **Live-refresh mechanism** — poll interval vs a forge webhook. v1 may ship poll-only.

## Rough task shape (for the Planner, at plan time)

1. `derivePipeline` in `@atta/aeg-core` / `verify-coherence` — forge facts → per-task stage states + the debt list. Pure, unit-tested. (collision domain: `aeg-core`, `verify-coherence`)
2. Studio renders the live pipeline matrix from the derivation. (collision domain: `apps/aeg/web/studio`)
3. Extend the oracle's debt checks (merged-without-ledger-row) + adopt the draft-PR `active` convention across the Developer role. (collision domain: `verify-coherence`, `roles/developer.md`)

Sizing/edges are the Planner's call when the iteration is cut; this section is an input, not a topology.
