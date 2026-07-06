/**
 * Typed model for AEG artifacts. See `aeg-root/iterations/README.md` for the
 * canonical specification (§3 status table, §4 thin-file template).
 *
 * This module is pure: no I/O. The parser produces these shapes from file
 * contents; `deriveIteration` consumes them plus a `ForgeFacts` snapshot.
 */

import type { Iteration, Lifecycle, Task } from '@atta/aeg-types'

// ---------- Registry (projects.md) ----------

export type Project = {
  /** Registry-unique name. Authority for `Project:` validation. */
  name: string
  /** Declared home folder (e.g. `apps/vada-ai`). Never derived. */
  path: string
  /** Specs folder for the project. */
  specsPath: string
  /**
   * Per-project state folder, or `null` when the cell holds prose like
   * "state tracked globally for now" — i.e. state isn't tracked under this
   * project's path.
   */
  statePath: string | null
}

export type Registry = Project[]

// ---------- Iteration file (iterations/<name>.md) ----------

/**
 * `Lifecycle`/`Task`/`Iteration` live in `@atta/aeg-types` (task
 * aeg-forge-state-v1 3a) — re-exported here since every existing call site
 * across the repo imports them from `@atta/aeg-core`. Moved out so
 * `@atta/aeg-forge-state` can depend on these shapes without creating a
 * package cycle with `aeg-core` (which in turn depends on
 * `aeg-forge-state`'s derivation function).
 */
export type { Lifecycle, Task, Iteration }

// ---------- Forge facts (the contract task 3 will produce) ----------

/**
 * Per-task forge snapshot. Task 3 (Local GitHub read adapter) produces this
 * from the live forge; `deriveIteration` consumes it. Every input the §3
 * status table needs is present here, and only those.
 *
 * Conventions for missing entries: a task absent from the `Map<TaskId,
 * ForgeFacts>` passed to `deriveIteration` is treated as `todo` — iteration
 * tasks are committed work; `backlog` is a project-level concept (D-059).
 */
export type ForgeFacts = {
  issueState: 'open' | 'closed'
  /** Issue assignee present. No longer affects `todo` derivation (D-059). */
  assigned: boolean
  /** A `task/<iteration>/<n>` branch exists on the forge. */
  branchExists: boolean
  prState: 'none' | 'open' | 'merged'
  /**
   * GitHub's `reviewDecision` projected to AEG's three relevant values.
   * `'none'` covers both "no review yet" and the (rare) approved-but-not-
   * merged state — `'changes_requested'` is the only one that flips status.
   */
  reviewDecision: 'none' | 'changes_requested' | 'approved'
  /** `aeg:blocked` label present. Wins over every other status (§3). */
  blockedLabel: boolean
  /**
   * GitHub's native close reason (`stateReason`), projected to AEG's terms:
   *   - `'completed'`    ← closed COMPLETED
   *   - `'not_planned'`  ← closed NOT_PLANNED (legitimately dropped)
   *   - `null`           ← issue open, or no close reason recorded
   * Drives the honest terminal-status derivation (D-069): a closed Issue with
   * no merged PR resolves to `dropped` (NOT_PLANNED) or `incoherent`
   * (COMPLETED-but-unproven) — never the innocuous `todo`.
   */
  stateReason: 'completed' | 'not_planned' | null
  /** ISO 8601 datetime when the Issue was closed, or `null` if still open. Used by the coherence oracle for grandfather cutoff logic. */
  closedAt: string | null
  /** ISO 8601 datetime when the closing PR was merged, or `null` if not yet merged. Used by the coherence oracle for grandfather cutoff logic. */
  mergedAt: string | null
}

// ---------- Derivation output ----------

/**
 * `dropped` and `incoherent` are the two **honest terminal** statuses (D-069).
 * A closed Issue with no merged PR must never resolve to `todo` (which implies
 * not-started). `dropped` = closed `NOT_PLANNED` (legitimately abandoned);
 * `incoherent` = closed `COMPLETED` but with no merged-PR link (genuinely done
 * yet unprovable, or a broken close). Both are surfaced, never hidden.
 */
