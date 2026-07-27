/**
 * Local read-only GitHub forge-facts adapter for Vinaya Studio.
 *
 * Produces the `Map<TaskId, ForgeFacts>` snapshot `@atta/aeg-core`'s
 * `deriveTranche` consumes — running locally with the operator's own
 * GitHub auth. Read-only (AEG). Server-only. Degrades gracefully
 * when no token is available.
 *
 * Public surface:
 *   fetchForgeFacts(input)  — the snapshot fetcher (I/O + mapping)
 *   buildBranchName(...)    — task/<tranche>/<id> helper (exported for callers
 *                              that need the same convention without re-deriving)
 *   mapForgeFacts(raw)      — the pure mapper, exported for tests / advanced use
 *   Types: TaskRef, FetchForgeFactsInput, ForgeFactsSnapshot
 */

export {
  fetchForgeFacts,
  buildBranchName,
  fetchForgeTasksByLabel,
  mapForgeFacts,
  AEG_BLOCKED_LABEL
} from '@atta/aeg-core'
export { resolveRepo } from '@atta/aeg-forge-state'
export type { FetchForgeFactsInput, ForgeFactsSnapshot, TaskRef, RawTaskFacts } from '@atta/aeg-core'
export type { RepoRef } from '@atta/aeg-forge-state'
export { fetchPullRequestBriefs } from './fetch-pull-request-brief'
export { fetchTrancheTokenLedger } from './fetch-token-ledger'
export { loadTrancheSnapshot, loadTrancheProgress } from './load-snapshot'
export type { TrancheSnapshot, TrancheProgress } from './load-snapshot'
export type {
  PullRequestBrief,
  PullRequestBriefSnapshot,
  FetchPullRequestBriefsInput
} from './fetch-pull-request-brief'
export type { FetchTokenLedgerInput, TokenLedgerSnapshot } from './fetch-token-ledger'
