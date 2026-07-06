/**
 * Shared AEG iteration/task shapes, extracted from `@atta/aeg-core` (task
 * aeg-forge-state-v1 3a) so `@atta/aeg-forge-state` can depend on these
 * types without creating a package cycle: `aeg-forge-state` needs them to
 * type its forge-derived output, and `aeg-core`'s bin scripts need to
 * consume `aeg-forge-state`'s derivation function — a genuine bidirectional
 * runtime need that can't be satisfied by either package depending on the
 * other. Zero dependencies, zero I/O.
 */

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
