import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the squash-merge closer fact-loss bug: GitHub's
 * `ClosedEvent.closer` can be a `Commit` (squash-merge whose message contains
 * `Closes #N`, rather than native PR-auto-close linkage — this repo's own
 * `<!-- AEG:CLOSES:START -->` convention produces exactly this shape). When
 * that happens, the `... on PullRequest { ... }` inline fragment matches
 * nothing and GraphQL returns `{}` — an empty object, not `null` — so
 * `extractRawFromResponse` must not treat it as a valid PR.
 *
 * Mocks `@octokit/graphql` per-task by alias (`t_<id>_issue` / `_ref` /
 * `_prs`), mirroring the shape `buildBatchQuery` emits, following the
 * established mocking pattern in `packages/aeg-core/bin/verify-coherence.test.ts`.
 */

type PrFixture = {
  number: number
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  mergedAt: string | null
}

type TaskFixture = {
  issueState: 'OPEN' | 'CLOSED'
  stateReason: 'COMPLETED' | 'NOT_PLANNED' | 'REOPENED' | null
  closedAt: string | null
  assigneesCount: number
  labels: string[]
  /** `'commit'` simulates a Commit-typed closer — the fragment yields `{}`. */
  closer: PrFixture | 'commit' | null
  branchPr: PrFixture | null
}

let fixtures: Record<string, TaskFixture> = {}

vi.mock('@octokit/graphql', () => ({
  graphql: {
    defaults: () => async (_query: string) => {
      const repository: Record<string, unknown> = {}
      for (const [alias, fx] of Object.entries(fixtures)) {
        repository[`${alias}_issue`] = {
          state: fx.issueState,
          stateReason: fx.stateReason,
          closedAt: fx.closedAt,
          assignees: { totalCount: fx.assigneesCount },
          labels: { nodes: fx.labels.map((name) => ({ name })) },
          timelineItems: {
            nodes: [{ closer: fx.closer === 'commit' ? {} : fx.closer }]
          }
        }
        repository[`${alias}_ref`] = { name: `refs/heads/task/iter/${alias}` }
        repository[`${alias}_prs`] = { nodes: fx.branchPr ? [fx.branchPr] : [] }
      }
      return { repository }
    }
  }
}))

const { fetchForgeFacts } = await import('./fetch-forge-facts')

beforeEach(() => {
  fixtures = {}
})

describe('fetchForgeFacts — squash-merge closer fact loss', () => {
  it('resolves prState/mergedAt from the branch PR when the closer is a Commit, not a PullRequest', async () => {
    fixtures.t_1 = {
      issueState: 'CLOSED',
      stateReason: 'COMPLETED',
      closedAt: '2026-07-01T00:00:00Z',
      assigneesCount: 1,
      labels: [],
      closer: 'commit',
      branchPr: {
        number: 525,
        url: 'https://github.com/owner/repo/pull/525',
        state: 'MERGED',
        reviewDecision: 'APPROVED',
        mergedAt: '2026-07-01T12:00:00Z'
      }
    }

    const snapshot = await fetchForgeFacts({
      owner: 'owner',
      repo: 'repo',
      iteration: 'iter',
      tasks: [{ id: '1', issue: 100 }],
      token: 'test-token'
    })

    const facts = snapshot.facts.get('1')
    expect(facts?.prState).toBe('merged')
    expect(facts?.mergedAt).toBe('2026-07-01T12:00:00Z')
  })

  it('resolves prState/mergedAt from a native PullRequest closer (regression guard)', async () => {
    fixtures.t_1 = {
      issueState: 'CLOSED',
      stateReason: 'COMPLETED',
      closedAt: '2026-07-01T00:00:00Z',
      assigneesCount: 1,
      labels: [],
      closer: {
        number: 500,
        url: 'https://github.com/owner/repo/pull/500',
        state: 'MERGED',
        reviewDecision: 'APPROVED',
        mergedAt: '2026-06-30T09:00:00Z'
      },
      branchPr: null
    }

    const snapshot = await fetchForgeFacts({
      owner: 'owner',
      repo: 'repo',
      iteration: 'iter',
      tasks: [{ id: '1', issue: 100 }],
      token: 'test-token'
    })

    const facts = snapshot.facts.get('1')
    expect(facts?.prState).toBe('merged')
    expect(facts?.mergedAt).toBe('2026-06-30T09:00:00Z')
  })
})
