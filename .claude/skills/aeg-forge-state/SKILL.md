---
name: aeg-forge-state
description: "@atta/aeg-forge-state" internals — the one sanctioned adapter that derives AEG's Tranche/Task shapes purely from live GitHub forge objects (Milestones + labeled Issues), with zero topology file. Load when working inside packages/aeg-forge-state/**. Do NOT load for the pure evaluators that consume its output (packages/aeg-core) or for the doctrine it implements (aeg-root) — see the aeg-core / aeg-model skills for those.
---

# `@atta/aeg-forge-state` — Forge-Derivation Adapter

## Context

`tranche-model.md` §4 states the model's boundary condition plainly: *"A plan is a Milestone plus labeled Issues. There is no topology file."* `@atta/aeg-forge-state` is the package that makes that literally true — it is the sole place in AEG that reads a live GitHub repository and turns it into the typed `Tranche`/`Task` shapes every pure evaluator in `packages/aeg-core` consumes. Where `aeg-core` is deliberately I/O-free, this package exists **because** something has to do the I/O — it is aeg-core's structural exception, not a violation of the purity charter, and it is scoped narrowly: read-only, `gh`-CLI-only, no second access path.

## Architecture — derivation, not storage

```
GitHub (owner, repo)
   │
   ├─ Milestone titled exactly `<slug>`  ──> goal (description) + lifecycle (open/closed → active/complete)
   │                                          null when no Milestone exists yet (a real, expected
   │                                          transitional state — not an error)
   │
   └─ Issues labeled `vinaya/tranche:<slug>` ──> Task[] — id/title parsed from the
                                                   `[<slug>] <id> — <title>` convention,
                                                   projects from `project:<name>` labels,
                                                   dependsOn/conflictsWith parsed from each
                                                   Issue's "Dependency rationale" section
   │
   ▼
deriveTrancheFromForge(owner, repo, slug) → Tranche   (packages/aeg-types shape, zero file fallback)
```

Every public function takes `owner`/`repo` (and usually `slug`) as **explicit parameters** — never hardcoded, never inferred from `cwd` inside the package itself. This is the property that lets the identical code serve two structurally different consumers without diverging:

1. **This repo's own migration** — the gates (`packages/aeg-core/bin/*`) and Vinaya Studio call this package directly to read *this* monorepo's tranches.
2. **The shippable `vinaya-cli`'s `StateSource` seam** (`apps/vinaya/sources/src/forge-adapter.ts`'s `createForgeSource`) — imports this package as a `workspace:*` dependency (not re-homed — it is already general-purpose) to give an arbitrary adopter repo the identical forge-derivation behavior.

### File shape

| File | Responsibility |
|---|---|
| `derive-from-forge.ts` | `deriveTrancheFromForge` — the top-level composition: Milestone facts + labeled-Issue list → `Tranche` |
| `fetch-milestone.ts` | `findMilestoneForSlug`, `listActiveTrancheSlugs(Async)`, `listArchivedTrancheSlugs(Async)` |
| `fetch-forge-facts.ts` | `fetchForgeFacts`, `fetchForgeTasksByLabel`, `buildBranchName` — the per-task status-derivation input |
| `fetch-open-issues.ts`, `fetch-task-issue-refs.ts`, `fetch-provenance.ts` | Narrower forge reads used by specific gates (backlog listing, task↔Issue cross-reference, post-merge provenance lookup) |
| `parse-rationale-deps.ts`, `amend-rationale-deps.ts` | Parses/amends the Issue-body "Dependency rationale" field — the one atomic write path for `depends-on`/`conflicts-with` edges |
| `labels.ts` | `LABELS`, the **code-owned** label vocabulary (`state-machine.md` §14 renders from this file, not the reverse) |
| `map-forge-facts.ts` | `mapForgeFacts` — raw GitHub facts → the derived-status vocabulary `packages/aeg-core/src/state-machine-model.ts` consumes |
| `gh.ts`, `github-token.ts` | The one shared `gh`-CLI shell-out primitive and token resolution (`GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token` subprocess) |

## Rules

### `gh`-CLI-only, one access path

All forge access shells out to the local `gh` CLI through `gh.ts` — never a second octokit-based or raw-REST access path. A new fetch function wraps `gh.ts`, it does not add a parallel client.

### Read-only, always

This package never writes to the forge. Every export is a `fetch*`/`list*`/`derive*`/`parse*` function. A write belongs in `packages/aeg-core/bin/*.ts` (this repo's own sanctioned writers: `open-pr.ts`, `open-issue.ts`, `archive-task.ts`) or `apps/vinaya/cli`'s `pr`/`issue` commands — never here.

### Generic over `(owner, repo, slug)` — never this-repo-only

Every public function takes the triple explicitly. A convenience that reads well for this monorepo but assumes its specific owner/repo/label scheme belongs in the caller, not this package — the README states this as the entire reason the package exists standalone rather than living inside `apps/vinaya/cli`.

### `backlog` and amendment-prose are known, accepted gaps — not bugs to silently patch

Forge-derived tranches always report `backlog: []` (the `## Backlog` section is project-level prose with no owning forge object) and `dependsOn`/`conflictsWith` parse only the structured "Dependency rationale" field, not a free-text amendment appended below it. Both are documented, intentional scope limits — extending either is a real design change, not a bug fix, and should be escalated rather than silently widened.

### `gh` failures are real, expected states — never crash the caller

A missing Milestone, an unreachable `gh`, or zero labeled Issues for a slug are ordinary transitional states this package's callers are built to handle (`null` Milestone facts, empty task lists) — not exceptions to throw past the caller. Preserve that contract in new fetchers: return the "nothing found yet" shape, don't throw.

## Anti-patterns

- ❌ Adding a second forge-access mechanism (octokit, raw REST) alongside `gh.ts` — one implementation, per the package's own stated design.
- ❌ Hardcoding this repo's owner/repo, a label literal, or any `attalabs`/`vinaya`-specific assumption into a function that doesn't already take it as a parameter — breaks the two-consumer genericity the package exists for.
- ❌ Writing to the forge from anywhere in this package — read-only is a hard boundary, not a convention.
- ❌ Re-deriving the label vocabulary by hand elsewhere instead of importing `labels.ts`'s `LABELS` — `state-machine.md` §14 is explicit that the vocabulary is code-owned here, not doc-owned.
- ❌ Silently expanding `backlog`/amendment-prose derivation as a side effect of an unrelated fix — both are documented gaps; closing either is its own task with its own proof.

## When you need more context

- **aeg-model** skill — `tranche-model.md` §3/§4 for the full "status is derived, never stored" reasoning this package's entire design follows
- **aeg-core** skill — the pure evaluators (`state-machine-model.ts`, `dispatch-gate.ts`, `coherence-checks.ts`) that consume this package's output
- **vinaya-architecture** skill — the `StateSource` seam (`apps/vinaya/sources`) that re-exports this package as one of Vinaya's two adapters
- `aeg-root/state-machine.md` §14 — the label vocabulary this package's `labels.ts` owns