export type DerivedStatus =
  | 'backlog'
  | 'todo'
  | 'in-flight'
  | 'in-review'
  | 'changes-requested'
  | 'merged'
  | 'blocked'
  | 'dropped'
  | 'incoherent'

export type DispatchBlockers = {
  /** Depends-on edges whose target is not yet `merged`. */
  dependsOnNotMerged: string[]
  /**
   * Conflicts-with edges whose target is currently occupying its collision
   * domain — derived status `in-flight`, `in-review`, or `changes-requested`
   * (§8 conflict gate).
   */
  conflictsWithOpenOrInFlight: string[]
}

export type DerivedTask = {
  task: Task
  status: DerivedStatus
  /**
   * `true` when the §8 gates allow dispatching this task: all `dependsOn`
   * targets are `merged`, and no `conflictsWith` target is open/in-flight.
   * Dispatchability is independent of this task's own current status — a
   * task already `in-review` is still "dispatchable" by this definition (the
   * gates would have allowed it to start).
   */
  dispatchable: boolean
  blockers: DispatchBlockers
}

export type UnknownEdge = {
  from: string
  to: string
  kind: 'depends-on' | 'conflicts-with'
}

export type DerivedIteration = {
  iteration: Iteration
  tasks: DerivedTask[]
  /**
   * Edges that reference task ids not present in this iteration's topology
   * table. Surface for diagnostics; does not throw, since real files
   * occasionally name dropped/prose-only ids (e.g. `3a` in
   * `herald-onto-engine.md`'s narrative).
   */
  unknownEdges: UnknownEdge[]
}

// ---------- Token ledger (iterations/<name>.tokens.md) ----------

/**
 * One row of the append-only per-iteration token/cost ledger. See
 * `aeg-root/iterations/README.md` §12 for the canonical format. Each role
 * appends one row at the end of its turn; re-entry appends another row.
 * The iteration total is `sum(rows)`, derived at read time — never stored.
 *
 * The two capture sources surface here as `null` cells: a row written by a
 * claude.ai role (Planner / Brief Author / Reviewer / Security) before the
 * Principal has filled in its usage figure has `tokensIn`/`tokensOut`/`cost`
 * as `null`; a terminal-role row (Developer / Archivist with `/cost`) has
 * exact numbers.
 */
export type LedgerRow = {
  /** Free-text phase identifier. Convention: `<task-id>: <phase>` per task
   * (e.g. `9: develop`), or a bare phase for iteration-wide work (e.g.
   * `planning`). The parser does not enforce the convention — the Phase
   * cell is opaque so the table can be re-pivoted later. */
  phase: string
  role: string
  /** Free-text — the role's agent + model (e.g. `claude-opus-4-7 (CC)`,
   * `claude-opus-4-7 (chat)`). The PRICING table dependency is on the
   * model name, not on the parser. */
  agentModel: string
  /** `null` when the cell was `—` / `-` / empty (unknown — claude.ai
   * row not yet filled). */
  tokensIn: number | null
  tokensOut: number | null
  /** Cost in USD as a number. `null` for unknown. Cost depends on the
   * adapter's PRICING table — when the model is missing from it, this is
   * `0` from the source row, not `null` (a known limitation, not a parser
   * bug). */
  cost: number | null
  /** Raw date cell — typically `YYYY-MM-DD`. Captured as a string so the
   * model docs can evolve the format without breaking the parser. */
  date: string
}

/**
 * `sumLedger(rows)` output — pure aggregate over the rows in source order.
 * Null cells contribute zero; the row count is preserved so a UI can show
 * "N entries totalling …".
 */
export type LedgerTotals = {
  tokensIn: number
  tokensOut: number
  cost: number
  rows: number
}
