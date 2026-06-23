/**
 * Internal types for the local GitHub read adapter.
 *
 * `ForgeFacts` is owned by `@atta/aeg-core`; this module imports it and never
 * redefines it. These types describe the *adapter's* input/output shapes — the
 * raw GitHub responses the I/O layer extracts and the snapshot envelope the
 * caller consumes.
 */

import type { ForgeFacts } from '@atta/aeg-core'

/** Identity of a task as parsed from the iteration topology table. */
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
  /** Iteration slug — used to build the `task/<iteration>/<id>` branch ref. */
  iteration: string
  tasks: TaskRef[]
  /**
   * Optional explicit token. When absent the I/O layer auto-discovers (env,
   * then `gh auth token`). When discovery also fails, the snapshot returns
   * `unavailable: true` rather than throwing — Studio must render without it.
   */
  token?: string
}

/**
 * Snapshot returned by `fetchForgeFacts`. The brief's literal contract is
 * `Promise<Map<TaskId, ForgeFacts>>`; we wrap it so the no-token / unreachable
 * case has an explicit soft signal Studio can surface ("live status
 * unavailable") without having to infer it from an empty map.
 */
export type ForgeFactsSnapshot = {
  facts: Map<string, ForgeFacts>
  /**
   * `true` when GitHub was unreachable or no token was available. The facts
   * map will be empty in this case; `deriveIteration` then treats every task
   * as `todo` — iteration tasks are committed work, minimum `todo` (D-059).
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
    assigneesCount: number
    labels: string[]
  } | null
  /** Presence of `refs/heads/task/<iteration>/<id>` on the forge. */
  refExists: boolean
  /** Most recent PR (any state) whose head branch matches the task ref. */
  pullRequest: {
    state: 'OPEN' | 'CLOSED' | 'MERGED'
    /**
     * `null` covers "no review yet". `'REVIEW_REQUIRED'` is GitHub's value for
     * a PR that requires review but has none — the mapper projects it to
     * `'none'` (same effective meaning for AEG).
     */
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  } | null
}

export type { ForgeFacts }
