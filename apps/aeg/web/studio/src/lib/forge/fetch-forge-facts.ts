/**
 * Public entry point for the local GitHub read adapter.
 *
 * Given a list of tasks for an iteration, return a `Map<TaskId, ForgeFacts>`
 * matching the `@atta/aeg-core` contract. One batched GraphQL query covers
 * all tasks (issue + ref + latest PR per task, aliased) — rate-limit-friendly
 * and avoids aggregating REST `/reviews` for `reviewDecision`.
 *
 * Read-only, always (AEG D-029). No writes, no labels, no comments.
 *
 * Graceful degradation contract:
 *   - No token discoverable → returns `{ facts: empty, unavailable: true }`.
 *   - Network error / 401 / 403 / 5xx → same.
 *   - Tasks with no Issue number (`null`) are omitted from the query and the
 *     map; `deriveIteration` treats absent entries as `backlog`.
 *
 * SERVER-ONLY. Pulls `node:child_process` transitively via `./github-token`.
 */

import { graphql } from '@octokit/graphql'
import type { ForgeFacts } from '@atta/aeg-core'
import { resolveGithubToken } from './github-token'
import { mapForgeFacts } from './map-forge-facts'
import type { FetchForgeFactsInput, ForgeFactsSnapshot, RawTaskFacts, TaskRef } from './types'

/** Branch ref convention: `task/<iteration>/<id>` (iterations/README.md). */
export function buildBranchName(iteration: string, taskId: string): string {
  return `task/${iteration}/${taskId}`
}

export async function fetchForgeFacts(input: FetchForgeFactsInput): Promise<ForgeFactsSnapshot> {
  const token = await resolveGithubToken(input.token)
  if (!token) {
    return {
      facts: new Map(),
      unavailable: true,
      reason: 'No GitHub token available (set GITHUB_TOKEN/GH_TOKEN or `gh auth login`).'
    }
  }

  const queriedTasks = input.tasks.filter((t): t is TaskRef & { issue: number } => t.issue !== null)
  if (queriedTasks.length === 0) {
    return { facts: new Map(), unavailable: false }
  }

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const query = buildBatchQuery(input.iteration, queriedTasks)
  let response: BatchResponse
  try {
    response = await client<BatchResponse>(query, { owner: input.owner, repo: input.repo })
  } catch (err) {
    return {
      facts: new Map(),
      unavailable: true,
      reason: `GitHub query failed: ${describeError(err)}`
    }
  }

  const facts = new Map<string, ForgeFacts>()
  if (!response.repository) {
    return {
      facts,
      unavailable: true,
      reason: `Repository ${input.owner}/${input.repo} not visible to this token.`
    }
  }

  for (const task of queriedTasks) {
    const alias = aliasFor(task.id)
    const raw = extractRawFromResponse(response.repository, alias)
    const mapped = mapForgeFacts(raw)
    if (mapped) facts.set(task.id, mapped)
  }

  return { facts, unavailable: false }
}

// ---------- internal: GraphQL query construction ----------------------------

/**
 * Build one batched GraphQL query with three aliased sub-queries per task:
 *   <alias>_issue   — issue.state, assignees count, labels
 *   <alias>_ref     — ref existence for refs/heads/task/<iter>/<id>
 *   <alias>_prs     — latest PR with that head branch (any state)
 *
 * Costs ~3 nodes per task. For 8 tasks that's ~24 nodes / 1 HTTP call;
 * comfortably under GitHub's per-hour points budget (default 5000).
 */
function buildBatchQuery(iteration: string, tasks: Array<TaskRef & { issue: number }>): string {
  const perTask = tasks
    .map((task) => {
      const a = aliasFor(task.id)
      const branch = buildBranchName(iteration, task.id)
      // String interpolation here is safe because aliases pass `aliasFor`
      // (alphanum + underscore only) and the branch is escaped via JSON.stringify.
      return `
    ${a}_issue: issue(number: ${task.issue}) {
      state
      assignees(first: 1) { totalCount }
      labels(first: 50) { nodes { name } }
    }
    ${a}_ref: ref(qualifiedName: ${JSON.stringify(`refs/heads/${branch}`)}) {
      name
    }
    ${a}_prs: pullRequests(
      first: 1,
      headRefName: ${JSON.stringify(branch)},
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes { state reviewDecision }
    }`
    })
    .join('')

  return `query ForgeFacts($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perTask}
  }
}`
}

/** Stable alias suffix: task ids like `3`, `7a` → `t_3`, `t_7a`. */
function aliasFor(taskId: string): string {
  // Defensive sanitisation; the parser only produces alnum task ids today, but
  // we'd rather drop unexpected chars than emit an invalid GraphQL alias.
  const sanitized = taskId.replace(/[^a-zA-Z0-9_]/g, '_')
  return `t_${sanitized}`
}

type IssueNode = {
  state: 'OPEN' | 'CLOSED'
  assignees: { totalCount: number }
  labels: { nodes: Array<{ name: string }> }
} | null

type RefNode = { name: string } | null

type PrsNode = {
  nodes: Array<{
    state: 'OPEN' | 'CLOSED' | 'MERGED'
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  }>
}

type BatchResponse = {
  repository:
    | (Record<string, IssueNode | RefNode | PrsNode> & {
        // The dynamic aliased fields land here; this index signature keeps the
        // type loose without resorting to `any`.
      })
    | null
}

function extractRawFromResponse(repository: NonNullable<BatchResponse['repository']>, alias: string): RawTaskFacts {
  const issue = repository[`${alias}_issue`] as IssueNode | undefined
  const ref = repository[`${alias}_ref`] as RefNode | undefined
  const prs = repository[`${alias}_prs`] as PrsNode | undefined
  return {
    issue: issue
      ? {
          state: issue.state,
          assigneesCount: issue.assignees.totalCount,
          labels: issue.labels.nodes.map((n) => n.name)
        }
      : null,
    refExists: Boolean(ref && ref.name.length > 0),
    pullRequest: prs && prs.nodes.length > 0 && prs.nodes[0] ? prs.nodes[0] : null
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'unknown error'
}
