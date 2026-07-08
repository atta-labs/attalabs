import { describe, expect, it, vi } from 'vitest'

vi.mock('./gh', () => ({
  ghIssueListByLabel: vi.fn()
}))

const { ghIssueListByLabel } = await import('./gh')
const { listTasksForSlug } = await import('./list-tasks')

describe('listTasksForSlug', () => {
  it('parses id/title from the `[<slug>] <id> — <title>` convention and projects from labels', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 425,
        title: '[aeg-forge-state-v1] 1 — Generic forge-reading adapter (packages/forge-state)',
        body: '**Dependency rationale** — `Depends-on: —`. First task.\n\n**Traps to avoid** — none.',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'tier:3' }, { name: 'project:aeg-core' }, { name: 'iteration:aeg-forge-state-v1' }]
      }
    ])

    const tasks = listTasksForSlug('daniboomerang', 'attalabs', 'aeg-forge-state-v1')

    expect(tasks).toEqual([
      {
        id: '1',
        title: 'Generic forge-reading adapter (packages/forge-state)',
        issue: 425,
        projects: ['aeg-core'],
        dependsOn: [],
        conflictsWith: [],
        rationaleMarkdown: '**Dependency rationale** — `Depends-on: —`. First task.\n\n**Traps to avoid** — none.'
      }
    ])
  })

  it('sorts numeric ids ahead of alpha suffix, e.g. 7 before 7a', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 2,
        title: '[iter] 7a — split B',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'iteration:iter' }]
      },
      {
        number: 1,
        title: '[iter] 7 — split A',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'iteration:iter' }]
      },
      {
        number: 3,
        title: '[iter] 2 — earlier task',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'iteration:iter' }]
      }
    ])

    const tasks = listTasksForSlug('daniboomerang', 'attalabs', 'iter')
    expect(tasks.map((t) => t.id)).toEqual(['2', '7', '7a'])
  })

  it('drops Issues whose title does not match the `[slug] id — title` convention', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 1,
        title: 'A malformed title with no brackets',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'iteration:iter' }]
      }
    ])

    expect(listTasksForSlug('daniboomerang', 'attalabs', 'iter')).toEqual([])
  })
})
