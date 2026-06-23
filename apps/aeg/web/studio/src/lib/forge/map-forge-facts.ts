/**
 * Pure mapper: GitHub raw responses → `ForgeFacts`. No I/O. Isolated from the
 * I/O layer so the derivation is exhaustively testable with fixtures.
 *
 * Field-by-field correspondence to `ForgeFacts` (defined in @atta/aeg-core):
 *
 *   issueState     ← issue.state lowercased ('OPEN' | 'CLOSED' → 'open' | 'closed')
 *   assigned       ← issue.assigneesCount > 0
 *   blockedLabel   ← `aeg:blocked` present in issue.labels
 *                    (Issue-scoped per state-machine.md §14)
 *   branchExists   ← refExists for `refs/heads/task/<iteration>/<id>`
 *   prState        ← pullRequest.state lowercased; `'closed'` (PR closed without
 *                    merge) collapses to `'none'` since AEG only models open /
 *                    merged / none in `ForgeFacts`.
 *   reviewDecision ← 'APPROVED' → 'approved'
 *                    'CHANGES_REQUESTED' → 'changes_requested'
 *                    'REVIEW_REQUIRED' / null → 'none'
 *                    (Only `'changes_requested'` flips status per types.ts.)
 *
 * Missing issue → return `null` (caller omits the task from the map, which
 * `deriveIteration` treats as `todo` — iteration tasks are minimum `todo` per D-059).
 */

import type { ForgeFacts, RawTaskFacts } from './types'

export const AEG_BLOCKED_LABEL = 'aeg:blocked'

export function mapForgeFacts(raw: RawTaskFacts): ForgeFacts | null {
  if (!raw.issue) return null

  return {
    issueState: raw.issue.state === 'OPEN' ? 'open' : 'closed',
    assigned: raw.issue.assigneesCount > 0,
    blockedLabel: raw.issue.labels.includes(AEG_BLOCKED_LABEL),
    branchExists: raw.refExists,
    prState: mapPrState(raw.pullRequest?.state),
    reviewDecision: mapReviewDecision(raw.pullRequest?.reviewDecision)
  }
}

function mapPrState(state: 'OPEN' | 'CLOSED' | 'MERGED' | undefined): ForgeFacts['prState'] {
  if (state === 'OPEN') return 'open'
  if (state === 'MERGED') return 'merged'
  // 'CLOSED' (without merge) and undefined both collapse to 'none' — AEG does
  // not model closed-without-merge separately; deriveIteration treats either
  // as "no PR" for status purposes, falling through to branch / issue facts.
  return 'none'
}

function mapReviewDecision(
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null | undefined
): ForgeFacts['reviewDecision'] {
  if (decision === 'APPROVED') return 'approved'
  if (decision === 'CHANGES_REQUESTED') return 'changes_requested'
  // 'REVIEW_REQUIRED', null, undefined all map to 'none' — same effective
  // meaning for AEG (in-review, not flipped to changes-requested).
  return 'none'
}
