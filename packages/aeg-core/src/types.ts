/**
 * Typed model for AEG artifacts. See `aeg-root/iterations/README.md` for the
 * canonical specification (§3 status table, §4 thin-file template).
 *
 * This module is pure: no I/O. The parser produces these shapes from file
 * contents; `deriveIteration` consumes them plus a `ForgeFacts` snapshot.
 */

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

export type Lifecycle = 'active' | 'complete'

export type Task = {
  /**
   * Task identifier. A string — not a number — because real iterations contain
   * suffixed ids like `3a`, `7a`, `7b` (verification-coupled splits).
   */
  id: string
  title: string
  /** Forge Issue number, or `null` when the cell is empty / `-` / `—`. */
  issue: number | null
  /** `Project(s)` cell, split by `,`. Always at least one entry for a real row. */
  projects: string[]
  /** Edge ids referencing other tasks. `—`/`-`/empty → `[]`. */
  dependsOn: string[]
  /** Edge ids referencing other tasks. `—`/`-`/empty → `[]`. */
  conflictsWith: string[]
  /**
   * Raw markdown of the matching `### Task <id> — …` section, when present.
   * Empty string when there is no rationale block for this id (the rationale is
   * captured verbatim, not deeply parsed — the Brief Author / UI consumes it).
   */
  rationaleMarkdown: string
}

export type Iteration = {
  /** Slug from `# Iteration: <name> — <timeframe>`. */
  name: string
  /**
   * Lifecycle marker per §4 / §11. Defaults to `'active'` when absent — the
   * pre-§11 iteration files do not carry the marker, and the file living at
   * the top of `iterations/` (not `completed/`) implies active.
   */
  lifecycle: Lifecycle
  /** First-paragraph goal (bold markers stripped). Empty string if missing. */
  goal: string
  /** Rows of the `## Tasks (topology)` table, in source order. */
  tasks: Task[]
  /**
   * Bullets under an optional `## Backlog` section. Empty when the section is
   * absent (both live fixtures omit it).
   */
  backlog: string[]
}

// ---------- Forge facts (the contract task 3 will produce) ----------

/**
 * Per-task forge snapshot. Task 3 (Local GitHub read adapter) produces this
 * from the live forge; `deriveIteration` consumes it. Every input the §3
 * status table needs is present here, and only those.
 *
 * Conventions for missing entries: a task absent from the `Map<TaskId,
 * ForgeFacts>` passed to `deriveIteration` is treated as `backlog` (no
 * forge fact known yet — the conservative read).
 */
export type ForgeFacts = {
  issueState: 'open' | 'closed'
  /** Issue assignee present. Drives the `backlog → todo` transition (§3). */
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
}

// ---------- Derivation output ----------

export type DerivedStatus = 'backlog' | 'todo' | 'in-flight' | 'in-review' | 'changes-requested' | 'merged' | 'blocked'

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
