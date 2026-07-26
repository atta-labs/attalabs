#!/usr/bin/env bun

/**
 * open-pr — the ONLY sanctioned way to open or body-edit a PR in this repo
 *. The `check-forge-gates.sh` PreToolUse hook denies raw
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
 * Gate-set selection is per-path: on `create`, the branch being opened comes
 * from the local checkout (`BRANCH` env or `git rev-parse`), which IS the
 * truthful source there. On `edit <n>`, the target PR's ACTUAL head branch is
 * fetched from the forge (`gh pr view <n> --json headRefName`) — the local
 * checkout/env says nothing about PR #n, and deriving gates from it let task-PR
 * body edits from a `main` checkout silently skip `closes-n`/`verify-task`
 * (#417, bundled finding). A failed forge fetch is a hard refusal, never a
 * fallback to the local branch.
 *
 * Gates (all must pass, in order):
 *   0b. single-plan-pr — plan branches only: refuses a diff that touches an
 *                       iteration's topology file when another OPEN PR's
 *                       diff already touches that SAME iteration's topology
 * file ( task 19 / #336). Ordinary task-branch
 *                       PRs touch no topology file, so this passes trivially.
 *   1. verify-brief   — brief-section grammar vs the current branch (task
 *                       branches: full contract; plan branches: no-Closes
 *                       guard; other branches: bypass).
 *   2. verify-docs    — tier-appropriate documentation gate (--pr mode).
 *   3. closes-n       — task branches only: the branch must resolve to a real
 *                       topology row and the body's Closes #N must name that
 * row's Issue ().
 *   4. verify-task    — task branches only (aeg-governance-hardening task 25,
 *                       #365): the Developer's full exit composite
 *                       (typecheck/lint/test/build/verify-docs --pr/premise
 *                       checks — `bin/verify-task.ts`, unchanged, invoked
 *                       wholesale). `verify-docs --pr` therefore runs twice
 *                       on a task-branch PR-open (once at gate 2, once
 *                       inside this composite) — a deliberate, measured
 *                       overlap (~4s at gate 4, warm turbo cache) accepted
 *                       over building a members-only variant that would
 *                       duplicate verify-task.ts's own step list. Non-task
 *                       branches never run this gate — zero added latency.
 */

import { execFileSync, execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkForgeTitle } from '../src/brief-validation'
import { checkSinglePlanPr, iterationSlugFromTopologyPath, type OpenPrFiles } from '../src/single-plan-pr'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

function fail(msg: string): never {
  console.error(`\n[open-pr] REFUSED — ${msg}`)
  console.error('[open-pr] Nothing was sent to the forge. Fix the body and retry.')
  process.exit(1)
}

function currentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
}

/**
 * Fetches the target PR's real head branch from the forge. Edit invocations
 * can run from any checkout (a Principal session on `main`, most commonly),
 * so the local branch/`BRANCH` env says nothing about which gate set applies
 * to the PR being edited — the forge is the only truthful source (#417,
 * bundled finding). Fails loud/closed: a failed fetch is never silently
 * replaced with `currentBranch()`, which would reopen the exact gate bypass
 * this function exists to close.
 */
function fetchPrHeadBranch(prRef: string): string {
  let out: string
  try {
    out = execFileSync('gh', ['pr', 'view', prRef, '--json', 'headRefName'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch {
    fail(
      `could not fetch PR ${prRef}'s head branch from the forge (\`gh pr view\`) — the contract gates cannot decide which gate set applies. Check gh auth/network and retry; refusing to fall back to the local checkout's branch.`
    )
  }
  try {
    const parsed = JSON.parse(out) as { headRefName: string }
    if (!parsed.headRefName) throw new Error('empty headRefName')
    return parsed.headRefName
  } catch {
    fail(
      `could not parse \`gh pr view ${prRef} --json headRefName\` output — refusing to fall back to the local checkout's branch.`
    )
  }
}

/** Where a validated body's bytes came from — a file/stream path, or an inline arg value. */
export type BodySource = { kind: 'file'; argIndex: number; inlineForm: boolean } | { kind: 'inline' }

export interface BodyResult {
  body: string
  source: BodySource
}

/**
 * Reads the body exactly once and records where it came from. `argIndex` +
 * `inlineForm` let `resolveShippableArgs` find and replace the same slot
 * later — the read here and the value shipped to `gh` must be the same
 * buffered string, not two independent reads of the same path.
 */
export function locateBody(args: string[]): BodyResult | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--body-file' || a === '-F') {
      const p = args[i + 1]
      if (!p) fail('`--body-file` given with no path.')
      return { body: readFileSync(p, 'utf8'), source: { kind: 'file', argIndex: i + 1, inlineForm: false } }
    }
    if (a.startsWith('--body-file=')) {
      const p = a.slice('--body-file='.length)
      return { body: readFileSync(p, 'utf8'), source: { kind: 'file', argIndex: i, inlineForm: true } }
    }
    if (a === '--body' || a === '-b') {
      const v = args[i + 1]
      if (v === undefined) fail('`--body` given with no value.')
      return { body: v, source: { kind: 'inline' } }
    }
    if (a.startsWith('--body=')) return { body: a.slice('--body='.length), source: { kind: 'inline' } }
  }
  return null
}

/**
 * Materializes an already-buffered body into a fresh temp file and rewrites
 * the `--body-file`/`-F` slot to point at it, so `gh`'s own read sees the
 * SAME bytes this process validated — never a second read of the original
 * path (which is empty for a stream by the time `gh` opens it). Inline
 * `--body`/`-b` args are untouched: no file, no second read, no risk.
 */
