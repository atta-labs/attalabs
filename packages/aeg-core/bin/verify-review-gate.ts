#!/usr/bin/env bun

/**
 * verify-review-gate — required pre-merge CI check (aeg-review-gate-v1 task 1,
 * #474). Blocks a task-branch PR from merging unless a code-reviewer
 * `APPROVE` verdict AND a security-review `PASS` verdict both exist on the
 * PR, or an actor-verified `waiver:review` label is present (D-097's exact
 * pattern — `isWaiverLabelActorVerified`, reused not duplicated).
 *
 * Non-task branches (plan PRs, `main` itself) bypass — same
 * `/^task\/([^/]+)\/([^/]+)$/` pattern and exit-0-on-non-match idiom as
 * `verify-coherence.ts --closes-n`'s `checkClosesN` bypass: a plan PR
 * touching only topology files has no code to review, and this is a
 * going-forward gate, never a re-evaluation of already-merged history.
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
import { checkReviewGate, taskRefFromBranch, WAIVER_LABEL_REVIEW } from '../src/index'

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
  if (branch && !taskRefFromBranch(branch)) {
    console.log(`verify-review-gate: branch "${branch}" is not a task branch — bypass (no code to review).`)
    process.exit(0)
  }

  const prNumberStr = process.env.PR_NUMBER
  if (!prNumberStr) {
    console.error('verify-review-gate: PR_NUMBER env var not set — cannot evaluate. Failing closed.')
    process.exit(1)
  }
  main(Number(prNumberStr))
}
