#!/usr/bin/env bun

/**
 * Core check: dead-branch-push. Thin adapter over `@atta/aeg-core`'s
 * `checkDeadBranchPush` — mirrors `packages/aeg-core/bin/check-push-target.ts`'s
 * one batched `gh pr list --head <branch>` call exactly, emitting the check
 * contract instead of human text.
 *
 * Fail-open by design (same as the reference script): any failure to reach
 * the forge maps to `UNKNOWN`, which the pure evaluator treats as `allow` —
 * a transient forge-reachability issue must never block a push.
 *
 * scope: full — a property of the branch's PR history, not the local diff.
 */

import { execFileSync } from 'node:child_process'
import { checkDeadBranchPush, type PrStateFact } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'dead-branch-push'

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

type PrListEntry = { number: number; state: 'OPEN' | 'CLOSED' | 'MERGED' }

function fetchPrState(branch: string): { state: PrStateFact; number: number | null } {
  let out: string
  try {
    out = execFileSync(
      'gh',
      ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,state', '--limit', '1'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    )
  } catch {
    return { state: 'UNKNOWN', number: null }
  }

  let entries: PrListEntry[]
  try {
    entries = JSON.parse(out) as PrListEntry[]
  } catch {
    return { state: 'UNKNOWN', number: null }
  }

  const entry = entries[0]
  if (!entry) return { state: 'NONE', number: null }
  return { state: entry.state, number: entry.number }
}

function main(): void {
  const branch = process.env.BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const { state, number } = fetchPrState(branch)
  const result = checkDeadBranchPush({ branch, prState: state, prNumber: number })

  if (result.verdict === 'refuse') {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: result.reason,
      agent_recovery_prompt:
        'Push to a fresh task branch instead of this already-resolved one, then re-run `vinaya check dead-branch-push`.'
    })
    process.exit(1)
  }

  process.exit(0)
}

main()
