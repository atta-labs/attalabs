#!/usr/bin/env bun

/**
 * check-no-disk-state — CI gate (#512) blocking new on-disk state-file
 * creation: a live `aeg-root/iterations/*.md` topology file (other than
 * `README.md`, at any depth including `completed/**` when newly added) —
 * the residue class this task's Part B proved unnecessary
 * (`aeg-drift-prevention-v1.md` deleted, forge derivation covers it) — or
 * any newly-added `*.tokens.md` file, anywhere in the repo (tokens
 * live in the PR body, not a committed ledger). Pure predicate lives in
 * `isNewDiskStateFile` (`@atta/aeg-core`) — this is a thin CLI/I/O shim.
 *
 * Status-aware (`git diff --name-status`), not path-shape-only: editing an
 * EXISTING file under `aeg-root/iterations/completed/**` (the 15 legacy
 * archive files) stays legal — only genuinely NEW files there are
 * refused, closing the gap a path-shape-only exemption would leave open (a
 * brand-new file smuggled into `completed/` to dodge the top-level check).
 * A top-level active topology file (directly under `aeg-root/iterations/`,
 * not a subdirectory) fails on add OR edit — that class shouldn't exist at
 * all post-cutover. Deleted files are never checked (this task's own
 * removal of `aeg-drift-prevention-v1.md` must not trip it).
 *
 * Usage (CI): bun packages/aeg-core/bin/check-no-disk-state.ts
 * Exit code: 0 (pass / no matching file in the diff) or 1 (a new/edited
 * state file found — named in the message).
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { type DiskStateFileStatus, isNewDiskStateFile } from '../src/index'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/**
 * Parses `git diff --name-status` output into `{ path, status }` pairs.
 * Deleted files (`D`) are dropped — this gate never fires on a deletion.
 * Renames/copies (`R###`/`C###`, tab-separated old\tnew) are treated as
 * `added` at their NEW path — a brand-new path appearing in the tree is
 * exactly what this gate exists to catch, regardless of git's rename
 * heuristic having matched it to some old path's content.
 */
function parseNameStatus(raw: string): Array<{ path: string; status: DiskStateFileStatus }> {
  const out: Array<{ path: string; status: DiskStateFileStatus }> = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const cols = line.split('\t')
    const code = cols[0] ?? ''
    if (code.startsWith('D')) continue
    if (code.startsWith('R') || code.startsWith('C')) {
      const newPath = cols[2]
      if (newPath) out.push({ path: newPath, status: 'added' })
      continue
    }
    const path = cols[1]
    if (!path) continue
    out.push({ path, status: code === 'A' ? 'added' : 'modified' })
  }
  return out
}

if (import.meta.main) {
  const base = process.env.BASE_SHA || 'origin/main'
  let files = parseNameStatus(sh(`git diff --name-status ${base}...HEAD`))

  if (files.length === 0) {
    // Fallback for local runs without an explicit base.
    files = parseNameStatus(sh('git diff --name-status main...HEAD'))
  }

  if (files.length === 0) {
    console.log('check-no-disk-state: no changed files detected against base; nothing to check.')
    process.exit(0)
  }

  const offenders = files.filter((f) => isNewDiskStateFile(f.path, f.status))

  if (offenders.length > 0) {
    console.error(
      `check-no-disk-state FAILED: ${offenders.length} file(s) create new on-disk state that must instead derive from the forge:\n` +
        offenders.map((f) => `  - ${f.path} (${f.status})`).join('\n') +
        '\n\nSee docs/decisions-legacy.md no live file duplicates forge state.'
    )
    process.exit(1)
  }

  console.log('check-no-disk-state: PASS — no new on-disk state files.')
  process.exit(0)
}
