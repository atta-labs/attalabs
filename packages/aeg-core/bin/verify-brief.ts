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
 *
 * Bypass rule: the exemption is for bodies that are **not briefs**, not for
 * branches that are not tasks. An ordinary non-AEG PR (a one-line dependency
 * bump) carries no brief and must not be forced to grow one — that is what the
 * bypass protects. But the branch name was the wrong proxy for it: a standalone
 * `fix/*` brief is a brief, and under the old branch-only rule it bypassed every
 * section check (a fix brief shipped with no §7 doc-update list and nothing
 * caught it). So `verify-brief` validates when the branch is `task/<iter>/<n>`
 * **or** the body is brief-shaped (`isBriefShaped`), and bypasses only when
 * neither holds. `Closes #N` stays a task-branch-only requirement — see
 * `BriefSectionsOptions.requireClosesN`. Reads `BRANCH` the same way
 * `verify-coherence.ts --closes-n` does.
 *
 * Authoring-time entry (`--body-file <path>`): the same validator, run against a
 * brief file before a PR (or even a branch) exists, so a Brief Author can gate a
 * brief at authoring time instead of discovering the gap in CI after dispatch.
 * With no `BRANCH`/`--branch`, the branch is inferred from the brief's own Step 0
 * `git worktree add … -b <branch>` line, which is where a brief declares what it
 * is going to be.
 *
 * Plan-PR Closes guard (D-077): runs BEFORE the non-task-branch bypass above,
 * since a `plan/*` branch is itself non-task and would otherwise never reach
 * a brief-shape check at all. See `checkPlanPrNoCloses` in `src/brief-validation.ts`.
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  checkBriefSections,
  checkForgeTitle,
  checkPlanPrNoCloses,
  inferBranchFromBody,
  isBriefShaped,
  readTierFromPrBody
} from '../src/index'

const REPO_ROOT = join(import.meta.dir, '../../..')
// Captured BEFORE the chdir below: a relative `--body-file` path is relative to
// where the author ran the command, not to the repo root this script moves to.
const INVOCATION_CWD = process.cwd()
process.chdir(REPO_ROOT)

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const TASK_BRANCH_PATTERN = /^task\/[^/]+\/[^/]+$/

/**
 * A flag's parse outcome. The three cases are kept distinct because collapsing
 * "absent" and "present but unparseable" into one `null` is a silent-green path:
 * `--body-file` with a fumbled path (shell glob, tab-completion miss, wrong arg
 * order) would fall through to the empty-`PR_BODY` branch and exit 0, handing a
 * Brief Author a green on a brief nobody graded — the exact failure class this
 * gate exists to eliminate, reintroduced through its own new entry point
 * (PR #631 review MAJOR).
 */
type FlagRead = { state: 'absent' } | { state: 'value'; value: string } | { state: 'missing-value' }

/** Reads `--flag value` or `--flag=value` from argv. See `FlagRead` for why the empty case is not `null`. */
function readFlag(argv: string[], name: string): FlagRead {
  const idx = argv.indexOf(`--${name}`)
  if (idx !== -1) {
    const next = argv[idx + 1]
    if (next !== undefined && !next.startsWith('--')) return { state: 'value', value: next }
    return { state: 'missing-value' }
  }
  const inline = argv.find((a) => a.startsWith(`--${name}=`))
  if (inline !== undefined) {
    const value = inline.slice(name.length + 3)
    return value.length > 0 ? { state: 'value', value } : { state: 'missing-value' }
  }
  return { state: 'absent' }
}

/** Exits non-zero on a flag that was passed with no usable value; returns `null` only when truly absent. */
function requireFlagValue(argv: string[], name: string): string | null {
  const read = readFlag(argv, name)
  if (read.state === 'missing-value') {
    console.error(`\n[verify-brief] FAILED — \`--${name}\` was passed with no value.`)
    console.error(`[verify-brief] Usage: --${name} <value> (or --${name}=<value>).`)
    process.exit(1)
  }
  return read.state === 'value' ? read.value : null
}

export function main(): void {
  // Title grammar is universal (every PR title rides into merge commits and
  // derived views), so it runs BEFORE the non-task-branch bypass — the ring-1
  // backstop for checkForgeTitle, which otherwise lives only in the wrappers.
  const prTitle = process.env.PR_TITLE ?? ''
  if (prTitle) {
    const t = checkForgeTitle(prTitle)
    if (t.status === 'fail') {
      console.error('\n[verify-brief] FAILED — title grammar:\n')
      for (const e of t.errors) console.error(`  ✗ ${e}`)
      process.exit(1)
    }
  }

  const bodyFile = requireFlagValue(process.argv, 'body-file')
  let prBody = process.env.PR_BODY ?? ''
  if (bodyFile !== null) {
    const path = resolve(INVOCATION_CWD, bodyFile)
    try {
      prBody = readFileSync(path, 'utf8')
    } catch {
      console.error(`\n[verify-brief] FAILED — could not read --body-file: ${path}`)
      process.exit(1)
    }
    console.log(`[verify-brief] reading brief from ${path}`)
  }

  // `||`, not `??`: an env var set to the empty string is *unset* for this
  // purpose, and `??` treats `''` as a real value — so `BRANCH=""` (how a shell
  // exports a var it has no value for, and how the test harness normalises the
  // environment) silently won over Step 0 inference and left the branch empty.
  const branch = requireFlagValue(process.argv, 'branch') || process.env.BRANCH || inferBranchFromBody(prBody)

  const planGuard = checkPlanPrNoCloses(branch, prBody)
  if (planGuard.status === 'fail') {
    console.error('\n[verify-brief] FAILED — plan-PR Closes guard violated:\n')
    for (const e of planGuard.errors) console.error(`  ✗ ${e}`)
    console.error('\n[verify-brief] Fix the PR body and push again.')
    process.exit(1)
  }

  const isTaskBranch = TASK_BRANCH_PATTERN.test(branch)

  if (branch && !isTaskBranch && !isBriefShaped(prBody)) {
    console.log(`[verify-brief] non-task branch (${branch}) and PR body is not brief-shaped — bypass.`)
    process.exit(0)
  }

  if (!prBody) {
    console.log('[verify-brief] PR_BODY env var is empty; nothing to check.')
    console.log('[verify-brief] PASS (no body — likely a local invocation; CI sets PR_BODY automatically).')
    process.exit(0)
  }

  const { errors } = checkBriefSections(prBody, readTierFromPrBody, { requireClosesN: isTaskBranch })

  if (!isTaskBranch) {
    console.log(
      `[verify-brief] brief-shaped body on a non-task branch (${branch || 'none'}) — validating sections; \`Closes #N\` not required.`
    )
  }

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
