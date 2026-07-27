/**
 * Required pre-merge review gate (aeg-review-gate-v1 task 1, #474). Blocks a
 * task-branch PR from merging unless a clean code-reviewer `APPROVE` verdict
 * AND a clean security-review `PASS` verdict both exist on the PR — the same
 * `extractCodeReviewVerdict`/`extractSecurityReviewVerdict` detection
 * (`verdict-extraction.ts`) the post-merge Archivist automation already runs,
 * now gated pre-merge and blocking instead of post-merge and advisory-only.
 *
 * A verified `vinaya/waiver:review` label (D-097's exact actor-verification pattern,
 * `isWaiverLabelActorVerified` reused directly and parameterized by label —
 * see `waiver-label.ts`) lets a principal explicitly skip the requirement for
 * one PR. Label presence alone is never sufficient — only an actor-verified
 * label waives the gate, mirroring D-097 exactly.
 *
 * Pure — no `fs`, no `fetch`, no `process.env`. The CLI shim
 * (`bin/verify-review-gate.ts`) resolves the PR's comments/labels/label-actor
 * via `gh` and calls `checkReviewGate`.
 */

import { isWaiverLabelActorVerified, PRINCIPAL_ALLOWLIST, WAIVER_LABEL_REVIEW } from './waiver-label'
import { extractCodeReviewVerdict, extractSecurityReviewVerdict } from './verdict-extraction'

export type ReviewGateVerdict = 'pass' | 'fail'

export type ReviewGateResult = {
  verdict: ReviewGateVerdict
  reason: string
  waived: boolean
}

export type ReviewGateInput = {
  /** Every comment body on the PR. */
  comments: string[]
  /** Every label currently applied to the PR. */
  labels: string[]
  /** Actor of the most recent `vinaya/waiver:review` labeling timeline event, or `null` when none exists. */
  waiverLabelActor: string | null
}

/**
 * True only for `plan/*` branches — topology/decision-log docs only, ever,
 * by contract (roles/planner.md Step 0): a plan PR has no code to review.
 * Every other branch, INCLUDING `fix/*`, is held to the review gate — `fix/*`
 * carries real code despite not matching `task/<iteration>/<id>`, so reusing
 * `checkClosesN`'s broader "any non-task branch bypasses" idiom here was a
 * gap: a `fix/*` PR could merge with no enforced code-reviewer or
 * security-review verdict. `checkClosesN`'s bypass is correct for itself (it
 * asks "does this PR close a tracked task Issue," which `fix/*` genuinely
 * doesn't) — this function answers a different question ("is there code to
 * review") and must not reuse that bypass.
 */
export function isReviewGateExemptBranch(branch: string): boolean {
  return branch.startsWith('plan/')
}

/**
 * `pass` when either (a) `vinaya/waiver:review` is present and actor-verified against
 * `PRINCIPAL_ALLOWLIST`, or (b) both verdicts are clean — code-reviewer
 * `APPROVE` (not `REQUEST_CHANGES`, not missing, not unclear) and
 * security-review `PASS` (not `FAIL`, not missing, not unclear). `fail`
 * otherwise, naming exactly which verdict(s) are not clean.
 */
export function checkReviewGate(input: ReviewGateInput): ReviewGateResult {
  const waived = isWaiverLabelActorVerified({
    label: WAIVER_LABEL_REVIEW,
    labels: input.labels,
    labelActor: input.waiverLabelActor,
    principalAllowlist: PRINCIPAL_ALLOWLIST
  })
  if (waived) {
    return {
      verdict: 'pass',
      reason: `\`${WAIVER_LABEL_REVIEW}\` label is actor-verified — review requirement waived for this PR.`,
      waived: true
    }
  }

  const codeReview = extractCodeReviewVerdict(input.comments)
  const security = extractSecurityReviewVerdict(input.comments)
  const codeReviewClean = codeReview.value === 'APPROVE'
  const securityClean = security.value === 'PASS'

  if (codeReviewClean && securityClean) {
    return {
      verdict: 'pass',
      reason: 'code-reviewer verdict is a clean APPROVE and security-review verdict is a clean PASS.',
      waived: false
    }
  }

  const problems: string[] = []
  if (!codeReviewClean) problems.push(`code-reviewer verdict is not a clean APPROVE (found: ${codeReview.value})`)
  if (!securityClean) problems.push(`security-review verdict is not a clean PASS (found: ${security.value})`)

  return {
    verdict: 'fail',
    reason: `${problems.join('; ')}. A principal can apply an actor-verified \`${WAIVER_LABEL_REVIEW}\` label to skip this requirement, or post the missing/clean verdict comment(s).`,
    waived: false
  }
}
