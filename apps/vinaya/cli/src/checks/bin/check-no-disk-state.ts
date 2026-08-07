#!/usr/bin/env bun

/**
 * Core check: no-disk-state. Thin adapter over `@atta/aeg-core`'s
 * `isNewDiskStateFile` — mirrors `packages/aeg-core/bin/check-no-disk-state.ts`'s
 * `git diff --name-status` parsing exactly, emitting the check contract
 * instead of human text.
 *
 * scope: diff — the whole predicate is "does this diff add a new state file."
 */

import { execFileSync } from 'node:child_process'
import { isNewDiskStateFile, type DiskStateFileStatus } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'no-disk-state'

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

/**
 * Renames/copies (`R###`/`C###`, tab-separated old\tnew) are treated as
 * `added` at their NEW path — a brand-new path appearing in the tree is
 * exactly what this gate exists to catch. Deleted files (`D`) are dropped.
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

function main(): void {
  const base = process.env.BASE_SHA || 'origin/main'
  let files = parseNameStatus(git(['diff', '--name-status', `${base}...HEAD`]))
  if (files.length === 0) files = parseNameStatus(git(['diff', '--name-status', 'main...HEAD']))
  if (files.length === 0) process.exit(0)

  const offenders = files.filter((f) => isNewDiskStateFile(f.path, f.status))

  if (offenders.length > 0) {
    for (const f of offenders) {
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'error',
        message: `no-disk-state: ${f.path} (${f.status}) creates new on-disk state that must instead derive from the forge.`,
        agent_recovery_prompt: `Remove ${f.path} from this diff and derive the equivalent fact from the forge instead, then re-run \`vinaya check no-disk-state\`.`,
        file: f.path
      })
    }
    process.exit(1)
  }

  process.exit(0)
}

main()
