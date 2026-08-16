---
name: aeg-core
description: "@atta/aeg-core" internals — the pure evaluators that mechanize AEG's gates (dispatch readiness, doc-coverage C5, coherence oracle A/T/R/L checks, brief validation, the diagram model, the state-machine model). Load when working inside packages/aeg-core/**. Do NOT load for the forge-fetching adapter (packages/aeg-forge-state) or for the doctrine the evaluators mechanize (aeg-root) — see the aeg-forge-state / aeg-model skills for those.
---

# `@atta/aeg-core` — Pure Gate Evaluators

## Context

`@atta/aeg-core` is the shared implementation behind `enforcement.md`'s load-bearing claim: *"the same check runs at ring 0 and ring 1."* Every predicate a hook (`.husky/pre-push`, `.claude/hooks/check-skill.sh`) evaluates lives here once, as a pure function. This package is the *gate logic*; it does not fetch anything itself, and it does not mechanize any UI. `packages/aeg-forge-state` fetches; `apps/vinaya/web` renders; `aeg-core` decides.

**How ring 1 consumes this package changed when attalabs adopted the published CLI.** CI no longer calls these evaluators from this workspace: the managed `vinaya-checks.yml` runs the published `@attalabs/vinaya`, which bundles a *published* copy of this package (the vendored CLI workspace and the old `forge-lifecycle.yml` are both deleted; `conventions.yml` still calls `bin/verify-coherence.ts`/`bin/verify-brief.ts` from this workspace, but only for non-blocking labeling side effects). Consequence: an evaluator change here does NOT reach the blocking CI gates until it is published through the standalone `atta-labs/vinaya` repo and this repo runs `vinaya upgrade` — the canonical evaluator source for the shipped CLI lives there, and this workspace's copy serves this repo's own hooks and labeling.

## Architecture — the purity charter is the invariant, not a preference

**Every module in `src/` is pure: no `fs`, no `fetch`, no `child_process`, no I/O of any kind.** This is stated explicitly in file after file (`types.ts`: *"This module is pure: no I/O"*; `dispatch-gate.ts`: *"Pure — no fs, no fetch"*; `diagram-model.ts`: *"Pure — zero I/O, zero node: imports"*) and it is not a style nicety — it is what makes `enforcement.md`'s ring-0/ring-1 identity claim true. A pure function composed the same way in a local `bin/*.ts` script and a CI workflow step cannot disagree; an impure one that reads a file or shells to `gh` internally could read different bytes in each context and silently drift. Every evaluator here takes its facts as typed **arguments**, never resolves them itself:

```
Forge state (packages/aeg-forge-state) ──┐
Repo files (parsed by parse-*.ts here)  ──┼──> typed facts ──> pure evaluator (this package) ──> verdict/findings
PR body / diff (read by the bin/*.ts caller) ─┘
```

