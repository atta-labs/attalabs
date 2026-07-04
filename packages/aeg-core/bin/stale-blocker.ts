#!/usr/bin/env bun

/**
 * stale-blocker — daily-drift's stuck row-adjacent blocker check
 * (aeg-governance-hardening task 23, #360, Part 3). Thin I/O shim: reads the
 * active iteration topology files from disk (this job runs against a fresh
 * checkout of `main` on a schedule — no `origin/main` fetch needed, the
 * checkout already IS main), fetches each task's Issue open/closed +
 * opened-at and forge branch existence via `gh`/`git`, and calls the pure
 * `findStaleBlockers` homed in `@atta/aeg-core`. Every `gh` call carries an
 * explicit `-R <owner>/<repo>` (task 23 Part 1 lesson — do not repeat the
 * repo-resolution gap in this new file).
 *
 * Never-red discipline: this is a notification channel, not a gate
 * (`.github/workflows/archivist.yml`'s `daily-drift` job always exits 0
 * regardless of what this script finds or whether the forge is reachable).
 * A stuck blocker is flagged via the `aeg:stale-blocker` label plus one
 * idempotent tracking comment (updated in place, never duplicated) on the
 * stuck Issue — mirroring the `aeg:incoherent` label pattern
 * `.github/workflows/forge-lifecycle.yml` already applies for A1 failures.
 */

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRepo } from '../../../apps/aeg/web/studio/src/lib/forge/resolve-repo'
import { findStaleBlockers, parseIteration } from '../src/index'
import type { StaleBlocker, StaleBlockerIterationFact, StaleBlockerTaskFact } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

const ITERATIONS_DIR = join(REPO_ROOT, 'aeg-root/iterations')
const DEFAULT_THRESHOLD_DAYS = 4
const MARKER = '<!-- aeg:stale-blocker -->'
const LABEL = 'aeg:stale-blocker'

const COMMAND_TIMEOUT_MS = 20_000

/**
 * Never throws (never-red discipline), but logs a non-fatal warning on
 * failure rather than swallowing silently — a mistaken command (e.g. a
 * label description exceeding GitHub's 100-char cap) must be visible in the
 * job's own log, not just discoverable by manually diffing forge state. A
 * bounded timeout is required here specifically: a network hang inside this
 * script (a real, observed failure mode this repo's `gh`/`git` calls hit)
 * would otherwise block forever with no output — indistinguishable from a
 * stuck job, not a fast, loud "unreachable" signal.
 */
function sh(cmd: string, input?: string): string {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: COMMAND_TIMEOUT_MS
    }).trim()
  } catch (err) {
    const stderr = (err as { stderr?: Buffer | string }).stderr
    const message = stderr ? stderr.toString().trim() : (err as Error).message
    console.log(`[stale-blocker] non-fatal: command failed — ${message}`)
    return ''
  }
}

function shJson<T>(cmd: string): T | null {
  const out = sh(cmd)
  if (!out) return null
  try {
    return JSON.parse(out) as T
  } catch {
    return null
  }
}

