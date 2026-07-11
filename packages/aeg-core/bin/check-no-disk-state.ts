#!/usr/bin/env bun

/**
 * check-no-disk-state — CI gate (#512) blocking new on-disk state-file
 * creation: a live `aeg-root/iterations/*.md` topology file (other than
 * `README.md`) — the residue class this task's Part B proved unnecessary
 * (`aeg-drift-prevention-v1.md` deleted, forge derivation covers it) — or
 * any new `*.tokens.md` file, anywhere in the repo (D-071: tokens live in
 * the PR body, not a committed ledger). Pure predicate lives in
 * `isNewDiskStateFile` (`@atta/aeg-core`) — this is a thin CLI/I/O shim.
 *
 * Existing files under `aeg-root/iterations/completed/**` are exempt — this
 * gate only stops *new* state-file creation, it does not retroactively
 * flag the deferred archive (packages/governance/decisions.md D-117).
 * Deleted files (this task's own removal of `aeg-drift-prevention-v1.md`)
 * are excluded too — only added/modified files are checked.
 *
 * Usage (CI): bun packages/aeg-core/bin/check-no-disk-state.ts
 * Exit code: 0 (pass / no matching file in the diff) or 1 (a new/edited
 * state file found — named in the message).
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isNewDiskStateFile } from '../src/index'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

if (import.meta.main) {
  const base = process.env.BASE_SHA || 'origin/main'
  let changed = sh(`git diff --name-only ${base}...HEAD`)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  if (changed.length === 0) {
    // Fallback for local runs without an explicit base.
    changed = sh('git diff --name-only main...HEAD')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (changed.length === 0) {
    console.log('check-no-disk-state: no changed files detected against base; nothing to check.')
    process.exit(0)
  }

  // Deleted files still show up in `git diff --name-only` — exclude them,
  // since this gate blocks new/edited state, not a deletion (e.g. this
  // task's own removal of aeg-drift-prevention-v1.md must not trip it).
  const addedOrModified = changed.filter((f) => existsSync(f))
  const offenders = addedOrModified.filter(isNewDiskStateFile)

  if (offenders.length > 0) {
    console.error(
      `check-no-disk-state FAILED: ${offenders.length} file(s) create new on-disk state that must instead derive from the forge:\n` +
        offenders.map((f) => `  - ${f}`).join('\n') +
        '\n\nSee packages/governance/decisions.md D-117 — no live file duplicates forge state.'
    )
    process.exit(1)
  }

  console.log('check-no-disk-state: PASS — no new on-disk state files.')
  process.exit(0)
}
