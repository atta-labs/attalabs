/**
 * Live token-ledger fetch (aeg-forge-state-v1 task 4b, #445) — the I/O half
 * of the live-read mechanism. `@atta/aeg-core`'s
 * `aggregateTaskTokenRows`/`parseTokenReportEntries`/`parseTokensLines` are
 * pure; this file gathers the PR bodies + comments they parse.
 *
 * Source: every MERGED PR on the task's own branch (`task/<tranche>/<id>`)
 * — the Developer's "Token report" entries (one per push) live in the PR
 * body, and the Reviewer's/Security's `Tokens: …` verdict lines live in that
 * same PR's comments (a verdict is posted on the PR under review, never on
 * some other PR).
 *
 * The Planner's own `Tokens: planning — …` report (plan PR body / planning
 * report) is deliberately NOT folded in here. A first implementation tried
 * resolving "the plan PR for this task" via the task Issue's
 * `CROSS_REFERENCED_EVENT` timeline (the same idiom `fetch-provenance.ts`
 * uses for its own cross-reference fallback) — confirmed live, against this
 * repo's real `aeg-forge-state-v1` tranche, that this produces WRONG
 * (not just missing) data: GitHub creates a cross-reference for ANY PR
 * whose body merely *mentions* `#<issue>` in passing prose (this repo's own
 * "Dependency rationale" / "Depends-on" sections constantly cite other
 * tasks' issue numbers), so task 5's ledger picked up task 1's and task 3b's
 * Developer rows. `fetch-provenance.ts` can filter this false-positive rate
 * because a provenance block carries its own `Issue: #N` field to check the
 * match against; a "Token report" entry carries no such field, so there is
 * no equivalent way to confirm a cross-referenced PR's report actually
 * belongs to this task. Shipping the cross-reference source would be
 * actively wrong, not merely incomplete — worse than the gap it would have
 * filled (per real-world evidence, no plan PR in this repo's history has
 * ever carried a `Tokens: planning` line at all — see 4b's own research).
 * Scoped down accordingly; flagged in the task 4b report for Principal
 * review rather than silently narrowed.
 *
 * Read-only, always (AEG). No writes, no labels, no comments.
 *
 * Graceful degradation contract (mirrors `fetchForgeFacts`):
 *   - No token → returns `{ ledgers: empty, unavailable: true }`.
 *   - Network error / 401 / 403 / 5xx → same.
 *   - A task with no matching PR at all is simply absent from the map (an
 *     empty array, not an error) — the caller renders that as "no ledger
 *     data for this task", never a fabricated row.
 *
 * SERVER-ONLY. Pulls `node:child_process` transitively via `./github-token`.
 */

import { graphql } from '@octokit/graphql'
import { aggregateTaskTokenRows, buildBranchName, type LedgerRow, type TokenSourcePr } from '@atta/aeg-core'
import { resolveGithubToken } from '@atta/aeg-forge-state'

export type FetchTokenLedgerInput = {
  owner: string
  repo: string
  tranche: string
  tasks: Array<{ id: string; issue: number | null }>
  token?: string
}

export type TokenLedgerSnapshot = {
  /** Task id → every LedgerRow found across that task's own-branch PR(s). Absent key = no merged PR found at all (never fabricated). */
  ledgers: Map<string, LedgerRow[]>
  unavailable: boolean
  reason?: string
}

export async function fetchTrancheTokenLedger(input: FetchTokenLedgerInput): Promise<TokenLedgerSnapshot> {
  const token = await resolveGithubToken(input.token)
  if (!token) {
    return {
      ledgers: new Map(),
      unavailable: true,
      reason: 'No GitHub token available (set GITHUB_TOKEN/GH_TOKEN or `gh auth login`).'
    }
  }

  if (input.tasks.length === 0) {
    return { ledgers: new Map(), unavailable: false }
  }

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })
  const query = buildBatchQuery(input.tranche, input.tasks)

  let response: BatchResponse
  try {
    response = await client<BatchResponse>(query, { owner: input.owner, repo: input.repo })
  } catch (err) {
    return {
      ledgers: new Map(),
      unavailable: true,
      reason: `GitHub query failed: ${describeError(err)}`
    }
  }

  const ledgers = new Map<string, LedgerRow[]>()
  if (!response.repository) {
    return {
      ledgers,
      unavailable: true,
      reason: `Repository ${input.owner}/${input.repo} not visible to this token.`
    }
  }

  for (const task of input.tasks) {
    const alias = aliasFor(task.id)
    const node = response.repository[alias]
    const prNodes = node?.nodes ?? []
    if (prNodes.length === 0) continue
    const prs: TokenSourcePr[] = prNodes.map((pr) => ({
      number: pr.number,
      body: pr.body ?? '',
      comments: pr.comments.nodes.map((c) => c.body)
    }))
    ledgers.set(task.id, aggregateTaskTokenRows(prs))
  }

  return { ledgers, unavailable: false }
}

// ---------- internal: GraphQL query construction ----------------------------

function buildBatchQuery(tranche: string, tasks: FetchTokenLedgerInput['tasks']): string {
  const perTask = tasks
    .map((task) => {
      const a = aliasFor(task.id)
      const branch = buildBranchName(tranche, task.id)
      return `
    ${a}: pullRequests(
      first: 10,
      headRefName: ${JSON.stringify(branch)},
      states: [MERGED],
      orderBy: { field: CREATED_AT, direction: ASC }
    ) {
      nodes { number body comments(first: 100) { nodes { body } } }
    }`
    })
    .join('')

  return `query TokenLedger($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perTask}
  }
}`
}

/** Stable alias suffix: task ids like `3`, `7a`, `4b` → `t_3`, `t_7a`, `t_4b`. */
function aliasFor(taskId: string): string {
  const sanitized = taskId.replace(/[^a-zA-Z0-9_]/g, '_')
  return `t_${sanitized}`
}

type CommentsNode = { nodes: Array<{ body: string }> }
type PrNode = { number: number; body: string | null; comments: CommentsNode }
type PrsNode = { nodes: PrNode[] } | undefined

type BatchResponse = {
  repository: Record<string, PrsNode> | null
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'unknown error'
}
