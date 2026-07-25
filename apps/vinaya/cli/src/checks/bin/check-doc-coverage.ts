#!/usr/bin/env bun

/**
 * Core check: doc-coverage. Thin adapter over `@atta/aeg-core`'s C5 evaluator
 * (`evaluateC5` + `parseDocOwners`/`readDocAcks`, used internally by
 * `evaluateC5`) — mirrors `packages/aeg-core/bin/verify-docs.ts`'s `runC5`
 * input assembly (changed files vs base, `PR_BODY`/`PR_BODY_FILE`, the
 * `PR_LABELS`/`WAIVER_LABEL_ACTOR` waiver-verification envelope), emitting
 * the check contract instead of human text.
 *
 * scope: diff — the whole point of C5 is "did this diff's code changes touch
 * a bound doc."
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOC_OWNERS_PATH,
  evaluateC5,
  isWaiverLabelActorVerified,
  PRINCIPAL_ALLOWLIST,
  WAIVER_LABEL
} from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

// DOC_OWNERS_PATH is repo-root-relative — chdir so it resolves regardless of
// the invoking process's own cwd (mirrors bin/verify-docs.ts's own pattern).
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
process.chdir(REPO_ROOT)

const CHECK_NAME = 'doc-coverage'

// Array-form execFileSync — no shell, so `base` (env-controlled) is passed
// to git as an inert literal argv element, never shell-interpreted.
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

function resolvePrBody(): string {
  if (process.env.PR_BODY) return process.env.PR_BODY
  if (process.env.PR_BODY_FILE) {
    try {
      return readFileSync(process.env.PR_BODY_FILE, 'utf8')
    } catch {
      return ''
    }
  }
  return ''
}

/** D-097: a waiver is honored only when the label is present AND its actor is a configured principal — resolved by CI ahead of this check, never derived here. */
function waiverActiveFromEnv(): boolean {
  const labels = (process.env.PR_LABELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return isWaiverLabelActorVerified({
    label: WAIVER_LABEL,
    labels,
    labelActor: process.env.WAIVER_LABEL_ACTOR || null,
    principalAllowlist: PRINCIPAL_ALLOWLIST
  })
}

function main(): void {
  const base = process.env.BASE_SHA || 'origin/main'
  let changed = changedFiles(base)
  if (changed.length === 0) changed = changedFiles('main')
  if (changed.length === 0) {
    process.exit(0)
  }

  const content = existsSync(DOC_OWNERS_PATH) ? readFileSync(DOC_OWNERS_PATH, 'utf8') : null
  const result = evaluateC5(changed, content, resolvePrBody(), existsSync, waiverActiveFromEnv())

  if (result.errors.length > 0) {
    for (const message of result.errors) {
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'error',
        message,
        agent_recovery_prompt:
          'Read the doc pointer named in the finding above, apply the change your code edit implies, and commit both ' +
          'files in this PR. If the doc genuinely does not need updating, ask a principal to apply the `vinaya/waiver:docs` ' +
          'label rather than editing around this finding — you cannot self-serve that waiver.'
      })
    }
    process.exit(1)
  }

  process.exit(0)
}

main()
