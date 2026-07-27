#!/usr/bin/env bun

/**
 * dead-branch-audit — daily-drift's dead-branch-push check (aeg-governance-
 * hardening task 24, #364, Part 4 — item 2). Thin I/O shim: lists every
 * remote `task/*` branch, resolves each one's most recent PR (any state)
 * plus that PR's resolution timestamp and the branch's current tip commit
 * date, and calls the pure `findDeadBranchPushes` (`@atta/aeg-core`).
 *
 * Extends task 23's `daily-drift` job (`.github/workflows/archivist.yml`) —
 * never-red discipline: this script always exits 0; the job step also wraps
 * it in `continue-on-error: true`. A violation is flagged via the
 * `vinaya/dead-branch-push` label plus one idempotent tracking comment on the
 * branch's own (already-resolved) PR — the same label/idempotent-comment
 * pattern this repo's other daily-drift notification channels use.
 */

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { findDeadBranchPushes } from '../src/index'
import type { DeadBranchFact, DeadBranchPush } from '../src/index'
import { label, resolveRepo } from '@atta/aeg-forge-state'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

// Same discipline as `check-direct-main-push.ts`: the name is read from the
// code-owned vocabulary, because this bin mints the label on first fire and a
// literal would have created a retired `aeg:`-named one. The marker is
// derived from the label so the two can never disagree.
const LABEL = label('dead-branch-push')
const MARKER = `<!-- ${LABEL} -->`
const LABEL_DESCRIPTION = 'daily-drift: commits landed on this branch after its PR already resolved'
const COMMAND_TIMEOUT_MS = 20_000

/** Never throws (never-red discipline) — logs a non-fatal warning and returns ''. */
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
    console.log(`[dead-branch-audit] non-fatal: command failed — ${message}`)
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

type RemoteBranch = { name: string; sha: string }

/** Every remote `task/*` branch (any iteration/task id), via one `git ls-remote` call — no per-branch fetch needed. */
function listTaskBranches(): RemoteBranch[] {
  const out = sh("git ls-remote --heads origin 'task/*'")
  if (!out) return []
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha, ref] = line.split('\t')
      return { name: (ref as string).replace(/^refs\/heads\//, ''), sha: sha as string }
    })
}

type PrListEntry = {
  number: number
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  mergedAt: string | null
  closedAt: string | null
}

function mostRecentPr(branch: string, repo: { owner: string; repo: string }): PrListEntry | null {
  const entries = shJson<PrListEntry[]>(
    `gh pr list --head "${branch}" -R ${repo.owner}/${repo.repo} --state all --json number,state,mergedAt,closedAt --limit 1`
  )
  return entries?.[0] ?? null
}

type CommitJson = { commit: { committer: { date: string } } }

function commitDate(sha: string, repo: { owner: string; repo: string }): string | null {
  const json = shJson<CommitJson>(`gh api repos/${repo.owner}/${repo.repo}/commits/${sha}`)
  return json?.commit?.committer?.date ?? null
}

function gatherFacts(repo: { owner: string; repo: string }): DeadBranchFact[] {
  const facts: DeadBranchFact[] = []
  for (const { name, sha } of listTaskBranches()) {
    const pr = mostRecentPr(name, repo)
    if (!pr) continue
    if (pr.state !== 'MERGED' && pr.state !== 'CLOSED') continue

    const resolvedAt = pr.state === 'MERGED' ? pr.mergedAt : pr.closedAt
    if (!resolvedAt) continue

    const latestCommitAt = commitDate(sha, repo)
    if (!latestCommitAt) continue

    facts.push({ branch: name, prNumber: pr.number, prState: pr.state, resolvedAt, latestCommitAt })
  }
  return facts
}

/** GitHub label descriptions cap at 100 chars. */
function ensureLabelExists(repo: { owner: string; repo: string }): void {
  const existing =
    shJson<Array<{ name: string }>>(`gh label list -R ${repo.owner}/${repo.repo} --json name --limit 200`) ?? []
  if (existing.some((l) => l.name === LABEL)) return
  sh(`gh label create "${LABEL}" -R ${repo.owner}/${repo.repo} --color B60205 --description "${LABEL_DESCRIPTION}"`)
}

function commentIdFromUrl(url: string): string | null {
  const match = url.match(/issuecomment-(\d+)/)
  return match ? (match[1] as string) : null
}

function flagDeadBranchPush(finding: DeadBranchPush, repo: { owner: string; repo: string }): void {
  const repoFlag = `${repo.owner}/${repo.repo}`
  sh(`gh pr edit ${finding.prNumber} -R ${repoFlag} --add-label "${LABEL}"`)

  const body = [
    MARKER,
    '**Dead-branch push detected by `daily-drift`.**',
    '',
    `Branch \`${finding.branch}\` has a ${finding.prState} PR (#${finding.prNumber}, resolved ${finding.resolvedAt}), ` +
      `but its remote tip commit is dated ${finding.latestCommitAt} — after that resolution. ` +
      'This is a notification, not a merge gate — nothing was reverted or mutated. Investigate how commits kept ' +
      'landing on this branch after its work was already resolved (a bypassed pre-push hook, or a writer without it installed).'
  ].join('\n')

  const prJson = shJson<{ comments: { body: string; url: string }[] }>(
    `gh pr view ${finding.prNumber} -R ${repoFlag} --json comments`
  )
  const existing = prJson?.comments.find((c) => c.body.includes(MARKER))
  const existingId = existing ? commentIdFromUrl(existing.url) : null

  if (existingId) {
    sh(`gh api repos/${repoFlag}/issues/comments/${existingId} -X PATCH -F body=@-`, body)
  } else {
    sh(`gh pr comment ${finding.prNumber} -R ${repoFlag} --body-file -`, body)
  }
}

async function main(): Promise<void> {
  const repo = await resolveRepo()
  if (!repo) {
    console.log('[dead-branch-audit] could not resolve a GitHub repo (set AEG_REPO or check `git remote`) — skip.')
    console.log('[dead-branch-audit] never-red: exiting 0.')
    process.exit(0)
  }

  try {
    const facts = gatherFacts(repo)
    const findings = findDeadBranchPushes(facts)

    console.log(`[dead-branch-audit] task branches scanned: ${facts.length}`)

    if (findings.length === 0) {
      console.log('[dead-branch-audit] no dead-branch pushes found.')
    } else {
      ensureLabelExists(repo)
      for (const finding of findings) {
        console.log(
          `[dead-branch-audit] FLAGGED: ${finding.branch} — PR #${finding.prNumber} (${finding.prState}) resolved ${finding.resolvedAt}, tip commit ${finding.latestCommitAt}`
        )
        flagDeadBranchPush(finding, repo)
      }
    }
  } catch (err) {
    console.log(`[dead-branch-audit] error while scanning (never-red, reporting only): ${(err as Error).message}`)
  }

  // Never-red: this is a notification channel, not a gate (see module docstring).
  process.exit(0)
}

if (import.meta.main) {
  await main()
}
