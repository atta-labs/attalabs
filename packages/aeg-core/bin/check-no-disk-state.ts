#!/usr/bin/env bun

/**
 * check-no-disk-state — the regression guard for forge-sole-state task 1.
 * Fails the build if the tracked working tree contains a file that
 * represents AEG work state (see `../src/no-disk-state-gate.ts` for the
 * exact classification rules and the grandfathered-legacy allowlist).
 *
 * Thin CLI/I/O shim, same discipline as `verify-docs.ts`/`verify-coherence.ts`:
 * gathers `git ls-files`, hands it to the pure evaluator, formats the result.
 * No check logic lives here.
 *
 * Usage: bun packages/aeg-core/bin/check-no-disk-state.ts
 * Exit code: 0 = clean, 1 = violation(s) found (printed, one per line).
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { checkNoDiskState } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

function trackedPaths(): string[] {
  return execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

if (import.meta.main) {
  const violations = checkNoDiskState(trackedPaths())

  if (violations.length === 0) {
    console.log('check-no-disk-state: PASS — no file on disk represents AEG work state.')
    process.exit(0)
  }

  console.error(`check-no-disk-state FAILED — ${violations.length} file(s) represent state that must live on GitHub:\n`)
  for (const v of violations) {
    console.error(`  ✗ ${v.path}`)
    console.error(`    ${v.reason}\n`)
  }
  process.exit(1)
}
