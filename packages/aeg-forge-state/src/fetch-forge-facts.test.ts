import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for two confirmed bugs in `fetchForgeFacts`'s batched
 * GraphQL query (`buildBatchQuery` / `extractRawFromResponse`):
 *
 * 1. Squash-merge closer fact loss: GitHub's `ClosedEvent.closer` can be a
 *    `Commit` (squash-merge whose message contains `Closes #N`, rather than
 *    native PR-auto-close linkage — this repo's own
 *    `<!-- AEG:CLOSES:START -->` convention produces exactly this shape).
 *    When that happens, the `... on PullRequest { ... }` inline fragment
 *    matches nothing and GraphQL returns `{}` — an empty object, not `null`
 *    — so `extractRawFromResponse` must not treat it as a valid PR (PR #529).
 *
 * 2. Stale ClosedEvent after reopen (#524): an issue closed once (e.g.
 *    manually, `closer: null`), reopened, then closed again by a real merged
 *    PR has two `ClosedEvent`s on its timeline. `timelineItems(first: 1, ...)`
 *    returned the stale first event; the fix queries `last: 1` instead. The
 *    mock below inspects the outgoing query text to decide whether to hand
 *    back the first or last fixture entry, so it genuinely fails if the
 *    query regresses to `first: 1` — mirroring the established pattern in
 *    `packages/aeg-core/bin/verify-coherence.test.ts`.
 *
 * Mocks `@octokit/graphql` per-task by alias (`t_<id>_issue` / `_ref` /
 * `_prs`), mirroring the shape `buildBatchQuery` emits.
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
  /**
   * `'commit'` simulates a Commit-typed closer — the fragment yields `{}`.
   * A single value simulates one ClosedEvent (the common case). An array
   * simulates multiple ClosedEvents on the timeline (close → reopen → close
   * again) in chronological order, mirroring what `last: 1` picks from.
   */
  closer: PrFixture | 'commit' | null | Array<PrFixture | 'commit' | null>
  branchPr: PrFixture | null
}

let fixtures: Record<string, TaskFixture> = {}

vi.mock('@octokit/graphql', () => ({
  graphql: {
    defaults: () => async (query: string) => {
      // Inspect the outgoing query text — do not assume which end of the
      // timeline the caller asked for. This is what makes the test actually
      // exercise `buildBatchQuery`'s `first`/`last` choice: if the source
      // regresses to `timelineItems(first: 1, ...)`, `usesLast` goes false
      // and the mock hands back the FIRST fixture entry (the stale one),
      // which fails the #524 regression test below. Mirrors the pattern in
      // `packages/aeg-core/bin/verify-coherence.test.ts`.
      const usesLast = /timelineItems\(last:\s*1/.test(query)
      const repository: Record<string, unknown> = {}
      for (const [alias, fx] of Object.entries(fixtures)) {
        repository[`${alias}_issue`] = {
          state: fx.issueState,
          stateReason: fx.stateReason,
          closedAt: fx.closedAt,
          assignees: { totalCount: fx.assigneesCount },
          labels: { nodes: fx.labels.map((name) => ({ name })) },
          timelineItems: {
            nodes: [
              {
                closer: (() => {
                  const events = Array.isArray(fx.closer) ? fx.closer : [fx.closer]
                  const picked = usesLast ? events[events.length - 1] : events[0]
                  return picked === 'commit' ? {} : picked
                })()
              }
            ]
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
      tranche: 'iter',
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
      tranche: 'iter',
      tasks: [{ id: '1', issue: 100 }],
      token: 'test-token'
    })

    const facts = snapshot.facts.get('1')
    expect(facts?.prState).toBe('merged')
    expect(facts?.mergedAt).toBe('2026-06-30T09:00:00Z')
  })
})

describe('fetchForgeFacts — stale ClosedEvent after reopen (#524)', () => {
  it('resolves prState from the real closing PR, not a stale earlier ClosedEvent with a null closer', async () => {
    // Reproduces Issue #524 exactly: closed once manually (closer: null),
    // reopened, then closed again by a real merged PR. `first: 1` on
    // timelineItems used to return the stale first event (closer: null),
    // resolving prState to 'none' even though a PR really merged and closed
    // it. `last: 1` must return the second (real) event instead.
    fixtures.t_1 = {
      issueState: 'CLOSED',
      stateReason: 'COMPLETED',
      closedAt: '2026-07-11T21:51:30Z',
      assigneesCount: 1,
      labels: [],
      closer: [
        null,
        {
          number: 530,
          url: 'https://github.com/owner/repo/pull/530',
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergedAt: '2026-07-11T21:51:30Z'
        }
      ],
      branchPr: null
    }

    const snapshot = await fetchForgeFacts({
      owner: 'owner',
      repo: 'repo',
      tranche: 'iter',
      tasks: [{ id: '1', issue: 524 }],
      token: 'test-token'
    })

    const facts = snapshot.facts.get('1')
    expect(facts?.prState).toBe('merged')
    expect(facts?.mergedAt).toBe('2026-07-11T21:51:30Z')

    const prRef = snapshot.prRefs.get('1')
    expect(prRef?.number).toBe(530)
  })
})
