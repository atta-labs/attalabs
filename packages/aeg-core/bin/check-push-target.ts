#!/usr/bin/env bun

/**
 * check-push-target — thin CLI/I/O shim for the dead-branch push guard
 * (aeg-governance-hardening task 18, #335). One batched forge call:
 * `gh pr list --head <branch> --state all --json number,state --limit 1`,
 * mapped to a `PrStateFact` and handed to the pure evaluator
 * `checkDeadBranchPush` (@atta/aeg-core). No check logic lives here.
 *
 * Fail-open by design: any failure to reach the forge (auth, network, rate
 * limit, malformed JSON) maps to `UNKNOWN`, which the pure evaluator treats
 * as `allow` — a transient forge-reachability issue must never block a push.
 *
 * Usage:
 *   bun packages/aeg-core/bin/check-push-target.ts <branch>
 *
 * Exit code: 0 (allow) or 1 (refuse). Prints the reason on refuse only.
 */

import { execFileSync } from 'node:child_process'
import { checkDeadBranchPush, type PrStateFact } from '../src/index'

type PrListEntry = { number: number; state: 'OPEN' | 'CLOSED' | 'MERGED' }

function fetchPrState(branch: string): { state: PrStateFact; number: number | null } {
  let out: string
  try {
    out = execFileSync(
      'gh',
      ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,state', '--limit', '1'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }
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

if (import.meta.main) {
  const branch = process.argv[2]
  if (!branch) {
    console.error('Usage: check-push-target.ts <branch>')
    process.exit(1)
  }

  const { state, number } = fetchPrState(branch)
  const result = checkDeadBranchPush({ branch, prState: state, prNumber: number })

  if (result.verdict === 'refuse') {
    console.error(result.reason)
  }
  process.exit(result.verdict === 'refuse' ? 1 : 0)
}
