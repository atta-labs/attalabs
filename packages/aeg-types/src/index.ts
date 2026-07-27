/**
 * Shared AEG tranche/task shapes, extracted from `@atta/aeg-core` (task
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
   * Task identifier. A string — not a number — because real tranches contain
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

export type Tranche = {
  /** Slug from `# Tranche: <name> — <timeframe>`. */
  name: string
  /**
   * Lifecycle marker per §4 / §11. Defaults to `'active'` when absent — the
   * pre-§11 tranche files do not carry the marker, and the file living at
   * the top of `tranches/` (not `completed/`) implies active.
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

// ---------- Forge facts + local read-adapter shapes ----------
//
// Moved here from `@atta/aeg-core/src` (aeg-core-purity fix, #521):
// `@atta/aeg-core/src` must stay zero-I/O (#372, #382, #506), but the
// I/O-performing fetchers that produce/consume these shapes
// (`fetchForgeFacts`, `fetchOpenIssuesByLabel`) live in
// `@atta/aeg-forge-state`, which cannot depend on `@atta/aeg-core` without
// recreating the cycle `aeg-forge-state-v1` 3a already broke once. Putting
// the shapes at the bottom of the chain lets `aeg-forge-state` type its own
// I/O without importing `aeg-core`, while `aeg-core` re-exports them for
// every existing call site that imports from `@atta/aeg-core`.

/**
 * Per-task forge snapshot. `deriveTranche` (`@atta/aeg-core`) consumes this.
 *
 * Conventions for missing entries: a task absent from the `Map<TaskId,
 * ForgeFacts>` passed to `deriveTranche` is treated as `todo` — tranche
 * tasks are committed work; `backlog` is a project-level concept (D-059).
 */
export type ForgeFacts = {
  issueState: 'open' | 'closed'
  /** Issue assignee present. No longer affects `todo` derivation (D-059). */
  assigned: boolean
  /** A `task/<tranche>/<n>` branch exists on the forge. */
  branchExists: boolean
  prState: 'none' | 'open' | 'merged'
  /**
   * GitHub's `reviewDecision` projected to AEG's three relevant values.
   * `'none'` covers both "no review yet" and the (rare) approved-but-not-
   * merged state — `'changes_requested'` is the only one that flips status.
   */
  reviewDecision: 'none' | 'changes_requested' | 'approved'
  /** `vinaya/blocked` label present. Wins over every other status (§3). */
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

/** An open Issue's forge-fetched body + labels, as returned by the batched label query. */
export type ForgeIssue = { number: number; body: string; labels: string[] }

/** A `Closes #N` Issue's resolved AEG task identity — the tranche slug and
 * task id derived from its title (`[<slug>] <id> — ...`) and `vinaya/tranche:<slug>`
 * label. Used by `checkClosesN`'s reverse-direction check (D-069 Layer 1
 * reverse): a branch closing an Issue that resolves to one of these must be
 * named `task/<iterSlug>/<taskId>`. */
export type TaskIssueRef = { iterSlug: string; taskId: string }

/** Identity of a task as parsed from the tranche topology table. */
export type TaskRef = {
  /** Task id from the topology table — a string (e.g. `3`, `7a`). */
  id: string
  /** Forge Issue number, or `null` when the cell is empty / `-` / `—`. */
  issue: number | null
}

/** Inputs to `fetchForgeFacts`. */
export type FetchForgeFactsInput = {
  owner: string
  repo: string
  /** Tranche slug — used to build the `task/<tranche>/<id>` branch ref. */
  tranche: string
  tasks: TaskRef[]
  /**
   * Optional explicit token. When absent the I/O layer auto-discovers (env,
   * then `gh auth token`). When discovery also fails, the snapshot returns
   * `unavailable: true` rather than throwing — callers must render without it.
   */
  token?: string
}

/** Forge identity of the PR a task's facts resolved to. Display-only. */
export type PrRef = {
  number: number
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
}

/**
 * Snapshot returned by `fetchForgeFacts`. The brief's literal contract is
 * `Promise<Map<TaskId, ForgeFacts>>`; we wrap it so the no-token / unreachable
 * case has an explicit soft signal callers can surface ("live status
 * unavailable") without having to infer it from an empty map.
 */
export type ForgeFactsSnapshot = {
  facts: Map<string, ForgeFacts>
  /**
   * Forge identity (number + URL + state) of the PR each task's facts resolved
   * to, keyed by task id. Display-only — `ForgeFacts` deliberately carries no
   * forge identity, so surfaces that link to the PR read it from here instead.
   * Empty when `unavailable`.
   */
  prRefs: Map<string, PrRef>
  /**
   * `true` when GitHub was unreachable or no token was available. The facts
   * map will be empty in this case; `deriveTranche` then treats every task
   * as `todo` — tranche tasks are committed work, minimum `todo` (D-059).
   */
  unavailable: boolean
  /** Diagnostic — logged, not user-facing. Empty when `unavailable` is false. */
  reason?: string
}

/**
 * What the GraphQL layer extracts per task before mapping. Each field can be
 * `null` (issue not found, branch deleted, no PR yet). The pure mapper turns
 * this into a `ForgeFacts`.
 */
export type RawTaskFacts = {
  issue: {
    state: 'OPEN' | 'CLOSED'
    /**
     * GitHub's native close reason. `null` while the issue is open or no reason
     * was recorded. The pure mapper projects `COMPLETED`/`NOT_PLANNED` onto
     * `ForgeFacts.stateReason` (`'completed'`/`'not_planned'`), everything else
     * to `null` — driving the honest terminal-status derivation (D-069).
     */
    stateReason: 'COMPLETED' | 'NOT_PLANNED' | 'REOPENED' | null
    /** ISO 8601 datetime when the issue was closed, or null if still open. */
    closedAt: string | null
    assigneesCount: number
    labels: string[]
  } | null
  /** Presence of `refs/heads/task/<tranche>/<id>` on the forge. */
  refExists: boolean
  /** Most recent PR (any state) whose head branch matches the task ref. */
  pullRequest: {
    number: number
    /** Forge web URL of the PR. */
    url: string
    state: 'OPEN' | 'CLOSED' | 'MERGED'
    /**
     * `null` covers "no review yet". `'REVIEW_REQUIRED'` is GitHub's value for
     * a PR that requires review but has none — the mapper projects it to
     * `'none'` (same effective meaning for AEG).
     */
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
    /** ISO 8601 datetime when the PR was merged, or null. */
    mergedAt: string | null
  } | null
}