/** Real topology files only — excludes README.md, `*.tokens.md` ledgers, and the completed/ subdirectory. */
function activeIterationFiles(): string[] {
  return readdirSync(ITERATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md' && !e.name.endsWith('.tokens.md'))
    .map((e) => e.name)
}

type IssueFact = { state: 'OPEN' | 'CLOSED'; createdAt: string }

function branchExists(iterationSlug: string, taskId: string): boolean {
  return sh(`git ls-remote --heads origin task/${iterationSlug}/${taskId}`).length > 0
}

function gatherIterationFacts(fileName: string, repo: { owner: string; repo: string }): StaleBlockerIterationFact {
  const md = readFileSync(join(ITERATIONS_DIR, fileName), 'utf8')
  const iteration = parseIteration(md)

  const tasks: StaleBlockerTaskFact[] = iteration.tasks.map((task) => {
    if (task.issue === null) {
      return { id: task.id, issue: null, issueOpen: false, issueOpenedAt: null, branchExists: false }
    }
    const issueJson = shJson<IssueFact>(
      `gh issue view ${task.issue} -R ${repo.owner}/${repo.repo} --json state,createdAt`
    )
    return {
      id: task.id,
      issue: task.issue,
      issueOpen: issueJson?.state === 'OPEN',
      issueOpenedAt: issueJson?.createdAt ?? null,
      branchExists: branchExists(iteration.name, task.id)
    }
  })

  return { slug: iteration.name, tasks }
}

/** GitHub label descriptions cap at 100 chars — keep this comfortably under. */
const LABEL_DESCRIPTION = "daily-drift: Issue open past threshold while a later topology row hasn't started"

/** Checked-then-create, not create-and-swallow — "already exists" is the expected steady state, not a failure worth logging every day. */
function ensureLabelExists(repo: { owner: string; repo: string }): void {
  // --limit 200: gh label list's default page (30) undercounts on repos with
  // many labels — this repo has 30+, which silently hid the label on the
  // default call (observed live 2026-07-04).
  const existing =
    shJson<Array<{ name: string }>>(`gh label list -R ${repo.owner}/${repo.repo} --json name --limit 200`) ?? []
  if (existing.some((l) => l.name === LABEL)) return
  sh(`gh label create "${LABEL}" -R ${repo.owner}/${repo.repo} --color B60205 --description "${LABEL_DESCRIPTION}"`)
}

/** Finds the numeric REST comment id embedded in a GraphQL comment's `url` (…#issuecomment-<id>). */
function commentIdFromUrl(url: string): string | null {
  const match = url.match(/issuecomment-(\d+)/)
  return match ? (match[1] as string) : null
}

function flagStaleBlocker(blocker: StaleBlocker, repo: { owner: string; repo: string }): void {
  const repoFlag = `${repo.owner}/${repo.repo}`
  sh(`gh issue edit ${blocker.issue} -R ${repoFlag} --add-label "${LABEL}"`)

  const body = [
    MARKER,
    '**Stale blocker detected by `daily-drift`.**',
    '',
    `Task \`${blocker.taskId}\` in iteration \`${blocker.iterationSlug}\` has been open for ${blocker.daysOpen} day(s), ` +
      `and later task \`${blocker.blockedTaskId}\` in the same iteration has not started (no forge branch yet). ` +
      'Row-adjacency means every task after this one is dispatch-blocked until this one closes (D-081) — ' +
      'this is a notification, not a merge gate.'
  ].join('\n')

  const issueJson = shJson<{ comments: { body: string; url: string }[] }>(
    `gh issue view ${blocker.issue} -R ${repoFlag} --json comments`
  )
  const existing = issueJson?.comments.find((c) => c.body.includes(MARKER))
  const existingId = existing ? commentIdFromUrl(existing.url) : null

  if (existingId) {
    // -F (not -f) is required here: only -F/--field reads an "@-" value from
    // stdin. -f/--raw-field treats "@-" as a literal two-character string —
    // confirmed live (2026-07-04): a first bad version of this line silently
    // overwrote every tracking comment's real body with the text "@-".
    sh(`gh api repos/${repoFlag}/issues/comments/${existingId} -X PATCH -F body=@-`, body)
  } else {
    sh(`gh issue comment ${blocker.issue} -R ${repoFlag} --body-file -`, body)
  }
}

async function main(): Promise<void> {
  const thresholdDays = Number(process.env.STALE_BLOCKER_THRESHOLD_DAYS ?? DEFAULT_THRESHOLD_DAYS)
  const nowIso = new Date().toISOString()

  const repo = await resolveRepo()
  if (!repo) {
    console.log('[stale-blocker] could not resolve a GitHub repo (set AEG_REPO or check `git remote`) — skip.')
    console.log('[stale-blocker] never-red: exiting 0.')
    process.exit(0)
  }

  try {
    const iterationFacts = activeIterationFiles().map((f) => gatherIterationFacts(f, repo))
    const blockers = findStaleBlockers(iterationFacts, nowIso, thresholdDays)

    console.log(`[stale-blocker] threshold: ${thresholdDays} day(s); now: ${nowIso}`)
    console.log(`[stale-blocker] iterations scanned: ${iterationFacts.map((i) => i.slug).join(', ') || '(none)'}`)

    if (blockers.length === 0) {
      console.log('[stale-blocker] no stuck row-adjacent blockers found.')
    } else {
      ensureLabelExists(repo)
      for (const b of blockers) {
        console.log(
          `[stale-blocker] FLAGGED: task ${b.taskId} (#${b.issue}) in ${b.iterationSlug} — open ${b.daysOpen}d, blocking ${b.blockedTaskId}`
        )
        flagStaleBlocker(b, repo)
      }
    }
  } catch (err) {
    console.log(`[stale-blocker] error while scanning (never-red, reporting only): ${(err as Error).message}`)
  }

  // Never-red: this is a notification channel, not a gate (see module docstring).
  process.exit(0)
}

if (import.meta.main) {
  await main()
}
