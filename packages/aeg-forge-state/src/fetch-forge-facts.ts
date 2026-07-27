/**
 * Public entry point for the local GitHub read adapter.
 *
 * Given a list of tasks for a tranche, return a `Map<TaskId, ForgeFacts>`
 * matching the `ForgeFacts` contract (`@atta/aeg-types`). One batched GraphQL
 * query covers all tasks (issue + ref + latest PR per task, aliased) —
 * rate-limit-friendly and avoids aggregating REST `/reviews` for
 * `reviewDecision`.
 *
 * Read-only, always. No writes, no labels, no comments.
 *
 * Graceful degradation contract:
 *   - No token discoverable → returns `{ facts: empty, unavailable: true }`.
 *   - Network error / 401 / 403 / 5xx → same.
 *   - Tasks with no Issue number (`null`) are omitted from the query and the
 *     map; `deriveTranche` treats absent entries as `todo`.
 *
 * SERVER-ONLY. Pulls `node:child_process` transitively via
 * `resolveGithubToken`.
 *
 * Lives in `@atta/aeg-forge-state`, not `@atta/aeg-core` (aeg-core-purity
 * fix, #521) — `@atta/aeg-core/src` is zero-I/O (#372, #382, #506) and this
 * module performs `@octokit/graphql` I/O. Re-exported from `@atta/aeg-core`
 * for every existing call site that imports it from there.
 */

import { graphql } from '@octokit/graphql'
import type {
  FetchForgeFactsInput,
  ForgeFacts,
  ForgeFactsSnapshot,
  PrRef,
  RawTaskFacts,
  TaskRef
} from '@atta/aeg-types'
import { resolveGithubToken } from './github-token'
import { trancheLabelsToQuery } from './labels'
import { mapForgeFacts } from './map-forge-facts'

/** Branch ref convention: `task/<tranche>/<id>` (tranche-model.md). */
export function buildBranchName(tranche: string, taskId: string): string {
  return `task/${tranche}/${taskId}`
}

/**
 * Discover tranche task refs from the forge by querying Issues labeled
 * `vinaya/tranche:<slug>`. Returns an empty array when:
 *   - No token is available.
 *   - The label has no issues (e.g. archived tranches that pre-date the label
 *     convention).
 *   - Any network/API error occurs.
 *
 * Callers use this to resolve `#TBD` issue numbers in the topology file;
 * the result is merged with topology refs by the caller's own snapshot logic.
 */
export async function fetchForgeTasksByLabel(input: {
  owner: string
  repo: string
  trancheSlug: string
  token?: string
}): Promise<Array<{ id: string; issue: number }>> {
  const token = await resolveGithubToken(input.token)
  if (!token) return []

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  // One query per accepted label, unioned: mid-rename a tranche's Issues can be
  // split across the canonical and the superseded name, and either half alone
  // is a wrong answer that reads as "this tranche has no tasks".
  const responses = await Promise.all(
    trancheLabelsToQuery(input.trancheSlug).map(async (labelName) => {
      try {
        return await client<LabelIssuesResponse>(LABEL_ISSUES_QUERY, {
          owner: input.owner,
          repo: input.repo,
          label: labelName
        })
      } catch {
        return null
      }
    })
  )

  const refs: Array<{ id: string; issue: number }> = []
  const seen = new Set<number>()
  for (const response of responses) {
    for (const node of response?.repository?.issues?.nodes ?? []) {
      if (seen.has(node.number)) continue
      const taskId = parseTaskIdFromTitle(node.title, input.trancheSlug)
      if (taskId === null) continue
      seen.add(node.number)
      refs.push({ id: taskId, issue: node.number })
    }
  }
  return refs
}

const LABEL_ISSUES_QUERY = `
  query TrancheIssues($owner: String!, $repo: String!, $label: String!) {
    repository(owner: $owner, name: $repo) {
      issues(first: 50, labels: [$label], states: [OPEN, CLOSED]) {
        nodes {
          number
          title
        }
      }
    }
  }
`

type LabelIssuesResponse = {
  repository: {
    issues: { nodes: Array<{ number: number; title: string }> }
  } | null
}

/**
 * Parse the task ID from the AEG issue title convention:
 *   `[<tranche-slug>] <task-id> — <title>`
 *
 * Returns `null` for titles that do not follow the convention.
 */
function parseTaskIdFromTitle(title: string, trancheSlug: string): string | null {
  const escapedSlug = trancheSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = title.match(new RegExp(`^\\[${escapedSlug}\\]\\s+(\\S+)\\s+[—-]`))
  return match?.[1] ?? null
}

export async function fetchForgeFacts(input: FetchForgeFactsInput): Promise<ForgeFactsSnapshot> {
  const token = await resolveGithubToken(input.token)
  if (!token) {
    return {
      facts: new Map(),
      prRefs: new Map(),
      unavailable: true,
      reason: 'No GitHub token available (set GITHUB_TOKEN/GH_TOKEN or `gh auth login`).'
    }
  }

  const queriedTasks = input.tasks.filter((t): t is TaskRef & { issue: number } => t.issue !== null)
  if (queriedTasks.length === 0) {
    return { facts: new Map(), prRefs: new Map(), unavailable: false }
  }

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const query = buildBatchQuery(input.tranche, queriedTasks)
  let response: BatchResponse
  try {
    response = await client<BatchResponse>(query, { owner: input.owner, repo: input.repo })
  } catch (err) {
    return {
      facts: new Map(),
      prRefs: new Map(),
      unavailable: true,
      reason: `GitHub query failed: ${describeError(err)}`
    }
  }

  const facts = new Map<string, ForgeFacts>()
  const prRefs = new Map<string, PrRef>()
  if (!response.repository) {
    return {
      facts,
      prRefs,
      unavailable: true,
      reason: `Repository ${input.owner}/${input.repo} not visible to this token.`
    }
  }

  for (const task of queriedTasks) {
    const alias = aliasFor(task.id)
    const raw = extractRawFromResponse(response.repository, alias)
    const mapped = mapForgeFacts(raw)
    if (mapped) facts.set(task.id, mapped)
    // A ClosedEvent closer can be a Commit, in which case the `... on
    // PullRequest` fragment yields an empty object — guard on `number`.
    const pr = raw.pullRequest
    if (pr && typeof pr.number === 'number' && typeof pr.url === 'string') {
      prRefs.set(task.id, { number: pr.number, url: pr.url, state: pr.state })
    }
  }

  return { facts, prRefs, unavailable: false }
}

