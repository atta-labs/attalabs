import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMock = vi.fn()
vi.mock('@octokit/graphql', () => ({ graphql: { defaults: () => clientMock } }))

const { fetchOpenIssuesWithoutTrancheLabel } = await import('./fetch-open-issues')

type PrNode = { number: number; state: string; url: string }

function issueNode(number: number, prs: PrNode[] = [], labels: string[] = [], body: string | null = null) {
  return {
    number,
    title: `Issue ${number}`,
    url: `https://github.com/o/r/issues/${number}`,
    body,
    labels: { nodes: labels.map((name) => ({ name })) },
    closedByPullRequestsReferences: { nodes: prs }
  }
}

function respond(issues: ReturnType<typeof issueNode>[], branches: string[], totalCount = branches.length) {
  clientMock.mockResolvedValueOnce({
    repository: { refs: { totalCount, nodes: branches.map((name) => ({ name })) }, issues: { nodes: issues } }
  })
}

const pr = (number: number, state = 'OPEN'): PrNode => ({ number, state, url: `https://github.com/o/r/pull/${number}` })

beforeEach(() => {
  clientMock.mockReset()
})

describe('fetchOpenIssuesWithoutTrancheLabel — in-flight state', () => {
  it('makes one request carrying the refs listing and per-Issue closing PRs', async () => {
    respond([issueNode(1), issueNode(2), issueNode(3)], [])
    await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(clientMock).toHaveBeenCalledTimes(1)
    const query = clientMock.mock.calls[0]?.[0] as string
    expect(query).toContain('refs(refPrefix: "refs/heads/task/", query: "issue-", first: 100)')
    expect(query).toContain('closedByPullRequestsReferences(first: 5, includeClosedPrs: false)')
  })

  it('flags a task/issue-<n> branch, matching the Issue number exactly', async () => {
    respond([issueNode(7), issueNode(70)], ['issue-70'])
    const { issues } = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(issues.find((i) => i.number === 7)?.inFlight.branch).toBe(false)
    expect(issues.find((i) => i.number === 70)?.inFlight.branch).toBe(true)
  })

  it('also reads a ref name that still carries the task/ prefix', async () => {
    respond([issueNode(7)], ['task/issue-7'])
    const { issues } = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(issues[0]?.inFlight.branch).toBe(true)
  })

  it('keeps only open closing PRs and reports the newest one', async () => {
    respond([issueNode(5, [pr(40, 'MERGED'), pr(41), pr(43), pr(42, 'CLOSED')])], [])
    const { issues } = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(issues[0]?.inFlight.pullRequest).toEqual({ number: 43, url: 'https://github.com/o/r/pull/43' })
  })

  it('reports no in-flight state for an untouched Issue', async () => {
    respond([issueNode(9, [pr(1, 'MERGED')])], ['issue-10'])
    const { issues } = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(issues[0]?.inFlight).toEqual({ branch: false, pullRequest: null })
  })

  it('carries the body Tier/Type as full labels, independent of the Issue labels', async () => {
    respond(
      [issueNode(3, [], ['vinaya/tier:1'], '**Tier:** 3\n**Type:** fix\n'), issueNode(4, [], [], 'no fields')],
      []
    )
    const { issues } = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(issues[0]).toMatchObject({ bodyTier: 'vinaya/tier:3', bodyType: 'vinaya/type:fix' })
    expect(issues[1]).toMatchObject({ bodyTier: null, bodyType: null })
  })

  it('still excludes tranche-labelled Issues', async () => {
    respond([issueNode(1, [], ['vinaya/tranche:x']), issueNode(2)], [])
    const { issues } = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(issues.map((i) => i.number)).toEqual([2])
  })

  it('reports unreachable when the query fails', async () => {
    clientMock.mockRejectedValueOnce(new Error('boom'))
    const result = await fetchOpenIssuesWithoutTrancheLabel('o', 'r', 't')
    expect(result.forge).toEqual({ kind: 'unreachable' })
  })
})
