/**
 * Thin `gh` CLI shell-out, matching the pattern already used throughout this
 * repo's own `packages/aeg-core/bin/*.ts` scripts (e.g. `open-pr.ts`,
 * `open-issue.ts`) rather than introducing a second forge-access library.
 */

import { execFileSync } from 'node:child_process'

function run(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8' })
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
  state: 'open' | 'closed'
  labels: Array<{ name: string }>
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
      'number,title,body,state,labels',
      '--limit',
      '200'
    ])
  ) as GhIssue[]
}