// ---------- internal: GraphQL query construction ----------------------------

/**
 * Build one batched GraphQL query with three aliased sub-queries per task:
 *   <alias>_issue   — issue.state, assignees count, labels, closing PR via timelineItems
 *   <alias>_ref     — ref existence for refs/heads/task/<tranche>/<id>
 *   <alias>_prs     — latest PR with that head branch (fallback when no closing PR)
 *
 * The issue sub-query includes timelineItems(CLOSED_EVENT) to surface the PR
 * that actually closed the issue — this is the primary source for prState/merged.
 * It queries `last: 1`, not `first: 1`: an issue closed once (e.g. manually,
 * `closer: null`), reopened, then closed again by a real merged PR has two
 * ClosedEvents, and only the last one reflects reality (#524 regression).
 * The branch-based _prs query is kept as a fallback for in-flight tasks whose
 * PR is on the conventionally-named branch but the issue is still open.
 *
 * Costs ~3 nodes per task. For 8 tasks that's ~24 nodes / 1 HTTP call;
 * comfortably under GitHub's per-hour points budget (default 5000).
 */
function buildBatchQuery(tranche: string, tasks: Array<TaskRef & { issue: number }>): string {
  const perTask = tasks
    .map((task) => {
      const a = aliasFor(task.id)
      const branch = buildBranchName(tranche, task.id)
      // String interpolation here is safe because aliases pass `aliasFor`
      // (alphanum + underscore only) and the branch is escaped via JSON.stringify.
      return `
    ${a}_issue: issue(number: ${task.issue}) {
      state
      stateReason
      closedAt
      assignees(first: 1) { totalCount }
      labels(first: 50) { nodes { name } }
      timelineItems(last: 1, itemTypes: [CLOSED_EVENT]) {
        nodes {
          ... on ClosedEvent {
            closer {
              ... on PullRequest {
                number
                url
                state
                reviewDecision
                mergedAt
              }
            }
          }
        }
      }
    }
    ${a}_ref: ref(qualifiedName: ${JSON.stringify(`refs/heads/${branch}`)}) {
      name
    }
    ${a}_prs: pullRequests(
      first: 1,
      headRefName: ${JSON.stringify(branch)},
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes { number url state reviewDecision mergedAt }
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

type PrCloserNode = {
  number: number
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  mergedAt: string | null
} | null

type IssueNode = {
  state: 'OPEN' | 'CLOSED'
  /** GitHub's native close reason. `null` while the issue is open. */
  stateReason: 'COMPLETED' | 'NOT_PLANNED' | 'REOPENED' | null
  closedAt: string | null
  assignees: { totalCount: number }
  labels: { nodes: Array<{ name: string }> }
  /**
   * Last CLOSED_EVENT (chronologically) — the PR (or commit) that actually
   * closed the issue, if any. Using `last: 1` (not `first: 1`) matters: an
   * issue can be closed, reopened, then closed again by a real merged PR —
   * `first: 1` would return the stale original ClosedEvent (e.g. `closer:
   * null` from a manual close) instead of the real one. GitHub's GraphQL
   * connections preserve chronological (ascending) order regardless of
   * `first`/`last`, so `last: 1`'s single result still lands at `nodes[0]`.
   */
  timelineItems: {
    nodes: Array<{ closer: PrCloserNode }>
  }
} | null

type RefNode = { name: string } | null

type PrsNode = {
  nodes: Array<{
    number: number
    url: string
    state: 'OPEN' | 'CLOSED' | 'MERGED'
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
    mergedAt: string | null
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

  // Prefer the PR that actually closed the issue (branch-name-independent).
  // Fall back to the branch-named PR for in-flight tasks (open issue, PR open
  // on the task/<tranche>/<id> branch) — and also when a ClosedEvent closer is a
  // Commit, in which case the `... on PullRequest` fragment yields an empty
  // object, not `null`. Guard on `number`/`url` (same shape-check `prRefs`
  // below already applies) so that empty object doesn't win over `branchPr`.
  const rawCloser = issue?.timelineItems?.nodes?.[0]?.closer ?? null
  const closingPr =
    rawCloser && typeof rawCloser.number === 'number' && typeof rawCloser.url === 'string' ? rawCloser : null
  const branchPr = prs && prs.nodes.length > 0 && prs.nodes[0] ? prs.nodes[0] : null

  return {
    issue: issue
      ? {
          state: issue.state,
          stateReason: issue.stateReason,
          closedAt: issue.closedAt ?? null,
          assigneesCount: issue.assignees.totalCount,
          labels: issue.labels.nodes.map((n) => n.name)
        }
      : null,
    refExists: Boolean(ref && ref.name.length > 0),
    pullRequest: closingPr ?? branchPr
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'unknown error'
}
