/**
 * Thin `gh` CLI shell-out, matching the pattern already used throughout this
 * repo's own `packages/aeg-core/bin/*.ts` scripts (e.g. `open-pr.ts`,
 * `open-issue.ts`) rather than introducing a second forge-access library.
 */

import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Augment PATH so `gh` resolves under macOS Homebrew and the typical install
// locations even when Next/Bun launches with a minimal environment.
const systemEnv = {
  ...process.env,
  PATH: [process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean).join(':')
}

function run(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', env: systemEnv })
}

/**
 * Async sibling of `run()` — matches the `promisify(execFile)` pattern already
 * used in `resolve-repo.ts` / `github-token.ts`. Because `execFileSync` blocks
 * the Node event loop, the sync `run()` serializes every `Promise.allSettled`
 * fan-out that calls it; the async path lets those genuinely overlap.
 *
 * Raise `maxBuffer` above the 1 MB default: `gh issue list --json body
 * --limit 200` can exceed it with long Issue bodies (the sync path inherited
 * the same risk — this path is made safe).
 */
async function runAsync(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('gh', args, {
    encoding: 'utf8',
    env: systemEnv,
    maxBuffer: 16 * 1024 * 1024
  })
  return stdout
}

export function ghApiGet<T>(path: string): T {
  return JSON.parse(run(['api', path])) as T
}

/** Async twin of `ghApiGet` — same request, non-blocking exec. */
export async function ghApiGetAsync<T>(path: string): Promise<T> {
  return JSON.parse(await runAsync(['api', path])) as T
}

export function ghApiPost<T>(path: string, fields: Record<string, string>): T {
  const args = ['api', path]
  for (const [key, value] of Object.entries(fields)) {
    args.push('-f', `${key}=${value}`)
  }
  return JSON.parse(run(args)) as T
}

export function ghApiDelete(path: string): void {
  run(['api', path, '-X', 'DELETE'])
}

export type GhIssue = {
  number: number
  title: string
  body: string | null
  /**
   * Uppercase (aeg-review-gate-v1 task 1 follow-up correction) — `gh issue
   * list --json state` returns GitHub's GraphQL enum casing (`OPEN`/
   * `CLOSED`), not the lowercase REST-style casing `fetch-milestone.ts`'s
   * `GhMilestone.state` genuinely gets from `gh api .../milestones` (a
   * different endpoint, different casing convention). This field was
   * previously mistyped lowercase — latent, since no caller compared
   * against it until `list-issue-milestones.ts`'s open-Issues filter did
   * and silently matched nothing (confirmed live against `gh issue list`'s
   * real output before landing this filter).
   */
  state: 'OPEN' | 'CLOSED'
  labels: Array<{ name: string }>
  /** GitHub-native milestone attachment, or `null` when unattached (aeg-review-gate-v1 task 1 follow-up). */
  milestone: { title: string } | null
}

/** Single source for the `gh issue list` arg vector shared by the sync and
 * async variants below — the `--json` field list and `--limit` never drift. */
function issueListByLabelArgs(owner: string, repo: string, label: string): string[] {
  return [
    'issue',
    'list',
    '--repo',
    `${owner}/${repo}`,
    '--label',
    label,
    '--state',
    'all',
    '--json',
    'number,title,body,state,labels,milestone',
    '--limit',
    '200'
  ]
}

export function ghIssueListByLabel(owner: string, repo: string, label: string): GhIssue[] {
  return JSON.parse(run(issueListByLabelArgs(owner, repo, label))) as GhIssue[]
}

/** Async twin of `ghIssueListByLabel` — identical arg vector, non-blocking exec. */
export async function ghIssueListByLabelAsync(owner: string, repo: string, label: string): Promise<GhIssue[]> {
  return JSON.parse(await runAsync(issueListByLabelArgs(owner, repo, label))) as GhIssue[]
}

/** Deduping union of `issues`, keyed by Issue number, preserving first-seen order. */
function dedupeByNumber(issues: GhIssue[]): GhIssue[] {
  const byNumber = new Map<number, GhIssue>()
  for (const issue of issues) if (!byNumber.has(issue.number)) byNumber.set(issue.number, issue)
  return [...byNumber.values()]
}

/**
 * Issues carrying ANY of `labels` — one query per label, unioned and deduped.
 *
 * `gh issue list` treats repeated `--label` flags as AND, so an OR needs
 * separate calls — the general primitive any multi-label query needs,
 * independent of why the caller is passing more than one label.
 */
export function ghIssueListByAnyLabel(owner: string, repo: string, labels: readonly string[]): GhIssue[] {
  return dedupeByNumber(labels.flatMap((l) => ghIssueListByLabel(owner, repo, l)))
}

/** Async twin of `ghIssueListByAnyLabel` — queries run concurrently. */
export async function ghIssueListByAnyLabelAsync(
  owner: string,
  repo: string,
  labels: readonly string[]
): Promise<GhIssue[]> {
  const perLabel = await Promise.all(labels.map((l) => ghIssueListByLabelAsync(owner, repo, l)))
  return dedupeByNumber(perLabel.flat())
}
