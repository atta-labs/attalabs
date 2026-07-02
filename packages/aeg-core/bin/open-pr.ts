#!/usr/bin/env bun

/**
 * open-pr — the ONLY sanctioned way to open or body-edit a PR in this repo
 * (D-078). The `check-forge-gates.sh` PreToolUse hook denies raw
 * `gh pr create` / `gh pr edit --body*`, directing every agent here. This
 * wrapper runs the full deterministic contract gate LOCALLY, before anything
 * reaches the forge — prevention, not detection. A malformed PR body is
 * refused at the tool layer; the agent fixes it in-session and retries. CI
 * runs the identical checks (same aeg-core code) purely as a backstop.
 *
 * Usage:
 *   bun packages/aeg-core/bin/open-pr.ts --body-file <path> [gh pr create args...]
 *   bun packages/aeg-core/bin/open-pr.ts edit <n> --body-file <path> [gh pr edit args...]
 *   bun packages/aeg-core/bin/open-pr.ts --validate-only --body-file <path>
 *
 * Gates (all must pass, in order):
 *   1. verify-brief   — brief-section grammar vs the current branch (task
 *                       branches: full contract; plan branches: no-Closes
 *                       guard; other branches: bypass).
 *   2. verify-docs    — tier-appropriate documentation gate (--pr mode).
 *   3. closes-n       — task branches only: the branch must resolve to a real
 *                       topology row and the body's Closes #N must name that
 *                       row's Issue (D-073/D-069).
 */

import { execFileSync, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkForgeTitle } from '../src/brief-validation'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

function fail(msg: string): never {
  console.error(`\n[open-pr] REFUSED — ${msg}`)
  console.error('[open-pr] Nothing was sent to the forge. Fix the body and retry.')
  process.exit(1)
}

function currentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
}

/** Extracts --body-file/-F or --body/-b from the passthrough args; null when absent. */
function extractBodyOrNull(args: string[]): string | null {
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

function runGate(label: string, script: string, scriptArgs: string[], env: Record<string, string>): void {
  try {
    execFileSync('bun', [script, ...scriptArgs], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'inherit', 'inherit']
    })
  } catch {
    fail(`the ${label} gate failed (output above).`)
  }
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

/**
 * D-number staleness gate (D-078): every `## D-NNN` heading this branch ADDS
 * to a decision log must be strictly greater than the highest number already
 * on origin/main in that log. Catches the parallel-dispatch collision class
 * live twice tonight (two PRs both claiming D-075; a brief pre-writing D-074
 * after it was taken) — locally, before the PR exists, instead of at CI's N1.
 */
function checkDecisionNumbersFresh(): void {
  const changed = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => /(^|\/)decisions\.md$|-decisions\.md$/.test(f))
  for (const file of changed) {
    let baseline = ''
    try {
      baseline = execSync(`git show origin/main:${file}`, { encoding: 'utf8' })
    } catch {
      // new file on this branch — no baseline, nothing to collide with
    }
    const maxBase = Math.max(0, ...[...baseline.matchAll(/^## D-(\d+)/gm)].map((m) => Number(m[1])))
    const diff = execSync(`git diff origin/main...HEAD -- ${file}`, { encoding: 'utf8' })
    const added = [...diff.matchAll(/^\+## D-(\d+)/gm)].map((m) => Number(m[1]))
    for (const n of added) {
      if (n <= maxBase) {
        fail(
          `decision-number gate: this branch adds D-${String(n).padStart(3, '0')} to ${file}, but origin/main already has entries up to D-${String(maxBase).padStart(3, '0')} — the number is stale or colliding. Fetch origin/main, renumber to the next free D-number, and retry (D-078).`
        )
      }
    }
  }
}

export function main(): void {
  const argv = process.argv.slice(2)
  const validateOnly = argv.includes('--validate-only')
  const args = argv.filter((a) => a !== '--validate-only')

  const isEdit = args[0] === 'edit'
  const ghArgs = isEdit ? args.slice(1) : args

  const branch = process.env.BRANCH || currentBranch()
  const body = extractBodyOrNull(isEdit ? ghArgs.slice(1) : ghArgs)
  const title = extractTitle(isEdit ? ghArgs.slice(1) : ghArgs)

  if (body === null && !isEdit) {
    fail('no `--body-file <path>` (or `--body`) argument found — the gate needs the PR body to validate it.')
  }
  if (body === null && title === null) {
    fail('edit mode with neither `--body-file`/`--body` nor `--title` — nothing to validate or change.')
  }

  if (title !== null) {
    const t = checkForgeTitle(title)
    if (t.status === 'fail') fail(t.errors[0] as string)
  }

  console.log(`[open-pr] validating against branch \`${branch}\`…`)
  checkDecisionNumbersFresh()
  if (body !== null) {
    runGate('brief-validation', 'packages/aeg-core/bin/verify-brief.ts', [], { BRANCH: branch, PR_BODY: body })
    runGate('verify-docs', 'packages/aeg-core/bin/verify-docs.ts', ['--pr'], { PR_BODY: body })
    if (/^task\//.test(branch)) {
      runGate('Closes #N', 'packages/aeg-core/bin/verify-coherence.ts', ['--closes-n'], {
        BRANCH: branch,
        PR_BODY: body
      })
    }
  } else {
    console.log('[open-pr] title-only edit — body gates skipped (title grammar validated above).')
  }

  console.log('[open-pr] all contract gates PASS.')
  if (validateOnly) {
    console.log('[open-pr] --validate-only: stopping before gh.')
    process.exit(0)
  }

  const ghCmd = isEdit ? ['pr', 'edit', ...ghArgs.slice(0, 1), ...ghArgs.slice(1)] : ['pr', 'create', ...ghArgs]
  const out = execFileSync('gh', ghCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  console.log(out.trim())
}

if (import.meta.main) {
  main()
}
