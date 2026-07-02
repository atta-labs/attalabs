#!/usr/bin/env bun

/**
 * verify-brief — real, CI-enforced check that a PR-body brief carries every
 * required section (D-069, aeg-governance-hardening task 2). Replaces the
 * `brief-validation` stub in `.github/workflows/archivist.yml`.
 *
 * Thin CLI/Action shim: reads `PR_BODY` from env, derives whether the diff
 * touches a `Lock: YES` decision, and calls the pure `checkBriefSections`
 * homed in `@atta/aeg-core`. The grammar itself — including exact wording —
 * lives in `src/brief-validation.ts`, not here. Follows `bin/verify-docs.ts`'s
 * exact shape (chdir to repo root; read env; call pure function; print
 * failures; exit).
 *
 * Lock-touch derivation: scans `git diff <base>...HEAD` for changed decision-log
 * files (`isDecisionLog`) and checks whether the diff adds a `Lock: YES` line to
 * any of them. Chosen over a manual `TOUCHES_LOCK` env var because it can't be
 * forgotten by whoever wires the CI step — the signal is derived from the diff
 * itself, the same way `verify-docs.ts` derives tier from the diff when no
 * `Tier:` field is present.
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { checkBriefSections, isDecisionLog, readTierFromPrBody } from '../src/index'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function changedFiles(base: string): string[] {
  return sh(`git diff --name-only ${base}...HEAD`)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function diffAddsLockYes(base: string, file: string): boolean {
  const diff = sh(`git diff ${base}...HEAD -- ${file}`)
  return diff.split('\n').some((line) => line.startsWith('+') && !line.startsWith('+++') && /Lock:\s*YES/.test(line))
}

export function deriveTouchesLock(base: string): boolean {
  let changed = changedFiles(base)
  if (changed.length === 0) changed = changedFiles('main')
  const decisionLogs = changed.filter(isDecisionLog)
  return decisionLogs.some((f) => diffAddsLockYes(base, f))
}

export function main(): void {
  const prBody = process.env.PR_BODY ?? ''

  if (!prBody) {
    console.log('[verify-brief] PR_BODY env var is empty; nothing to check.')
    console.log('[verify-brief] PASS (no body — likely a local invocation; CI sets PR_BODY automatically).')
    process.exit(0)
  }

  const base = process.env.BASE_SHA || 'origin/main'
  const touchesLock = deriveTouchesLock(base)

  const { errors } = checkBriefSections(prBody, touchesLock, readTierFromPrBody)

  if (touchesLock) console.log('[verify-brief] diff touches a Lock: YES decision — lock-ack is required.')

  if (errors.length > 0) {
    console.error(`\n[verify-brief] FAILED — ${errors.length} section(s) malformed or missing:\n`)
    for (const e of errors) console.error(`  ✗ ${e}`)
    console.error('\n[verify-brief] Fix the PR body brief and push again.')
    process.exit(1)
  }

  console.log('[verify-brief] All required brief sections present.')
  console.log('[verify-brief] PASS.')
  process.exit(0)
}

if (import.meta.main) {
  main()
}
