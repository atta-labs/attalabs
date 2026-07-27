/**
 * Pure mapper: GitHub raw responses → `ForgeFacts`. No I/O. Isolated from the
 * I/O layer so the derivation is exhaustively testable with fixtures.
 *
 * Field-by-field correspondence to `ForgeFacts` (defined in `@atta/aeg-types`):
 *
 *   issueState     ← issue.state lowercased ('OPEN' | 'CLOSED' → 'open' | 'closed')
 *   assigned       ← issue.assigneesCount > 0
 *   blockedLabel   ← `vinaya/blocked` present in issue.labels
 *                    (Issue-scoped per state-machine.md §14)
 *   branchExists   ← refExists for `refs/heads/task/<tranche>/<id>`
 *   prState        ← pullRequest.state lowercased; `'closed'` (PR closed without
 *                    merge) collapses to `'none'` since AEG only models open /
 *                    merged / none in `ForgeFacts`.
 *   reviewDecision ← 'APPROVED' → 'approved'
 *                    'CHANGES_REQUESTED' → 'changes_requested'
 *                    'REVIEW_REQUIRED' / null → 'none'
 *                    (Only `'changes_requested'` flips status per aeg-types.)
 *   stateReason    ← issue.stateReason: 'COMPLETED' → 'completed',
 *                    'NOT_PLANNED' → 'not_planned', 'REOPENED' / null → null.
 *                    Drives honest terminal derivation: a closed-no-
 *                    merge issue derives `dropped` (not_planned) or
 *                    `incoherent` (completed / null), never `todo`.
 *
 * Missing issue → return `null` (caller omits the task from the map, which
 * `deriveTranche` treats as `todo` — tranche tasks are minimum `todo`).
 */

import type { ForgeFacts, RawTaskFacts } from '@atta/aeg-types'
import { AEG_BLOCKED_LABEL, hasLabel } from './labels'

// The constant's home is now `labels.ts` (the code-owned label vocabulary,
// re-exported here because this module is its original import path
// and several call sites, including this package's own tests, still reach for
// it at `./map-forge-facts`. Re-export rather than move-and-break: same value,
// same export surface, no consumer edit.
export { AEG_BLOCKED_LABEL }

export function mapForgeFacts(raw: RawTaskFacts): ForgeFacts | null {
  if (!raw.issue) return null

  return {
    issueState: raw.issue.state === 'OPEN' ? 'open' : 'closed',
    assigned: raw.issue.assigneesCount > 0,
    blockedLabel: hasLabel('blocked', raw.issue.labels),
    branchExists: raw.refExists,
    prState: mapPrState(raw.pullRequest?.state),
    reviewDecision: mapReviewDecision(raw.pullRequest?.reviewDecision),
    stateReason: mapStateReason(raw.issue.stateReason),
    closedAt: raw.issue.closedAt ?? null,
    mergedAt: raw.pullRequest?.mergedAt ?? null
  }
}

function mapStateReason(reason: 'COMPLETED' | 'NOT_PLANNED' | 'REOPENED' | null): ForgeFacts['stateReason'] {
  if (reason === 'COMPLETED') return 'completed'
  if (reason === 'NOT_PLANNED') return 'not_planned'
  // 'REOPENED' and null map to null — no terminal close reason recorded.
  // A closed-no-merge issue with null stateReason derives `incoherent`.
  return null
}

function mapPrState(state: 'OPEN' | 'CLOSED' | 'MERGED' | undefined): ForgeFacts['prState'] {
  if (state === 'OPEN') return 'open'
  if (state === 'MERGED') return 'merged'
  // 'CLOSED' (without merge) and undefined both collapse to 'none' — AEG does
  // not model closed-without-merge separately; deriveTranche treats either
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
