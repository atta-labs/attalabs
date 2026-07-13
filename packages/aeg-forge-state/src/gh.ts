/**
 * Thin `gh` CLI shell-out, matching the pattern already used throughout this
 * repo's own `packages/aeg-core/bin/*.ts` scripts (e.g. `open-pr.ts`,
 * `open-issue.ts`) rather than introducing a second forge-access library.
 */

import { execFileSync } from 'node:child_process'

// Augment PATH so `gh` resolves under macOS Homebrew and the typical install
// locations even when Next/Bun launches with a minimal environment.
const systemEnv = {
  ...process.env,
  PATH: [process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean).join(':')
}

function run(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', env: systemEnv })
}

export function ghApiGet<T>(path: string): T {
  return JSON.parse(run(['api', path])) as T
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

export function ghIssueListByLabel(owner: string, repo: string, label: string): GhIssue[] {
  return JSON.parse(
    run([
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
    ])
  ) as GhIssue[]
}
