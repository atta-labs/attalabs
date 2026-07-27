/**
 * Read-only fetch of the latest PR's identity + body for a given task. The
 * **brief lives in the PR body** (`tranche-model.md` §7 — not in the Issue,
 * which holds the Planner's rationale + metadata only). Studio's task-detail
 * view reads it here so the model's "where briefs live" rule is honoured.
 *
 * One small batched GraphQL query covers all tasks in a tranche; callers
 * that only need one task pass a single-element `tasks` array. The query keys
 * each PR by `headRefName = task/<tranche>/<id>` (the same convention
 * `fetchForgeFacts` uses) and returns the most recent PR per branch.
 *
 * Graceful degradation contract (mirrors `fetchForgeFacts`):
 *   - No token → returns `{ briefs: empty, unavailable: true }`.
 *   - Network error / 401 / 403 / 5xx → same.
 *   - Tasks without a matching branch / PR are simply absent from the map
 *     (the detail view renders the "not yet dispatched" state).
 *
 * SERVER-ONLY. Pulls `node:child_process` transitively via `./github-token`.
 */

import { graphql } from '@octokit/graphql'
import { buildBranchName } from '@atta/aeg-core'
import { resolveGithubToken } from '@atta/aeg-forge-state'

export type PullRequestBrief = {
  /** PR number on the forge. */
  number: number
  /** Web URL for human navigation. */
  url: string
  /** PR state — used by the detail view to colour the badge. */
  state: 'open' | 'closed' | 'merged'
  /** The PR description / body markdown — the canonical brief home. */
  body: string
}

export type FetchPullRequestBriefsInput = {
  owner: string
  repo: string
  tranche: string
  taskIds: string[]
  token?: string
}

export type PullRequestBriefSnapshot = {
  briefs: Map<string, PullRequestBrief>
  unavailable: boolean
  reason?: string
}

export async function fetchPullRequestBriefs(input: FetchPullRequestBriefsInput): Promise<PullRequestBriefSnapshot> {
  const token = await resolveGithubToken(input.token)
  if (!token) {
    return {
      briefs: new Map(),
      unavailable: true,
      reason: 'No GitHub token available (set GITHUB_TOKEN/GH_TOKEN or `gh auth login`).'
    }
  }

  if (input.taskIds.length === 0) {
    return { briefs: new Map(), unavailable: false }
  }

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })
  const query = buildBatchQuery(input.tranche, input.taskIds)

  let response: BatchResponse
  try {
    response = await client<BatchResponse>(query, { owner: input.owner, repo: input.repo })
  } catch (err) {
    return {
      briefs: new Map(),
      unavailable: true,
      reason: `GitHub query failed: ${describeError(err)}`
    }
  }

  const briefs = new Map<string, PullRequestBrief>()
  if (!response.repository) {
    return {
      briefs,
      unavailable: true,
      reason: `Repository ${input.owner}/${input.repo} not visible to this token.`
    }
  }

  for (const taskId of input.taskIds) {
    const alias = aliasFor(taskId)
    const node = response.repository[alias]
    const pr = node?.nodes?.[0]
    if (!pr) continue
    briefs.set(taskId, {
      number: pr.number,
      url: pr.url,
      state: mapPrState(pr.state),
      body: pr.body ?? ''
    })
  }

  return { briefs, unavailable: false }
}

// ---------- internal -------------------------------------------------------

function buildBatchQuery(tranche: string, taskIds: string[]): string {
  const perTask = taskIds
    .map((taskId) => {
      const a = aliasFor(taskId)
      const branch = buildBranchName(tranche, taskId)
      return `
    ${a}: pullRequests(
      first: 1,
      headRefName: ${JSON.stringify(branch)},
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes { number url state body }
    }`
    })
    .join('')

  return `query PullRequestBriefs($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perTask}
  }
}`
}

function aliasFor(taskId: string): string {
  const sanitized = taskId.replace(/[^a-zA-Z0-9_]/g, '_')
  return `t_${sanitized}`
}

function mapPrState(state: 'OPEN' | 'CLOSED' | 'MERGED'): PullRequestBrief['state'] {
  if (state === 'OPEN') return 'open'
  if (state === 'MERGED') return 'merged'
  return 'closed'
}

type PrsNode = {
  nodes: Array<{
    number: number
    url: string
    state: 'OPEN' | 'CLOSED' | 'MERGED'
    body: string | null
  }>
}

type BatchResponse = {
  repository: (Record<string, PrsNode | undefined> | null) | null
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'unknown error'
}
