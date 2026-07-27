#!/usr/bin/env bun

/**
 * check-first-push-dispatch — thin CLI/I/O shim for the first-push dispatch
 * gate wired into `.husky/pre-push` (aeg-governance-hardening task 25,
 * #365). Runs the UNCHANGED `verify-dispatch.ts` gate mode once, on a
 * `task/<iteration>/<n>` branch's first push (no PR yet), and classifies its
 * exit/output into a `READY`/`NOT_READY`/`UNKNOWN` fact for the pure
 * evaluator `checkFirstPushDispatchGate` (@atta/aeg-core). No
 * dispatch-readiness logic lives here — `verify-dispatch.ts`'s own
 * `checkDispatchReadiness` remains the single source of truth, wired here,
 * not re-implemented (§4 of this task's brief).
 *
 * `prExists` is passed in by the caller (the hook already computed it via
 * `gh pr view "$branch" --json body` for the C5 gate) — this script never
 * re-derives "does a PR exist" by a second, independent detection.
 *
 * UNKNOWN (fail-open) is detected two ways, checked before trusting any
 * verify-dispatch output at all:
 *
 *   1. A cheap `gh auth status` reachability probe runs FIRST. Discovered
 *      live while testing this gate: verify-dispatch's individual `gh issue
 *      view`/`gh pr list` calls (via its `sh()` helper) silently swallow
 *      failures to `''` on a degraded/misconfigured `gh` auth state, which
 *      then reads as confident-looking (but FALSE) NOT READY blockers —
 *      `resolveRepo()`/`resolveGithubToken()`'s own top-level check does
 *      NOT catch this, because `gh auth token` can still succeed (e.g. via
 *      keychain) even when other `gh` subcommands cannot resolve a host. If
 *      the probe itself fails, verify-dispatch is not even run — its output
 *      would be unreliable, so there is nothing worth trusting.
 *   2. verify-dispatch's own `severity:infra` marker (printed when
 *      `resolveRepo()`/`resolveGithubToken()` both fail — e.g. no git
 *      remote and no token anywhere) is still checked as a backstop.
 *
 * A single flaky call to one specific `gh issue view`/`gh pr list` (rather
 * than total auth/reachability failure) remains a known, pre-existing
 * limitation of `verify-dispatch.ts` itself (its `sh()` helper's silent
 * swallow, documented in that file) and is out of this task's surface to
 * fix — see `roles/developer.md` §4 "Out of surface".
 *
 * Readiness is read from the `dispatch-readiness: READY|NOT READY` line
 * specifically, NOT verify-dispatch's combined exit code / final summary
 * line. Discovered live on this task's own second pre-PR push: verify-
 * dispatch's overall exit code also folds in `leftover-detection` — a
 * pre-Step-0 "is it safe to branch fresh" advisory that reports `stop` on
 * ANY branch with commits already ahead of origin/main. That is correct for
 * its original purpose (deciding whether to run Step 0) but produces a false
 * refusal here: a task legitimately mid-flight across multiple pre-PR pushes
 * always has commits ahead of main, so the combined exit code would block
 * every push after the first. The dispatch-readiness predicates (Issue-
 * existence, depends-on, conflicts-with, prior-tranche-archival, etc. —
 * the actual entry-gate items this task mechanizes) are unaffected by
 * leftover-detection and are what this gate cares about.
 *
 * Usage: bun packages/aeg-core/bin/check-first-push-dispatch.ts <branch> <pr-exists:0|1>
 * Exit code: 0 = allow (push proceeds), 1 = refuse.
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { checkFirstPushDispatchGate, type DispatchReadinessFact, parseTaskBranch } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
const INFRA_MARKER = 'severity:infra'
const READINESS_LINE_RE = /^dispatch-readiness: (READY|NOT READY)$/m

function ghReachable(): boolean {
  try {
    execSync('gh auth status', { encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'], timeout: 8000 })
    return true
  } catch {
    return false
  }
}

function runVerifyDispatch(tranche: string, taskId: string): { readiness: DispatchReadinessFact; output: string } {
  let output: string
  try {
    output = execSync(`bun packages/aeg-core/bin/verify-dispatch.ts ${tranche} ${taskId}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string }
    output = [err.stdout, err.stderr].filter(Boolean).join('\n')
  }

  if (output.includes(INFRA_MARKER)) return { readiness: 'UNKNOWN', output }

  const match = READINESS_LINE_RE.exec(output)
  if (!match) return { readiness: 'NOT_READY', output } // unparseable output — fail loud, never silently allow
  return { readiness: match[1] === 'READY' ? 'READY' : 'NOT_READY', output }
}

if (import.meta.main) {
  const branch = process.argv[2]
  const prExists = process.argv[3] === '1'

  if (!branch) {
    console.error('Usage: check-first-push-dispatch.ts <branch> <pr-exists:0|1>')
    process.exit(1)
  }

  const parsed = parseTaskBranch(branch)
  let readiness: DispatchReadinessFact = 'READY'
  let output = ''

  if (parsed && !prExists) {
    if (!ghReachable()) {
      readiness = 'UNKNOWN'
      output =
        '[check-first-push-dispatch] `gh auth status` failed — forge unreachable/unauthenticated; skipping verify-dispatch.'
    } else {
      const run = runVerifyDispatch(parsed.tranche, parsed.taskId)
      readiness = run.readiness
      output = run.output
    }
  }

  if (output) console.log(output)

  const result = checkFirstPushDispatchGate({ branch, prExists, readiness })
  console.log(`[check-first-push-dispatch] ${result.verdict === 'allow' ? '✓' : '✖'} ${result.reason}`)
  process.exit(result.verdict === 'allow' ? 0 : 1)
}
