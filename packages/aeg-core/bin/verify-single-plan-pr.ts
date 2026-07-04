#!/usr/bin/env bun

/**
 * verify-single-plan-pr — ring-1 CI backstop for the single-plan-PR guard
 * (aeg-governance-hardening task 24, #364, Part 1). `open-pr.ts`'s
 * `checkSinglePlanPrGate` is ring-0 prevention, but it only runs for PRs
 * opened through that wrapper — a PR opened directly via the GitHub web UI
 * bypasses it entirely. This script re-runs the IDENTICAL predicate
 * (`checkSinglePlanPr`, `@atta/aeg-core`) forge-side, in CI, on every PR —
 * one implementation per fact (§11 constraint), never a second copy.
 *
 * No-ops (exit 0) for any PR whose diff doesn't touch an iteration topology
 * file — an ordinary task-branch PR never touches `aeg-root/iterations/*.md`,
 * so this never fires for one (asserted in `verify-single-plan-pr.test.ts`).
 *
 * Usage (CI): PR_NUMBER=<n> bun packages/aeg-core/bin/verify-single-plan-pr.ts
 *
 * Exit code: 0 (pass / not a plan-PR diff) or 1 (another open PR already
 * touches the same iteration's topology file).
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { checkSinglePlanPr, touchesAnyTopology } from '../src/index'
import type { OpenPrFiles } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

function fetchPrFiles(prNumber: number): string[] {
  const out = execSync(`gh pr view ${prNumber} --json files`, { encoding: 'utf8' })
  const parsed: { files: Array<{ path: string }> } = JSON.parse(out)
  return parsed.files.map((f) => f.path)
}

function fetchOtherOpenPrFiles(excludePrNumber: number): OpenPrFiles[] {
  const out = execSync('gh pr list --state open --json number,files', { encoding: 'utf8' })
  const all: Array<{ number: number; files: Array<{ path: string }> }> = JSON.parse(out)
  return all
    .filter((pr) => pr.number !== excludePrNumber)
    .map((pr) => ({ number: pr.number, files: pr.files.map((f) => f.path) }))
}

if (import.meta.main) {
  const prNumberStr = process.env.PR_NUMBER
  if (!prNumberStr) {
    console.error('verify-single-plan-pr: PR_NUMBER env var not set — cannot evaluate. Failing closed.')
    process.exit(1)
  }
  const prNumber = Number(prNumberStr)

  const branchFiles = fetchPrFiles(prNumber)
  if (!touchesAnyTopology(branchFiles)) {
    console.log('verify-single-plan-pr: PR touches no iteration topology file — not a plan PR, skipping.')
    process.exit(0)
  }

  const otherOpenPrs = fetchOtherOpenPrFiles(prNumber)
  const result = checkSinglePlanPr(branchFiles, otherOpenPrs)
  if (!result.ok) {
    console.error(`verify-single-plan-pr FAILED: ${result.message}`)
    process.exit(1)
  }
  console.log('verify-single-plan-pr: PASS.')
  process.exit(0)
}
