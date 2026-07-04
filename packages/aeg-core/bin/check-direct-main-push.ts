#!/usr/bin/env bun

/**
 * check-direct-main-push — ring-2 detection backstop for direct pushes to
 * `main` (aeg-governance-hardening task 24, #364, Part 3 — item 1). Branch
 * protection is unavailable on this private, free-plan repo, so prevention
 * stays in `.husky/pre-push` (denies the push target locally) — this job
 * runs on every push to `main` and answers, after the fact, "was this
 * commit introduced by a merged PR?" via the commits→pulls association API
 * (`gh api repos/{owner}/{repo}/commits/{sha}/pulls`, which GitHub documents
 * as returning "the merged Pull Request that introduced the commit to the
 * repository" for a commit on the default branch).
 *
 * Detection only, never mutation: on a violation this opens (or updates,
 * idempotently, if already open for this SHA) an incident Issue and exits
 * non-zero — it never reverts, force-pushes, or otherwise touches the
 * offending commit (Principal decision, brief §11).
 *
 * Usage: GITHUB_SHA=<sha> bun packages/aeg-core/bin/check-direct-main-push.ts
 * Exit code: 0 (legitimate) or 1 (direct push detected / incident opened).
 */

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { checkDirectMainPush } from '../src/index'
import { resolveRepo } from '../../../apps/aeg/web/studio/src/lib/forge/resolve-repo'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

const LABEL = 'aeg:direct-main-push'
const LABEL_DESCRIPTION = 'A commit landed on main with no associated merged PR (ring-2 detection)'
const MARKER = '<!-- aeg:direct-main-push -->'

function sh(args: string[]): string {
  return execFileSync(args[0] as string, args.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim()
}

type AssociatedPr = { number: number; merged_at: string | null }

function fetchAssociatedMergedPrs(sha: string, owner: string, repo: string): number[] {
  const out = sh(['gh', 'api', `repos/${owner}/${repo}/commits/${sha}/pulls`])
  const prs: AssociatedPr[] = JSON.parse(out)
  return prs.filter((pr) => pr.merged_at !== null).map((pr) => pr.number)
}

function ensureLabelExists(owner: string, repo: string): void {
  const existing: Array<{ name: string }> = JSON.parse(
    sh(['gh', 'label', 'list', '-R', `${owner}/${repo}`, '--json', 'name', '--limit', '200'])
  )
  if (existing.some((l) => l.name === LABEL)) return
  sh([
    'gh',
    'label',
    'create',
    LABEL,
    '-R',
    `${owner}/${repo}`,
    '--color',
    'B60205',
    '--description',
    LABEL_DESCRIPTION
  ])
}

function incidentAlreadyOpen(sha: string, owner: string, repo: string): boolean {
  const out = sh([
    'gh',
    'issue',
    'list',
    '-R',
    `${owner}/${repo}`,
    '--label',
    LABEL,
    '--state',
    'open',
    '--search',
    sha,
    '--json',
    'number'
  ])
  const issues: Array<{ number: number }> = JSON.parse(out || '[]')
  return issues.length > 0
}

function openIncident(sha: string, owner: string, repo: string): void {
  ensureLabelExists(owner, repo)
  if (incidentAlreadyOpen(sha, owner, repo)) {
    console.error(`[check-direct-main-push] incident already open for ${sha} — not duplicating.`)
    return
  }

  const body = [
    MARKER,
    '**Direct push to `main` detected — no associated merged PR.**',
    '',
    `Commit \`${sha}\` landed on \`main\` but the commits→pulls association API reports no merged pull request that introduced it.`,
    '',
    'This is a detection-only finding — nothing was reverted or mutated. AEG routes every repo-file change through a worktree branch + PR + green merge; investigate how this commit reached `main` directly (a bypassed hook, a manual admin push, or an unusual merge shape the association API cannot explain).'
  ].join('\n')

  sh([
    'gh',
    'issue',
    'create',
    '-R',
    `${owner}/${repo}`,
    '--title',
    `Direct push to main detected: ${sha.slice(0, 12)}`,
    '--body',
    body,
    '--label',
    LABEL
  ])
}

async function main(): Promise<void> {
  const sha = process.env.GITHUB_SHA
  if (!sha) {
    console.error('[check-direct-main-push] GITHUB_SHA env var not set.')
    process.exit(1)
  }

  const repo = await resolveRepo()
  if (!repo) {
    console.error('[check-direct-main-push] could not resolve a GitHub repo (set AEG_REPO or check `git remote`).')
    process.exit(1)
  }

  const associatedMergedPrNumbers = fetchAssociatedMergedPrs(sha, repo.owner, repo.repo)
  const result = checkDirectMainPush({ sha, associatedMergedPrNumbers })

  if (result.verdict === 'legitimate') {
    console.log(`[check-direct-main-push] ${sha} is legitimate — introduced by merged PR #${result.mergedPrNumber}.`)
    process.exit(0)
  }

  console.error(`[check-direct-main-push] VIOLATION: ${sha} has no associated merged PR.`)
  openIncident(sha, repo.owner, repo.repo)
  process.exit(1)
}

if (import.meta.main) {
  await main()
}
