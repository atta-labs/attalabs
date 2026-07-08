import { describe, expect, it, vi } from 'vitest'

vi.mock('./gh', () => ({
  ghIssueListByLabel: vi.fn()
}))

const { ghIssueListByLabel } = await import('./gh')
const { listIssueMilestonesForSlug } = await import('./list-issue-milestones')

describe('listIssueMilestonesForSlug', () => {
  it('maps each open Issue to its milestone title, or null when unattached', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 1,
        title: '[iter] 1 — a',
        body: '',
        state: 'OPEN',
        labels: [{ name: 'iteration:iter' }],
        milestone: { title: 'iter' }
      },
      {
        number: 2,
        title: '[iter] 2 — b',
        body: '',
        state: 'OPEN',
        labels: [{ name: 'iteration:iter' }],
        milestone: null
      }
    ])

    expect(listIssueMilestonesForSlug('daniboomerang', 'attalabs', 'iter')).toEqual([
      { issue: 1, milestoneTitle: 'iter' },
      { issue: 2, milestoneTitle: null }
    ])
  })

  it('excludes closed Issues — only open Issues are in scope for the active-iteration drift check', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 1,
        title: '[iter] 1 — a',
        body: '',
        state: 'CLOSED',
        labels: [{ name: 'iteration:iter' }],
        milestone: null
      }
    ])

    expect(listIssueMilestonesForSlug('daniboomerang', 'attalabs', 'iter')).toEqual([])
  })
})
