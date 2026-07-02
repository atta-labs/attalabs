#!/usr/bin/env bun

/**
 * open-issue — the ONLY sanctioned way to create or body-edit an Issue in
 * this repo (D-078). The `check-forge-gates.sh` PreToolUse hook denies raw
 * `gh issue create` / `gh issue edit --body*`, directing every agent here.
 *
 * Gate: a task Issue (any `iteration:<slug>` label) must carry the full
 * eight-field Planner's rationale in its body (`checkIssueRationale`,
 * planner-brief contract, D-055) — refused locally otherwise, before anything
 * reaches the forge. Non-task Issues (no iteration label) pass through
 * unvalidated: the rationale contract does not apply to them.
 *
 * Usage:
 *   bun packages/aeg-core/bin/open-issue.ts --title t --body-file <path> --label iteration:x [gh args...]
 *   bun packages/aeg-core/bin/open-issue.ts edit <n> --body-file <path> [gh args...]
 *   bun packages/aeg-core/bin/open-issue.ts --validate-only --body-file <path> --label iteration:x
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkForgeTitle } from '../src/brief-validation'
import { checkIssueRationale, isTaskIssueLabelSet } from '../src/issue-validation'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

function fail(msg: string): never {
  console.error(`\n[open-issue] REFUSED — ${msg}`)
  console.error('[open-issue] Nothing was sent to the forge. Fix the body and retry.')
  process.exit(1)
}

function extractBody(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--body-file' || a === '-F') {
      const p = args[i + 1]
      if (!p) fail('`--body-file` given with no path.')
      return readFileSync(p, 'utf8')
    }
    if (a.startsWith('--body-file=')) return readFileSync(a.slice('--body-file='.length), 'utf8')
    if (a === '--body' || a === '-b') {
      const v = args[i + 1]
      if (v === undefined) fail('`--body` given with no value.')
      return v
    }
    if (a.startsWith('--body=')) return a.slice('--body='.length)
  }
  return null
}

/** Extracts --title/-t value from the passthrough args, if present. */
function extractTitle(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--title' || a === '-t') return args[i + 1] ?? null
    if (a.startsWith('--title=')) return a.slice('--title='.length)
  }
  return null
}

function extractLabels(args: string[]): string[] {
  const labels: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--label' || a === '-l') {
      const v = args[i + 1]
      if (v) labels.push(...v.split(',').map((s) => s.trim()))
    }
    if (a.startsWith('--label='))
      labels.push(
        ...a
          .slice('--label='.length)
          .split(',')
          .map((s) => s.trim())
      )
    if (a.startsWith('--add-label='))
      labels.push(
        ...a
          .slice('--add-label='.length)
          .split(',')
          .map((s) => s.trim())
      )
    if (a === '--add-label') {
      const v = args[i + 1]
      if (v) labels.push(...v.split(',').map((s) => s.trim()))
    }
  }
  return labels
}

export function main(): void {
  const argv = process.argv.slice(2)
  const validateOnly = argv.includes('--validate-only')
  const args = argv.filter((a) => a !== '--validate-only')

  const isEdit = args[0] === 'edit'
  const ghArgs = isEdit ? args.slice(1) : args

  const body = extractBody(isEdit ? ghArgs.slice(1) : ghArgs)
  const labels = extractLabels(isEdit ? ghArgs.slice(1) : ghArgs)

  if (isTaskIssueLabelSet(labels)) {
    const title = extractTitle(isEdit ? ghArgs.slice(1) : ghArgs)
    if (title !== null) {
      const t = checkForgeTitle(title)
      if (t.status === 'fail') fail(t.errors[0] as string)
    }
    if (body === null) {
      fail('a task Issue (iteration:* label) requires a `--body-file <path>` so the rationale gate can validate it.')
    }
    console.log('[open-issue] task Issue (iteration label) — validating the Planner rationale…')
    const { status, errors } = checkIssueRationale(body)
    if (status === 'fail') {
      console.error(`\n[open-issue] FAILED — ${errors.length} rationale field(s) missing:\n`)
      for (const e of errors) console.error(`  ✗ ${e}`)
      fail('the Issue body does not carry the full eight-field Planner rationale (planner-brief contract, D-055).')
    }
    console.log('[open-issue] rationale gate PASS.')
  } else {
    console.log('[open-issue] no iteration label — rationale gate does not apply, passing through.')
  }

  if (validateOnly) {
    console.log('[open-issue] --validate-only: stopping before gh.')
    process.exit(0)
  }

  const ghCmd = isEdit ? ['issue', 'edit', ...ghArgs.slice(0, 1), ...ghArgs.slice(1)] : ['issue', 'create', ...ghArgs]
  const out = execFileSync('gh', ghCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  console.log(out.trim())
}

if (import.meta.main) {
  main()
}
