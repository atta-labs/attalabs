// `vinaya audit` — the two ring-2 detection/notification checks, callable
// directly instead of only from the `daily-drift` and
// `direct-main-push-detection` jobs in the generated `vinaya-archivist.yml`
// (see lib/artifacts.ts's `archivistWorkflow()`). Wraps this monorepo's own
// `packages/aeg-core/bin/dead-branch-audit.ts` (never-red — a notification
// channel) and `check-direct-main-push.ts` (a real pass/fail), calling the
// same pure `findDeadBranchPushes` / `checkDirectMainPush` homed in
// `@atta/aeg-core`.
//
// Repo/owner resolution goes through this CLI's own `detectGitRepo()`
// (lib/detect.ts) — the same path every other command uses — never a
// second auth/repo-resolution mechanism.

import { execFileSync } from 'node:child_process'
import {
  checkDirectMainPush,
  findDeadBranchPushes,
  label,
  type DeadBranchFact,
  type DeadBranchPush
} from '@atta/aeg-core'
import { detectGitRepo, type RepoInfo } from '../lib/detect.js'
import { printJson } from '../lib/envelope.js'

export type AuditDeps = {
  detectRepo: () => Promise<RepoInfo | null>
  /** Injectable override for the raw single-shot `gh api .../pulls` fetch — test-only. */
  fetchAssociatedMergedPrs?: (sha: string, repoFlag: string) => number[]
  /** Poll tuning — test-only; production uses DIRECT_PUSH_POLL_ATTEMPTS/DELAY_MS. */
  pollAttempts?: number
  pollDelayMs?: number
  sleep?: (ms: number) => Promise<void>
  /** Injectable override for the real (`gh issue create`) incident-open side effect — test-only. */
  openDirectPushIncident?: (sha: string, repoFlag: string) => void
}

