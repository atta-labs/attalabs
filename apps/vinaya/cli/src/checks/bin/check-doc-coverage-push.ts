#!/usr/bin/env bun

/**
 * Core check: doc-coverage-push. Thin adapter over `@atta/aeg-core`'s C5
 * evaluator (`evaluateC5`) run with PUSH semantics — mirrors
 * `packages/aeg-core/bin/verify-docs.ts --push`'s `runPushMode` exactly:
 * `vinaya/override:docs`/`OVERRIDE_DOCS=1` is honored (via `overrideActive`)
 * BEFORE evaluating C5 at all, and the check NEVER hard-fails — findings
 * are emitted as `severity: 'warning'` and the process always exits 0.
 *
 * Registered as a SEPARATE check from the already-registered `doc-coverage`
 * (Developer's call, per Issue #760 §4), not the same `CheckSpec` reused at
 * a different invocation context, for two reasons:
 *
 *   1. `CheckSpec` carries no field for "which mode" (`ALLOWED_KEYS` in
 *      `tests/checks/no-privileged-api.test.ts` is `name`/`run`/`args`/
 *      `scope`/`include`/`timeoutMs` only — no `env`). The runner spawns
 *      every check identically (`runner.ts`'s own no-privileged-API
 *      invariant); the only way two checks can behave differently is to be
 *      two different executables.
 *   2. `apps/vinaya/cli/src/lib/artifacts.ts` (the `vinaya init` hook/
 *      workflow generator) is out of this task's surface — its generated
 *      pre-push hook body is `npx --no-install @attalabs/vinaya check --all`
 *      unconditionally, with no mode flag or env differentiation between a
 *      push-time and a PR-time invocation. Since `--all` already
 *      unconditionally runs every entry in `coreCheckRegistry()`, adding
 *      THIS check as a new entry makes it reachable from that unmodified
 *      hook body automatically — no `artifacts.ts` edit required. This is
 *      also the first place `OVERRIDE_DOCS` is honored anywhere in this
 *      CLI's check surface — `check-doc-coverage.ts` (the existing,
 *      PR-blocking entry) never calls `overrideActive` at all, a real,
 *      pre-existing gap versus `verify-docs.ts --pr`, left unchanged here
 *      (out of surface — see the PR body's Part 4 note).
 *
 * scope: diff — same as `doc-coverage`, C5 is a diff-vs-doc-owners check.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { DOC_OWNERS_PATH, evaluateC5, isWaiverLabelActorVerified, overrideActive, WAIVER_LABEL } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'
import { loadConfigFromRef, resolvePrincipalAllowlist, TRUST_ANCHOR_REF } from '../../lib/config'

const CHECK_NAME = 'doc-coverage-push'

function git(args: string[]): string {
  try {
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

function waiverActiveFromEnv(): boolean {
  const labels = (process.env.PR_LABELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // TRUST_ANCHOR_REF, never BASE_SHA — see check-doc-coverage.ts's identical
  // comment / lib/config.ts's TRUST_ANCHOR_REF doc comment.
  return isWaiverLabelActorVerified({
    label: WAIVER_LABEL,
    labels,
    labelActor: process.env.WAIVER_LABEL_ACTOR || null,
    principalAllowlist: resolvePrincipalAllowlist(loadConfigFromRef(TRUST_ANCHOR_REF))
  })
}

function main(): void {
  if (
    overrideActive({
      overrideDocsEnv: process.env.OVERRIDE_DOCS,
      prLabels: process.env.PR_LABELS,
      prBody: resolvePrBody()
    })
  ) {
    process.exit(0)
  }

  const base = process.env.BASE_SHA || 'origin/main'
  let changed = changedFiles(base)
  if (changed.length === 0) changed = changedFiles('main')
  if (changed.length === 0) process.exit(0)

  const content = existsSync(DOC_OWNERS_PATH) ? readFileSync(DOC_OWNERS_PATH, 'utf8') : null
  const result = evaluateC5(changed, content, resolvePrBody(), existsSync, waiverActiveFromEnv())

  // Ring 0: warn-with-declared-intent, never a hard block — the push always
  // succeeds; the PR (once opened, `doc-coverage`) is where this actually
  // gates.
  for (const message of result.errors) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'warning',
      message,
      agent_recovery_prompt:
        'This owned-doc binding is unsatisfied — the push proceeds anyway, but the PR stays red until you update the bound doc, add a `Doc-ack:` line, or a principal applies the `vinaya/waiver:docs` label.'
    })
  }

  process.exit(0)
}

main()
