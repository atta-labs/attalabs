/**
 * Open issues carrying no `iteration:*` label — the backlog view's data
 * source (Studio task 2, #498). A different fact from `fetchOpenIssuesByLabel`
 * (`@atta/aeg-core` — "under iteration X" vs. "under no iteration"): GitHub's
 * GraphQL `labels:` filter argument has no pattern-exclusion capability, so
 * this is a repo-wide query filtered client-side, not a parameterization of
 * the existing per-slug function (D-081 — one implementation per fact).
 *
 * `first: 100`, no pagination — this repo's open-issue count (~30 at
 * authoring time) is well within a single page; re-evaluate if it grows into
 * the hundreds.
 *
 * Also excludes `vinaya:state-object` (task 2 addendum, PR #499 review) —
 * D-110's pinned per-project/root-ecosystem state, ratification queue, and
 * lessons-log Issues (#447-#453) are permanent forge-native storage objects,
 * never meant to be closed and carrying no actionable work, so they don't
 * belong in a backlog-of-open-work view alongside real Issues like #497.
 */

import { graphql } from '@octokit/graphql'

export type BacklogIssue = { number: number; title: string; url: string; labels: string[] }

type OpenIssuesResponse = {
  repository: {
    issues: {
      nodes: Array<{ number: number; title: string; url: string; labels: { nodes: Array<{ name: string }> } }>
    }
  } | null
}

export async function fetchOpenIssuesWithoutIterationLabel(
  owner: string,
  repo: string,
  token: string
): Promise<BacklogIssue[]> {
  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const query = `query OpenIssues($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues(states: [OPEN], first: 100) {
      nodes { number title url labels(first: 20) { nodes { name } } }
    }
  }
}`

  let response: OpenIssuesResponse
  try {
    response = await client<OpenIssuesResponse>(query, { owner, repo })
  } catch {
    return []
  }

  const nodes = response.repository?.issues.nodes ?? []
  return nodes
    .map((n) => ({
      number: n.number,
      title: n.title,
      url: n.url,
      labels: n.labels?.nodes?.map((l) => l.name) ?? []
    }))
    .filter(
      (issue) =>
        !issue.labels.some((label) => /^iteration:/.test(label)) && !issue.labels.includes('vinaya:state-object')
    )
}
