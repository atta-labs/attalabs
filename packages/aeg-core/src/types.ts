/**
 * Typed model for AEG artifacts. See `aeg-root/iterations/README.md` for the
 * canonical specification (§3 status table, §4 thin-file template).
 *
 * This module is pure: no I/O. The parser produces these shapes from file
 * contents; `deriveIteration` consumes them plus a `ForgeFacts` snapshot.
 */

import type { ForgeFacts, Iteration, Lifecycle, Task } from '@atta/aeg-types'

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

// ---------- Forge facts ----------

/**
 * `ForgeFacts` lives in `@atta/aeg-types` (aeg-core-purity fix, #521) —
 * re-exported here for the same reason as `Lifecycle`/`Task`/`Iteration`:
 * every existing call site imports it from `@atta/aeg-core`, and it moved
 * out so the I/O-performing fetchers that produce it (now in
 * `@atta/aeg-forge-state`) don't need to depend on `aeg-core`.
 */
export type { ForgeFacts }

// ---------- Derivation output ----------

/**
 * The statuses derivation can conclude. The *rules* that produce them are not
 * written here or in `derive-iteration.ts` — they live as an ordered,
 * pure-data list in `state-machine-model.ts` (, the `actions.ts`
 * discipline), which `deriveStatus` executes and the docs render from the
 * same list.
 *
 * `backlog` remains a member because it is a project-level concept consumers
 * still render; derivation never emits it inside an iteration.
 *
 * `dropped` and `incoherent` are the two **honest terminal** statuses.
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
