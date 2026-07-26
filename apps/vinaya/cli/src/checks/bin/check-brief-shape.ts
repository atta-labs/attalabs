#!/usr/bin/env bun

/**
 * Core check: brief-shape. Thin adapter over `@atta/aeg-core`'s
 * `checkBriefSections` — mirrors `packages/aeg-core/bin/verify-brief.ts`'s
 * input assembly (PR_BODY env, lock-touch derived from the diff via
 * tier via `readTierFromPrBody`), but emits the check
 * contract (JSON lines on stderr, exit 0/1) instead of human text — the
 * reason this is a new executable rather than a wrapper around `bin/*`
 * (`packages/aeg-core/bin/*` is out of this task's boundary to edit).
 *
 * scope: diff — reads only the PR body + the diff, never the whole repo.
 */

import { execFileSync } from 'node:child_process'
import { checkBriefSections, readTierFromPrBody } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'brief-shape'

// Array-form execFileSync — no shell, so a filename/ref containing shell
// metacharacters (backticks, `;`, `$()`) is passed to git as an inert
// literal argv element, never interpreted. Security review finding
// (command injection): a shell-string-interpolated `sh(cmd: string)` here
// would let an attacker-chosen filename in the PR's own diff execute
// arbitrary commands once this check runs in CI.
function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function changedFiles(base: string): string[] {
  return git(['diff', '--name-only', `${base}...HEAD`])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function main(): void {
  const prBody = process.env.PR_BODY ?? ''
  if (!prBody) {
    // No PR body to check (local dev outside a CI/PR context) — nothing to do.
    process.exit(0)
  }

  const base = process.env.BASE_SHA || 'origin/main'
  let changed = changedFiles(base)
  if (changed.length === 0) changed = changedFiles('main')
  const { errors } = checkBriefSections(prBody, readTierFromPrBody)

  if (errors.length > 0) {
    for (const message of errors) {
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'error',
        message,
        agent_recovery_prompt:
          'Open the PR body and add or fix the section named above, following the canonical PR-body template ' +
          '(`aeg-root/roles/developer.md` § PR body — canonical form / `aeg-root/templates/pr-report-template.md`). ' +
          'Commit the corrected PR body, then re-run `vinaya check brief-shape`.'
      })
    }
    process.exit(1)
  }

  process.exit(0)
}

main()
