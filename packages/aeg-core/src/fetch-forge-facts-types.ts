/**
 * Internal types for the local GitHub read adapter (`fetch-forge-facts.ts`,
 * `map-forge-facts.ts`). `ForgeFacts` is defined in `./types`; this module
 * imports it and never redefines it. These types describe the *adapter's*
 * input/output shapes — the raw GitHub responses the I/O layer extracts and
 * the snapshot envelope the caller consumes.
 */

import type { ForgeFacts } from './types'

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
   * `unavailable: true` rather than throwing — callers must render without it.
   */
  token?: string
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
   * map will be empty in this case; `deriveIteration` then treats every task
   * as `todo` — iteration tasks are committed work, minimum `todo` (D-059).
   */
  unavailable: boolean
  /** Diagnostic — logged, not user-facing. Empty when `unavailable` is false. */
  reason?: string
}

/** Forge identity of the PR a task's facts resolved to. Display-only. */
export type PrRef = {
  number: number
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
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
  /** Presence of `refs/heads/task/<iteration>/<id>` on the forge. */
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