The caller — a `packages/aeg-core/bin/*.ts` CLI, a `vinaya check` adapter (in the standalone `atta-labs/vinaya` repo's `apps/cli/src/checks/bin/`; the vendored copy here was deleted), or a CI workflow step — does the I/O and hands the result in. If a feature needs a network call or a filesystem read, that code belongs in the caller (or in `packages/aeg-forge-state`, the one package this rule structurally exempts — see that skill), never inside `src/`.

### File shape — one evaluator, one concern, paired test

The package is just under 100 files (~95 in `src/`), almost all as `<concern>.ts` + `<concern>.test.ts` pairs, re-exported through one barrel (`index.ts`). Representative families:

| Family | Files | What it evaluates |
|---|---|---|
| **Dispatch readiness** | `dispatch-gate.ts`, `leftover-detection.ts`, `first-push-dispatch-gate.ts` | The preconditions `roles/developer.md`'s entry gate states in prose — Issue existence, prior-tranche archival, dependency/conflict edges — composed into one `{ ready, blockers }` verdict |
| **Doc coverage (C5)** | `doc-owners.ts`, `manifest-validity.ts`, `derive-section7.ts` | `.vinaya/doc-owners` bind-or-waive evaluation (`evaluateC5`), the Neutral-edit diff check, the completeness scoreboard's manifest validity |
| **Coherence oracle** | `coherence-checks.ts`, `single-plan-pr.ts`, `direct-main-push.ts`, `dead-branch-push-audit.ts` | A1/A2/A3/T1/T2/T3/D1/L1–L5/R1 — plan↔forge drift classes, from orphaned Issues to duplicate decision numbers |
| **Brief/Issue grammar** | `brief-validation.ts`, `issue-validation.ts`, `premise-check.ts`, `pr-tier.ts` | Every gate-read PR-body/Issue-body field: `Tier:`, `Project:`, the Test Plan section, the Premise block, the Planner-rationale sections |
| **Review/provenance** | `review-gate.ts`, `verdict-extraction.ts`, `archive-task.ts`, `waiver-label.ts` | The review-gate verdict extraction, the post-merge provenance block, actor-verified waiver labels |
| **Registry self-check** | `registry-parse.ts`, `registry-checks.ts`, `actions.ts` | G1–G5 — proving `enforcement.md`'s own registry matches installed reality |
| **Rendering model** | `diagram-model.ts`, `state-machine-model.ts`, `markdown-table.ts` | `DiagramModel`/`deriveStatusFromModel` — the one derivation N renderers (Studio, `/docs/harness`, `/docs/state-machine`) consume |
| **Ledger/tokens** | `parse-ledger.ts`, `sum-ledger.ts`, `parse-token-report.ts`, `report-tokens.ts` | The append-only token ledger's parse + derive-at-read-time sum |

### The seam types (`types.ts`, `state-source.ts`, `doctrine-source.ts`)

`Tranche`/`Task` (from `@atta/aeg-types`, re-exported) are the typed shapes every evaluator consumes. `StateSource` and `DoctrineSource` are **interfaces only** — `getTranche(slug)` and doctrine-content contracts with zero implementation in this package (the purity charter: *"aeg-core's zero-I/O purity charter means this file holds only the type — no adapter implementation lives here"*). `packages/aeg-forge-state` and `@atta/vinaya-sources` implement them; `aeg-core` only defines what an implementation must satisfy. This is what lets the same `deriveTranche` run identically over a forge-backed adapter or a (legacy, transitional) file-backed one.

## Rules

### Zero I/O, no exceptions

```ts
// ✅ facts arrive as arguments
export function checkDispatchReadiness(input: DispatchGateInput): DispatchResult { ... }

// ❌ never inside this package
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
```

If a new evaluator's honest implementation needs to read a file or shell out, the read/shell belongs in the `bin/*.ts` caller or in `packages/aeg-forge-state` — pass the bytes in.

### One evaluator, one `bin/*.ts` (or `vinaya check` adapter) caller, never two implementations

When the same rule must run at both ring 0 and ring 1, the shared logic is a single exported function here, called from both `.husky/*`/`packages/aeg-core/bin/*.ts` (ring 0) and the CI workflow's invocation of the same bin (ring 1) — never a second hand-copied implementation in the workflow YAML.

### Additive-only evolution on versioned surfaces

`CheckSpec`/`CheckError`/`CheckOutcome` (consumed by the CLI's check runner in the standalone `atta-labs/vinaya` repo) and `DiagramModel`'s shape are public, versioned contracts — fields may be added, never removed, renamed, or retyped without a version bump. Third-party adopters (via the published `@attalabs/vinaya` package, which inlines this workspace) build against these shapes.

### Message style: name the exact failing fact

Every evaluator here that produces human-readable output (`coherence-checks.ts`'s A1/T2/etc. family, `dispatch-gate.ts`'s blockers) names the exact task/Issue/PR involved in one line per failure — never a generic "something is wrong." This is what makes a hook's refusal message actionable enough for an agent to self-correct in-session, the whole point of ring 0.

## Anti-patterns

- ❌ Adding `fs`/`fetch`/`child_process` (or any `node:*` import that touches the outside world) anywhere in `src/` — breaks the ring-0/ring-1 identity guarantee this whole package exists to provide.
- ❌ Implementing `StateSource`/`DoctrineSource` inside this package — those are contracts; implementations live in `packages/aeg-forge-state` / `@atta/vinaya-sources`.
- ❌ Duplicating a check's logic in a CI workflow YAML step instead of calling the shared `bin/*.ts` — the moment ring 0 and ring 1 diverge, `enforcement.md`'s central claim becomes false.
- ❌ Removing or retyping a field on `CheckSpec`/`CheckError`/`DiagramModel` — these are versioned public contracts consumed outside this monorepo.
- ❌ Writing a new evaluator without a paired `.test.ts` — every existing evaluator in this package ships one.
- ❌ Hardcoding this monorepo's own paths/product names into a generically-named evaluator — `packages/aeg-forge-state`'s README states the discipline explicitly ("keep the public API shaped for an arbitrary triple, not this-repo-only conveniences"); the same rule applies here, since this package ships inside the public `@attalabs/vinaya` tarball.

## When you need more context

- **aeg-model** skill — the doctrine (`aeg-root/**`) these evaluators mechanize; read this first if the *rule* being enforced, not the code enforcing it, is unclear
- **aeg-forge-state** skill — the one sanctioned adapter that fetches the facts these evaluators consume
- **vinaya-architecture** skill — how `vinaya check`'s adapters (standalone `atta-labs/vinaya` repo, `apps/cli/src/checks/bin/`) wrap these same evaluators for the shipped CLI
- `aeg-root/state-machine.md` §15/§15b/§15d — the doc-coverage, coherence, and dispatch-readiness seams this package implements
