/**
 * Local read-only GitHub forge-facts adapter for AEG Studio.
 *
 * Produces the `Map<TaskId, ForgeFacts>` snapshot `@atta/aeg-core`'s
 * `deriveIteration` consumes — running locally with the operator's own
 * GitHub auth. Read-only (AEG D-029). Server-only. Degrades gracefully
 * when no token is available.
 *
 * Public surface:
 *   fetchForgeFacts(input)  — the snapshot fetcher (I/O + mapping)
 *   buildBranchName(...)    — task/<iteration>/<id> helper (exported for callers
 *                              that need the same convention without re-deriving)
 *   mapForgeFacts(raw)      — the pure mapper, exported for tests / advanced use
 *   Types: TaskRef, FetchForgeFactsInput, ForgeFactsSnapshot
 */

export { fetchForgeFacts, buildBranchName, fetchForgeTasksByLabel } from './fetch-forge-facts'
export { mapForgeFacts, AEG_BLOCKED_LABEL } from './map-forge-facts'
export { fetchPullRequestBriefs } from './fetch-pull-request-brief'
export { fetchIterationTokenLedger } from './fetch-token-ledger'
export { resolveRepo } from './resolve-repo'
export { loadIterationSnapshot, loadIterationProgress } from './load-snapshot'
export type { IterationSnapshot, IterationProgress } from './load-snapshot'
export type { FetchForgeFactsInput, ForgeFactsSnapshot, TaskRef, RawTaskFacts } from './types'
export type {
  PullRequestBrief,
  PullRequestBriefSnapshot,
  FetchPullRequestBriefsInput
} from './fetch-pull-request-brief'
export type { FetchTokenLedgerInput, TokenLedgerSnapshot } from './fetch-token-ledger'
export type { RepoRef } from './resolve-repo'
