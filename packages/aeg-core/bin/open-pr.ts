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

/** Extracts --body-file/-F or --body/-b from the passthrough args. */
function extractBody(args: string[]): string {
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
  fail('no `--body-file <path>` (or `--body`) argument found — the gate needs the PR body to validate it.')
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

export function main(): void {
  const argv = process.argv.slice(2)
  const validateOnly = argv.includes('--validate-only')
  const args = argv.filter((a) => a !== '--validate-only')

  const isEdit = args[0] === 'edit'
  const ghArgs = isEdit ? args.slice(1) : args

  const branch = process.env.BRANCH || currentBranch()
  const body = extractBody(isEdit ? ghArgs.slice(1) : ghArgs)

  console.log(`[open-pr] validating against branch \`${branch}\`…`)
  runGate('brief-validation', 'packages/aeg-core/bin/verify-brief.ts', [], { BRANCH: branch, PR_BODY: body })
  runGate('verify-docs', 'packages/aeg-core/bin/verify-docs.ts', ['--pr'], { PR_BODY: body })
  if (/^task\//.test(branch)) {
    runGate('Closes #N', 'packages/aeg-core/bin/verify-coherence.ts', ['--closes-n'], {
      BRANCH: branch,
      PR_BODY: body
    })
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
