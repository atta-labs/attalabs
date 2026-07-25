import { describe, expect, it, vi } from 'vitest'

vi.mock('./gh', () => ({
  ghIssueListByLabel: vi.fn()
}))

const { ghIssueListByLabel } = await import('./gh')
const { listTasksForSlug } = await import('./list-tasks')

describe('listTasksForSlug', () => {
  it('parses id/title from the `[<slug>] <id> — <title>` convention and projects from the body field', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 425,
        title: '[aeg-forge-state-v1] 1 — Generic forge-reading adapter (packages/forge-state)',
        body: '**Project:** aeg-core\n\n**Dependency rationale** — `Depends-on: —`. First task.\n\n**Traps to avoid** — none.',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'vinaya/tier:3' }, { name: 'vinaya/iteration:aeg-forge-state-v1' }]
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
        rationaleMarkdown:
          '**Project:** aeg-core\n\n**Dependency rationale** — `Depends-on: —`. First task.\n\n**Traps to avoid** — none.'
      }
    ])
  })

  it('derives projects from the **Project:** field alone (post-#614 / state-machine-v1)', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 614,
        title: '[state-machine-v1] 2 — Migrate labels to the vinaya/ namespace',
        body: '**Boundary** — ...\n\n**Project(s) + blast radius** — `Project: aeg-core`.\n\n**Tier:** 3\n**Project:** aeg-core, vinaya',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'vinaya/tier:3' }, { name: 'vinaya/iteration:state-machine-v1' }]
      }
    ])

    const [task] = listTasksForSlug('daniboomerang', 'attalabs', 'state-machine-v1')

    expect(task?.projects).toEqual(['aeg-core', 'vinaya'])
  })

  it('ignores a residual project:* label — project is a field, never a label (#614)', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 700,
        title: '[iter] 1 — a stale project label lingers on the Issue',
        body: '**Project:** herald',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'project:vinaya' }, { name: 'vinaya/iteration:iter' }]
      }
    ])

    const [task] = listTasksForSlug('daniboomerang', 'attalabs', 'iter')

    expect(task?.projects).toEqual(['herald'])
  })

  it('ignores prose in the **Project:** field rather than deriving a garbage project (#554)', () => {
    // #554's EXACT body line. Unguarded, this split to a single "project"
    // named "(none — tools/admin is unregistered; …)", which rendered as a
    // project label and built a board link that 404s — strictly worse than
    // the board-less row it replaced. Regression pin: fails without the
    // slug-shape guard in `parseProjectField`.
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 554,
        title: '[admin-ui-library-picker-v1] 1 — Add per-app Library picker to tools/admin',
        body: '**Project:** (none — tools/admin is unregistered; see Project(s) + blast radius above)',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'vinaya/iteration:admin-ui-library-picker-v1' }]
      }
    ])

    const [task] = listTasksForSlug('daniboomerang', 'attalabs', 'admin-ui-library-picker-v1')

    expect(task?.projects).toEqual([])
  })

  it('sorts numeric ids ahead of alpha suffix, e.g. 7 before 7a', () => {
    vi.mocked(ghIssueListByLabel).mockReturnValue([
      {
        number: 2,
        title: '[iter] 7a — split B',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'vinaya/iteration:iter' }]
      },
      {
        number: 1,
        title: '[iter] 7 — split A',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'vinaya/iteration:iter' }]
      },
      {
        number: 3,
        title: '[iter] 2 — earlier task',
        body: '',
        state: 'OPEN',
        milestone: null,
        labels: [{ name: 'vinaya/iteration:iter' }]
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
        labels: [{ name: 'vinaya/iteration:iter' }]
      }
    ])

    expect(listTasksForSlug('daniboomerang', 'attalabs', 'iter')).toEqual([])
  })
})
