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
import { DOC_OWNERS_PATH, evaluateC5, isWaiverLabelActorVerified, WAIVER_LABEL } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'
import { loadTrustAnchorConfig, resolvePrincipalAllowlist } from '../../lib/config'

// No chdir: `DOC_OWNERS_PATH` (`.vinaya/doc-owners`) and the `git diff` below
// must resolve relative to the CALLER's cwd — the repo `vinaya check` is
// meant to evaluate — never a fixed location derived from wherever this
// script physically lives. The runner's spawn() already inherits the
// caller's cwd with no override, so no chdir is needed.
const CHECK_NAME = 'doc-coverage'

// Array-form execFileSync — no shell, so `base` (env-controlled) is passed
// to git as an inert literal argv element, never shell-interpreted.
function git(args: string[]): string {
  try {
    // stdio explicitly piped (not left to default inheritance) — a failing
    // git call (e.g. no `origin/main` in the caller's repo, expected and
    // caught below) must never leak its own stderr onto THIS check's stderr
    // stream, which the runner treats as the versioned CheckError channel;
    // an unswallowed raw git error there reads as "check emitted garbage"
    // (status: 'error'), never a silent pass, even though this function's
    // own contract is "swallow the failure, return ''".
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
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

/** a waiver is honored only when the label is present AND its actor is a configured principal — resolved by CI ahead of this check, never derived here. */
function waiverActiveFromEnv(): boolean {
  const labels = (process.env.PR_LABELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // Short-circuit BEFORE resolving the allowlist. `loadTrustAnchorConfig()`
  // makes a real `gh api` call (~0.5s), and this function is an eagerly
  // evaluated argument to `evaluateC5` below — without this guard every local
  // pre-commit/pre-push paid that latency even though `PR_LABELS` is empty
  // outside CI, so the waiver could never have been active anyway (review
  // finding, PR #862 round 4).
  if (!labels.includes(WAIVER_LABEL)) return false
  // Trust anchor: GitHub-API default-branch read, never BASE_SHA (that env var
  // is for diff-SCOPING only, below) and never the PR's own checkout. See
  // `loadTrustAnchorConfig` in lib/config.ts.
  return isWaiverLabelActorVerified({
    label: WAIVER_LABEL,
    labels,
    labelActor: process.env.WAIVER_LABEL_ACTOR || null,
    principalAllowlist: resolvePrincipalAllowlist(loadTrustAnchorConfig())
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