function realDeps(): AuditDeps {
  return { detectRepo: detectGitRepo }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const COMMAND_TIMEOUT_MS = 20_000
const DEAD_BRANCH_LABEL = label('dead-branch-push')
const DEAD_BRANCH_MARKER = `<!-- ${DEAD_BRANCH_LABEL} -->`
const DEAD_BRANCH_LABEL_DESCRIPTION = 'daily-drift: commits landed on this branch after its PR already resolved'
const DIRECT_PUSH_LABEL = label('direct-main-push')
const DIRECT_PUSH_MARKER = `<!-- ${DIRECT_PUSH_LABEL} -->`
const DIRECT_PUSH_LABEL_DESCRIPTION = 'A commit landed on main with no associated merged PR (ring-2 detection)'

/** Never throws (dead-branch half is never-red, matching dead-branch-audit.ts). */
function shSoft(args: string[], input?: string): string {
  try {
    return execFileSync(args[0] as string, args.slice(1), {
      encoding: 'utf8',
      input,
      timeout: COMMAND_TIMEOUT_MS
    }).trim()
  } catch (err) {
    const stderr = (err as { stderr?: Buffer | string }).stderr
    const message = stderr ? stderr.toString().trim() : (err as Error).message
    process.stdout.write(`[vinaya audit] non-fatal: command failed — ${message}\n`)
    return ''
  }
}

function shSoftJson<T>(args: string[]): T | null {
  const out = shSoft(args)
  if (!out) return null
  try {
    return JSON.parse(out) as T
  } catch {
    return null
  }
}

function sh(args: string[], input?: string): string {
  return execFileSync(args[0] as string, args.slice(1), { encoding: 'utf8', input }).trim()
}

// ---------------------------------------------------------------------------
// Dead-branch push audit — never-red, notification only.
// ---------------------------------------------------------------------------
type RemoteBranch = { name: string; sha: string }

function listTaskBranches(): RemoteBranch[] {
  const out = shSoft(['git', 'ls-remote', '--heads', 'origin', 'task/*'])
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

function mostRecentPr(branch: string, repoFlag: string): PrListEntry | null {
  const entries = shSoftJson<PrListEntry[]>([
    'gh',
    'pr',
    'list',
    '--head',
    branch,
    '-R',
    repoFlag,
    '--state',
    'all',
    '--json',
    'number,state,mergedAt,closedAt',
    '--limit',
    '1'
  ])
  return entries?.[0] ?? null
}

function commitDate(sha: string, repoFlag: string): string | null {
  const json = shSoftJson<{ commit: { committer: { date: string } } }>([
    'gh',
    'api',
    `repos/${repoFlag}/commits/${sha}`
  ])
  return json?.commit?.committer?.date ?? null
}

function gatherDeadBranchFacts(repoFlag: string): DeadBranchFact[] {
  const facts: DeadBranchFact[] = []
  for (const { name, sha } of listTaskBranches()) {
    const pr = mostRecentPr(name, repoFlag)
    if (!pr) continue
    if (pr.state !== 'MERGED' && pr.state !== 'CLOSED') continue

    const resolvedAt = pr.state === 'MERGED' ? pr.mergedAt : pr.closedAt
    if (!resolvedAt) continue

    const latestCommitAt = commitDate(sha, repoFlag)
    if (!latestCommitAt) continue

    facts.push({ branch: name, prNumber: pr.number, prState: pr.state, resolvedAt, latestCommitAt })
  }
  return facts
}

function ensureLabelExists(repoFlag: string, name: string, description: string): void {
  const existing =
    shSoftJson<Array<{ name: string }>>(['gh', 'label', 'list', '-R', repoFlag, '--json', 'name', '--limit', '200']) ??
    []
  if (existing.some((l) => l.name === name)) return
  shSoft(['gh', 'label', 'create', name, '-R', repoFlag, '--color', 'B60205', '--description', description])
}

function commentIdFromUrl(url: string): string | null {
  const match = url.match(/issuecomment-(\d+)/)
  return match ? (match[1] as string) : null
}

function flagDeadBranchPush(finding: DeadBranchPush, repoFlag: string): void {
  shSoft(['gh', 'pr', 'edit', String(finding.prNumber), '-R', repoFlag, '--add-label', DEAD_BRANCH_LABEL])

  const body = [
    DEAD_BRANCH_MARKER,
    '**Dead-branch push detected by `vinaya audit`.**',
    '',
    `Branch \`${finding.branch}\` has a ${finding.prState} PR (#${finding.prNumber}, resolved ${finding.resolvedAt}), ` +
      `but its remote tip commit is dated ${finding.latestCommitAt} — after that resolution. ` +
      'This is a notification, not a merge gate — nothing was reverted or mutated.'
  ].join('\n')

  const prJson = shSoftJson<{ comments: { body: string; url: string }[] }>([
    'gh',
    'pr',
    'view',
    String(finding.prNumber),
    '-R',
    repoFlag,
    '--json',
    'comments'
  ])
  const existing = prJson?.comments.find((c) => c.body.includes(DEAD_BRANCH_MARKER))
  const existingId = existing ? commentIdFromUrl(existing.url) : null

  if (existingId) {
    shSoft(['gh', 'api', `repos/${repoFlag}/issues/comments/${existingId}`, '-X', 'PATCH', '-F', 'body=@-'], body)
  } else {
    shSoft(['gh', 'pr', 'comment', String(finding.prNumber), '-R', repoFlag, '--body-file', '-'], body)
  }
}

type DeadBranchAuditResult = { scanned: number; findings: DeadBranchPush[] }

function runDeadBranchAudit(repoFlag: string): DeadBranchAuditResult {
  try {
    const facts = gatherDeadBranchFacts(repoFlag)
    const findings = findDeadBranchPushes(facts)
    if (findings.length > 0) {
      ensureLabelExists(repoFlag, DEAD_BRANCH_LABEL, DEAD_BRANCH_LABEL_DESCRIPTION)
      for (const finding of findings) flagDeadBranchPush(finding, repoFlag)
    }
    return { scanned: facts.length, findings }
  } catch (err) {
    process.stdout.write(
      `[vinaya audit] dead-branch scan error (never-red, reporting only): ${(err as Error).message}\n`
    )
    return { scanned: 0, findings: [] }
  }
}

// ---------------------------------------------------------------------------
// Direct-main-push detection — a real pass/fail.
// ---------------------------------------------------------------------------
type AssociatedPr = { number: number; merged_at: string | null }

function fetchAssociatedMergedPrs(sha: string, repoFlag: string): number[] {
  const out = sh(['gh', 'api', `repos/${repoFlag}/commits/${sha}/pulls`])
  const prs: AssociatedPr[] = JSON.parse(out)
  return prs.filter((pr) => pr.merged_at !== null).map((pr) => pr.number)
}

// `commits/{sha}/pulls` association can lag a merge by tens of seconds —
// confirmed live against a real merge commit that read `[]` 15s post-merge
// and only picked up the association on a later query. A single-shot read
// misreads that lag as a genuine direct push. Bounded poll: break out the
// instant an association appears; after the ceiling, fall through to
// today's behavior unchanged (treat as direct-push, open the incident).
const DIRECT_PUSH_POLL_ATTEMPTS = 6
const DIRECT_PUSH_POLL_DELAY_MS = 20_000

async function pollAssociatedMergedPrs(
  sha: string,
  repoFlag: string,
  fetch: (sha: string, repoFlag: string) => number[],
  attempts: number,
  delayMs: number,
  sleep: (ms: number) => Promise<void>
): Promise<number[]> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const prs = fetch(sha, repoFlag)
    if (prs.length > 0) return prs
    if (attempt < attempts) await sleep(delayMs)
  }
  return []
}

