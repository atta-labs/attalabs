/**
 * Open-issues-by-iteration-label fetch — the single implementation of the
 * "which Issues are still open under `iteration:<slug>`?" fact.
 *
 * Moved here from `packages/aeg-core/bin/verify-coherence.ts` (task 28, #372
 * bundled finding) so Studio's server components can call it without pulling
 * in that CLI's top-level `process.chdir` side effect. `verify-coherence.ts`
 * imports it from here — same direction as its existing
 * `fetchForgeFacts`/`resolveRepo` imports. One implementation per fact
 * (D-081 discipline); do not re-implement.
 *
 * Read-only, always (AEG D-029). No writes, no labels, no comments.
 */

import { graphql } from '@octokit/graphql'
import type { ForgeIssue } from '@atta/aeg-core'

type LabeledIssuesResponse = {
  repository: Record<
    string,
    { nodes: Array<{ number: number; body: string; labels: { nodes: Array<{ name: string }> } }> } | null
  > | null
}

/**
 * Fetch open issues (number + body + labels) for each active iteration slug
 * in one batched query. Returns a Map from slug → ForgeIssue[].
 *
 * Extended for R1 (D-078 rationale-completeness gate — aeg-governance-hardening
 * task 1) to carry `body`/`labels` alongside `number`; T2 (orphan-task) only
 * needs the number, R1 needs the body to run `checkIssueRationale` against.
 * One batched query, no per-issue round-trips, for both checks.
 */
export async function fetchOpenIssuesByLabel(
  slugs: string[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<string, ForgeIssue[]>> {
  const result = new Map<string, ForgeIssue[]>()
  if (slugs.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  // GraphQL alias: replace hyphens with underscores (hyphens are invalid in aliases)
  const toAlias = (slug: string) => `iter_${slug.replace(/-/g, '_')}`

  const perSlug = slugs
    .map(
      (slug) => `
    ${toAlias(slug)}: issues(states: [OPEN], labels: [${JSON.stringify(`iteration:${slug}`)}], first: 100) {
      nodes { number body labels(first: 20) { nodes { name } } }
    }`
    )
    .join('')

  const query = `query LabeledIssues($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perSlug}
  }
}`

  let response: LabeledIssuesResponse
  try {
    response = await client<LabeledIssuesResponse>(query, { owner, repo })
  } catch {
    return result
  }

  if (!response.repository) return result

  for (const slug of slugs) {
    const conn = response.repository[toAlias(slug)]
    const issues: ForgeIssue[] =
      conn?.nodes?.map((n) => ({
        number: n.number,
        body: n.body ?? '',
        labels: n.labels?.nodes?.map((l) => l.name) ?? []
      })) ?? []
    result.set(slug, issues)
  }

  return result
}

/**
 * Open issues carrying no `iteration:*` label — the backlog view's data
 * source (Studio task 2, #498). A different fact from `fetchOpenIssuesByLabel`
 * above ("under iteration X" vs. "under no iteration"): GitHub's GraphQL
 * `labels:` filter argument has no pattern-exclusion capability, so this is a
 * repo-wide query filtered client-side, not a parameterization of the
 * existing per-slug function (D-081 — one implementation per fact).
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
