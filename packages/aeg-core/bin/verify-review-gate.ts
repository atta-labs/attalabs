#!/usr/bin/env bun

/**
 * verify-review-gate — required pre-merge CI check (aeg-review-gate-v1 task 1,
 * #474). Blocks a task-branch PR from merging unless a code-reviewer
 * `APPROVE` verdict AND a security-review `PASS` verdict both exist on the
 * PR, or an actor-verified `vinaya/waiver:review` label is present (the exact
 * pattern — `isWaiverLabelActorVerified`, reused not duplicated).
 *
 * Only `plan/*` branches bypass (`isReviewGateExemptBranch`) — a plan PR
 * touches only topology docs, never code. Every other branch,
 * INCLUDING `fix/*`, is held to the gate: `fix/*` carries real code despite
 * not matching `task/<tranche>/<id>`, so it must not be waved through the
 * same way a genuinely code-free `plan/*` branch is. This is a going-forward
 * gate, never a re-evaluation of already-merged history.
 *
 * Fail-closed change from the prior bypass logic: a literal `BRANCH=main`
 * used to match the old "any non-task branch" bypass too. It no longer does
 * — `main` isn't `plan/*`, so it now falls through to the real check. Harmless
 * in the one real caller (`forge-lifecycle.yml`'s `pull_request` trigger,
 * where `BRANCH` is always the PR's head ref, never literally `main`), but
 * worth naming explicitly since it IS a behavior change from before.
 *
 * Thin CLI/I/O shim, same discipline as `verify-single-plan-pr.ts`: resolves
 * the PR's comments/labels/waiver-label-actor via `gh`, calls the pure
 * `checkReviewGate` (`@atta/aeg-core`), and exits non-zero with a clear
 * message on failure. No check logic lives here.
 *
 * Usage:
 *   PR_NUMBER=<n> bun packages/aeg-core/bin/verify-review-gate.ts
 *   PR_NUMBER=<n> BRANCH=<head-ref> bun packages/aeg-core/bin/verify-review-gate.ts
 *
 * Exit code: 0 (pass — clean verdicts, a verified waiver, or a non-task-branch
 * bypass) or 1 (fail — the unmet requirement is named in the printed message).
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { checkReviewGate, isReviewGateExemptBranch, WAIVER_LABEL_REVIEW } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

type PrView = {
  number: number
  comments: { body: string }[]
  labels: { name: string }[]
}

function fetchPr(prNumber: number): PrView {
  const out = execSync(`gh pr view ${prNumber} --json number,comments,labels`, { encoding: 'utf8' })
  return JSON.parse(out) as PrView
}

type TimelineLabeledEvent = { event: string; actor?: { login: string } | null; label?: { name: string } | null }

/**
 * Actor of the most recent `labeled` timeline event naming `label`, or `null`
 * when none exists. Uses the REST timeline endpoint via the `{owner}/{repo}`
 * placeholder `gh api` already resolves from the current repo context
 * (same pattern as `archive-task.ts`'s `gh api repos/{owner}/{repo}/commits/...`)
 * — no separate repo-resolution plumbing needed for a CLI invoked from a
 * repo checkout.
 */
function fetchWaiverLabelActor(prNumber: number, label: string): string | null {
  const out = execSync(`gh api repos/{owner}/{repo}/issues/${prNumber}/timeline --paginate`, { encoding: 'utf8' })
  const events = JSON.parse(out) as TimelineLabeledEvent[]
  const matches = events.filter((e) => e.event === 'labeled' && e.label?.name === label)
  const last = matches[matches.length - 1]
  return last?.actor?.login ?? null
}

export function main(prNumber: number): void {
  const pr = fetchPr(prNumber)
  const labels = pr.labels.map((l) => l.name)
  const waiverLabelActor = labels.includes(WAIVER_LABEL_REVIEW)
    ? fetchWaiverLabelActor(prNumber, WAIVER_LABEL_REVIEW)
    : null

  const result = checkReviewGate({
    comments: pr.comments.map((c) => c.body),
    labels,
    waiverLabelActor
  })

  if (result.verdict === 'fail') {
    console.error(`verify-review-gate FAILED (PR #${prNumber}): ${result.reason}`)
    process.exit(1)
  }

  console.log(`verify-review-gate PASS (PR #${prNumber}): ${result.reason}`)
  process.exit(0)
}

if (import.meta.main) {
  const branch = process.env.BRANCH ?? ''
  if (isReviewGateExemptBranch(branch)) {
    console.log(
      `verify-review-gate: branch "${branch}" is a plan branch — bypass (topology docs only, no code to review).`
    )
    process.exit(0)
  }

  const prNumberStr = process.env.PR_NUMBER
  if (!prNumberStr) {
    console.error('verify-review-gate: PR_NUMBER env var not set — cannot evaluate. Failing closed.')
    process.exit(1)
  }
  main(Number(prNumberStr))
}