export function resolveShippableArgs(
  args: string[],
  bodyResult: BodyResult | null
): { finalArgs: string[]; cleanup: () => void } {
  if (bodyResult?.source.kind !== 'file') {
    return { finalArgs: args, cleanup: () => {} }
  }
  const dir = mkdtempSync(join(tmpdir(), 'aeg-open-pr-body-'))
  const tempPath = join(dir, 'body.md')
  writeFileSync(tempPath, bodyResult.body, 'utf8')
  const finalArgs = [...args]
  const { argIndex, inlineForm } = bodyResult.source
  finalArgs[argIndex] = inlineForm ? `--body-file=${tempPath}` : tempPath
  return { finalArgs, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function currentBranchTouchedFiles(): string[] {
  return execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
}

function fetchOtherOpenPrFiles(excludePrNumber: number | null): OpenPrFiles[] {
  const out = execSync('gh pr list --state open --json number,files', { encoding: 'utf8' })
  const all: Array<{ number: number; files: Array<{ path: string }> }> = JSON.parse(out)
  return all
    .filter((pr) => pr.number !== excludePrNumber)
    .map((pr) => ({ number: pr.number, files: pr.files.map((f) => f.path) }))
}

/** Wires the pure `checkSinglePlanPr` check to live `git`/`gh` state. Skips the `gh` call entirely for ordinary task PRs (no topology file touched). */
function checkSinglePlanPrGate(editPrNumber: number | null): void {
  const branchFiles = currentBranchTouchedFiles()
  const touchesTopology = branchFiles.some((f) => iterationSlugFromTopologyPath(f) !== null)
  if (!touchesTopology) return

  let otherPrs: OpenPrFiles[]
  try {
    otherPrs = fetchOtherOpenPrFiles(editPrNumber)
  } catch {
    fail('single-plan-pr gate: could not query open PRs via `gh pr list` — check gh auth and retry.')
  }
  const result = checkSinglePlanPr(branchFiles, otherPrs)
  if (!result.ok) fail(result.message as string)
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

export type GateStep = 'verify-brief' | 'verify-docs' | 'closes-n' | 'verify-task'

/**
 * Pure gate-selection plan (aeg-governance-hardening task 25, #365) — decides
 * WHICH gates run for a given branch, so the non-task-branch gate set stays
 * byte-identical and is independently fixture-tested without mocking `gh`/
 * `bun` subprocess calls. `main()` below is the only thing that turns this
 * plan into actual `runGate` invocations.
 */
export function gatePlanForBranch(branch: string): GateStep[] {
  const plan: GateStep[] = ['verify-brief', 'verify-docs']
  if (/^task\//.test(branch)) plan.push('closes-n', 'verify-task')
  return plan
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

export function main(): void {
  const argv = process.argv.slice(2)
  const validateOnly = argv.includes('--validate-only')
  const args = argv.filter((a) => a !== '--validate-only')

  const isEdit = args[0] === 'edit'
  const ghArgs = isEdit ? args.slice(1) : args
  const bodyArgs = isEdit ? ghArgs.slice(1) : ghArgs
  const editPrNumber = isEdit && ghArgs[0] && /^\d+$/.test(ghArgs[0]) ? Number(ghArgs[0]) : null

  // Edit mode: which gate set applies is a property of the TARGET PR, not of
  // whatever checkout/env this command happens to run from — resolve it from
  // the PR's real head branch on the forge (#417, bundled finding). Create
  // mode is unchanged: the PR doesn't exist yet, the local branch IS the
  // truthful source there.
  let branch: string
  if (isEdit) {
    const prRef = ghArgs[0]
    if (!prRef || prRef.startsWith('-')) {
      fail('edit mode requires the target PR number/URL/branch as the first argument after `edit`.')
    }
    branch = fetchPrHeadBranch(prRef)
  } else {
    branch = process.env.BRANCH || currentBranch()
  }
  const bodyResult = locateBody(bodyArgs)
  const body = bodyResult?.body ?? null
  const title = extractTitle(bodyArgs)

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
  checkSinglePlanPrGate(editPrNumber)
  if (body !== null) {
    for (const step of gatePlanForBranch(branch)) {
      if (step === 'verify-brief') {
        runGate('brief-validation', 'packages/aeg-core/bin/verify-brief.ts', [], { BRANCH: branch, PR_BODY: body })
      } else if (step === 'verify-docs') {
        runGate('verify-docs', 'packages/aeg-core/bin/verify-docs.ts', ['--pr'], { PR_BODY: body })
      } else if (step === 'closes-n') {
        runGate('Closes #N', 'packages/aeg-core/bin/verify-coherence.ts', ['--closes-n'], {
          BRANCH: branch,
          PR_BODY: body
        })
      } else if (step === 'verify-task') {
        runGate('verify-task', 'packages/aeg-core/bin/verify-task.ts', [], { PR_BODY: body })
      }
    }
  } else {
    console.log('[open-pr] title-only edit — body gates skipped (title grammar validated above).')
  }

  console.log('[open-pr] all contract gates PASS.')
  if (validateOnly) {
    console.log('[open-pr] --validate-only: stopping before gh.')
    process.exit(0)
  }

  const { finalArgs, cleanup } = resolveShippableArgs(bodyArgs, bodyResult)
  try {
    const finalGhArgs = isEdit ? [ghArgs[0] as string, ...finalArgs] : finalArgs
    const ghCmd = isEdit ? ['pr', 'edit', ...finalGhArgs] : ['pr', 'create', ...finalGhArgs]
    const out = execFileSync('gh', ghCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
    console.log(out.trim())
  } finally {
    cleanup()
  }
}

if (import.meta.main) {
  main()
}
