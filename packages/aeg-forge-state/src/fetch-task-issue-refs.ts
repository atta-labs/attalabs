/**
 * Batched resolver for `checkClosesN`'s reverse-direction check (D-069
 * Layer 1 reverse, `@atta/aeg-core`'s `coherence-checks.ts`) — given the
 * Issue numbers a PR body's `Closes #N` references, resolves each to its
 * AEG task identity (`resolveTaskIssueRef`) if it's a real task Issue, or
 * `null` if it's an ordinary (non-task) Issue.
 *
 * One batched GraphQL query aliases `issue(number: N)` per referenced
 * number — a `Closes #N` line rarely names more than one or two Issues, but
 * this stays a single HTTP round trip regardless of how many, mirroring
 * `fetch-forge-facts.ts`'s per-task aliasing discipline (no per-issue loop
 * of separate `gh`/API calls).
 *
 * Fail-open by design, matching every other forge-dependent fetch in this
 * package: no token, or any network/API error, resolves every requested
 * number to "unresolved" (absent from the returned map) rather than
 * throwing — the caller (`checkClosesN`) treats an absent entry as
 * "can't confirm this is a task Issue," which skips the reverse check for
 * that Issue rather than false-failing a PR on a forge outage.
 */

import { graphql } from '@octokit/graphql'
import type { TaskIssueRef } from '@atta/aeg-types'
import { resolveGithubToken } from './github-token'
import { resolveTaskIssueRef } from './list-tasks'

export async function fetchTaskIssueRefs(
  owner: string,
  repo: string,
  issueNumbers: number[],
  token?: string
): Promise<Map<number, TaskIssueRef | null>> {
  const result = new Map<number, TaskIssueRef | null>()
  if (issueNumbers.length === 0) return result

  const resolvedToken = await resolveGithubToken(token)
  if (!resolvedToken) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${resolvedToken}` } })

  let response: BatchResponse
  try {
    response = await client<BatchResponse>(buildQuery(issueNumbers), { owner, repo })
  } catch {
    return result
  }

  if (!response.repository) return result

  for (const n of issueNumbers) {
    const node = response.repository[aliasFor(n)]
    if (!node) continue
    const labels = node.labels.nodes.map((l) => l.name)
    result.set(n, resolveTaskIssueRef(node.title, labels))
  }
  return result
}

/** Stable alias per issue number — `123` → `i_123`. Numbers only match
 * `\d+` (extracted via `checkClosesN`'s own `Closes #(\d+)` pattern), so no
 * sanitisation beyond the prefix is needed for a valid GraphQL alias. */
function aliasFor(n: number): string {
  return `i_${n}`
}

function buildQuery(issueNumbers: number[]): string {
  const perIssue = issueNumbers
    .map(
      (n) => `
    ${aliasFor(n)}: issue(number: ${n}) {
      title
      labels(first: 50) { nodes { name } }
    }`
    )
    .join('')

  return `query TaskIssueRefs($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perIssue}
  }
}`
}

type IssueNode = { title: string; labels: { nodes: Array<{ name: string }> } } | null

type BatchResponse = {
  repository: Record<string, IssueNode> | null
}
