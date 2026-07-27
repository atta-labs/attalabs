/**
 * Open issues carrying no `vinaya/iteration:*` label — the backlog view's data
 * source (Studio task 2, #498). A different fact from `fetchOpenIssuesByLabel`
 * (`@atta/aeg-core` — "under iteration X" vs. "under no iteration"): GitHub's
 * GraphQL `labels:` filter argument has no pattern-exclusion capability, so
 * this is a repo-wide query filtered client-side, not a parameterization of
 * the existing per-slug function (one implementation per fact).
 *
 * `first: 100`, no pagination — this repo's open-issue count (~30 at
 * authoring time) is well within a single page; re-evaluate if it grows into
 * the hundreds.
 *
 * Also excludes `vinaya/state-object` (task 2 addendum, PR #499 review) —
 * The pinned per-project/root-ecosystem state, ratification queue, and
 * lessons-log Issues (#447-#453) are permanent forge-native storage objects,
 * never meant to be closed and carrying no actionable work, so they don't
 * belong in a backlog-of-open-work view alongside real Issues like #497.
 */

import { hasLabel, projectsFromBody } from '@atta/aeg-forge-state'
import { graphql } from '@octokit/graphql'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'

/**
 * `projects` comes from the Issue body's `**Project:**` field, never from a
 * label — project is a field, not a label (#614 dropped `project:*` outright),
 * and `@atta/aeg-forge-state`'s `projectsFromBody` is the same parser the task
 * surfaces use, so the backlog and the boards agree by construction.
 */
export type BacklogIssue = { number: number; title: string; url: string; labels: string[]; projects: string[] }

/**
 * The backlog fetch result carries a `ForgeStatus` alongside the issues —
 * mirroring `listIterations`'s `{ …, forge }` shape (task 11, #571) — so a
 * consumer can distinguish a genuinely empty backlog (`ok`, `[]`) from a forge
 * failure that produced an empty list (`unreachable`). Without it, a page can't
 * tell "everything is tracked" from "GitHub was unreachable" and would render a
 * failure as truth-shaped emptiness (Studio must not lie by omission).
 *
 * Only `ok` / `unreachable` ever appear here — this is one repo-wide query, not
 * a per-slug fan-out, so there is no `partial` (that state belongs to
 * `listIterations`, which loads many slugs and can lose a subset).
 */
export type BacklogResult = { issues: BacklogIssue[]; forge: ForgeStatus }

type OpenIssuesResponse = {
  repository: {
    issues: {
      nodes: Array<{
        number: number
        title: string
        url: string
        body: string | null
        labels: { nodes: Array<{ name: string }> }
      }>
    }
  } | null
}

export async function fetchOpenIssuesWithoutIterationLabel(
  owner: string,
  repo: string,
  token: string
): Promise<BacklogResult> {
  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const query = `query OpenIssues($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues(states: [OPEN], first: 100) {
      nodes { number title url body labels(first: 20) { nodes { name } } }
    }
  }
}`

  let response: OpenIssuesResponse
  try {
    response = await client<OpenIssuesResponse>(query, { owner, repo })
  } catch (err) {
    // Raw `Error.message` stays in the log, never the UI (graceful-errors rule).
    console.warn(`[fetch-open-issues] backlog query failed: ${(err as Error).message}`)
    return { issues: [], forge: { kind: 'unreachable' } }
  }

  const nodes = response.repository?.issues.nodes ?? []
  const issues = nodes
    .map((n) => ({
      number: n.number,
      title: n.title,
      url: n.url,
      labels: n.labels?.nodes?.map((l) => l.name) ?? [],
      projects: projectsFromBody(n.body ?? '')
    }))
    .filter((issue) => !hasLabel('tranche', issue.labels) && !hasLabel('state-object', issue.labels))
  return { issues, forge: { kind: 'ok' } }
}
