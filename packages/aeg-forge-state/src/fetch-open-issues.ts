/**
 * Open-issues-by-iteration-label fetch — the single implementation of the
 * "which Issues are still open under `vinaya/iteration:<slug>`?" fact.
 *
 * One implementation per fact (D-081 discipline); do not re-implement.
 *
 * Read-only, always (AEG D-029). No writes, no labels, no comments.
 *
 * Lives in `@atta/aeg-forge-state`, not `@atta/aeg-core` (aeg-core-purity
 * fix, #521) — `@atta/aeg-core/src` is zero-I/O (#372, #382, #506) and this
 * module performs `@octokit/graphql` I/O. Re-exported from `@atta/aeg-core`
 * for every existing call site that imports it from there.
 */

import { graphql } from '@octokit/graphql'
import type { ForgeIssue } from '@atta/aeg-types'
import { iterationLabel } from './labels'

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
    ${toAlias(slug)}: issues(states: [OPEN], labels: [${JSON.stringify(iterationLabel(slug))}], first: 100) {
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