function incidentAlreadyOpen(sha: string, repoFlag: string): boolean {
  const out = sh([
    'gh',
    'issue',
    'list',
    '-R',
    repoFlag,
    '--label',
    DIRECT_PUSH_LABEL,
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

function openDirectPushIncident(sha: string, repoFlag: string): void {
  ensureLabelExists(repoFlag, DIRECT_PUSH_LABEL, DIRECT_PUSH_LABEL_DESCRIPTION)
  if (incidentAlreadyOpen(sha, repoFlag)) {
    console.error(`[vinaya audit] incident already open for ${sha} — not duplicating.`)
    return
  }

  const body = [
    DIRECT_PUSH_MARKER,
    '**Direct push to `main` detected — no associated merged PR.**',
    '',
    `Commit \`${sha}\` landed on \`main\` but the commits→pulls association API reports no merged pull request that introduced it.`,
    '',
    'This is a detection-only finding — nothing was reverted or mutated.'
  ].join('\n')

  sh([
    'gh',
    'issue',
    'create',
    '-R',
    repoFlag,
    '--title',
    `Direct push to main detected: ${sha.slice(0, 12)}`,
    '--body',
    body,
    '--label',
    DIRECT_PUSH_LABEL
  ])
}

async function runDirectMainPushCheck(
  sha: string,
  repoFlag: string,
  deps: AuditDeps
): Promise<{ verdict: 'legitimate' | 'direct-push'; mergedPrNumber?: number }> {
  const associatedMergedPrNumbers = await pollAssociatedMergedPrs(
    sha,
    repoFlag,
    deps.fetchAssociatedMergedPrs ?? fetchAssociatedMergedPrs,
    deps.pollAttempts ?? DIRECT_PUSH_POLL_ATTEMPTS,
    deps.pollDelayMs ?? DIRECT_PUSH_POLL_DELAY_MS,
    deps.sleep ?? defaultSleep
  )
  const result = checkDirectMainPush({ sha, associatedMergedPrNumbers })
  if (result.verdict === 'direct-push') {
    ;(deps.openDirectPushIncident ?? openDirectPushIncident)(sha, repoFlag)
    return { verdict: 'direct-push' }
  }
  return { verdict: 'legitimate', mergedPrNumber: result.mergedPrNumber }
}

// ---------------------------------------------------------------------------
// vinaya audit
// ---------------------------------------------------------------------------
function parseSha(args: string[]): string | null {
  for (const a of args) {
    const m = a.match(/^--sha=(.+)$/)
    if (m) return m[1] as string
  }
  return null
}

type OnlyMode = 'dead-branches' | 'direct-push' | null

function parseOnly(args: string[]): OnlyMode {
  for (const a of args) {
    const m = a.match(/^--only=(dead-branches|direct-push)$/)
    if (m) return m[1] as OnlyMode
  }
  return null
}

export async function runAudit(args: string[], deps: AuditDeps): Promise<number> {
  const jsonOutput = args.includes('--json')
  const only = parseOnly(args)

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya audit` from inside your repo.')
    return 1
  }
  if (!repo.owner || !repo.repo) {
    console.error('Error: could not resolve a GitHub owner/repo from the `origin` remote.')
    return 1
  }
  const repoFlag = `${repo.owner}/${repo.repo}`
  const sha = parseSha(args) ?? sh(['git', 'rev-parse', 'HEAD'])

  const deadBranch = only === 'direct-push' ? { scanned: 0, findings: [] } : runDeadBranchAudit(repoFlag)
  const directPush = only === 'dead-branches' ? null : await runDirectMainPushCheck(sha, repoFlag, deps)

  const failed = directPush?.verdict === 'direct-push'

  if (jsonOutput) {
    printJson({
      deadBranchAudit: only === 'direct-push' ? null : { scanned: deadBranch.scanned, findings: deadBranch.findings },
      directMainPush: directPush ? { sha, ...directPush } : null
    })
  } else {
    process.stdout.write('vinaya audit\n\n')
    if (only !== 'direct-push') {
      process.stdout.write(
        `· [dead-branch-push] task branches scanned: ${deadBranch.scanned}, flagged: ${deadBranch.findings.length}\n`
      )
      for (const f of deadBranch.findings) {
        process.stdout.write(
          `  ⚠ ${f.branch} — PR #${f.prNumber} (${f.prState}) resolved ${f.resolvedAt}, tip commit ${f.latestCommitAt}\n`
        )
      }
    }
    if (directPush) {
      if (directPush.verdict === 'legitimate') {
        process.stdout.write(
          `✓ [direct-main-push] ${sha} is legitimate — introduced by merged PR #${directPush.mergedPrNumber}.\n`
        )
      } else {
        process.stdout.write(`✗ [direct-main-push] VIOLATION: ${sha} has no associated merged PR.\n`)
      }
    }
  }

  return failed ? 1 : 0
}

export async function auditCommand(args: string[]): Promise<void> {
  process.exit(await runAudit(args, realDeps()))
}
