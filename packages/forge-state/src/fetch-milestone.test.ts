import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./gh', () => ({
  ghApiGet: vi.fn()
}))

const { ghApiGet } = await import('./gh')
const { findMilestoneForSlug } = await import('./fetch-milestone')

const OWNER = 'daniboomerang'
const REPO = 'attalabs'
const FIXTURES = join(__dirname, 'fixtures')
/** Captured live 2026-07-06 via `gh api repos/daniboomerang/attalabs/milestones?state=all` —
 * the real, current state: no Milestone exists yet for any active iteration. */
const emptyMilestones = JSON.parse(readFileSync(join(FIXTURES, 'milestones-empty.json'), 'utf8'))

describe('findMilestoneForSlug', () => {
  it('returns goal + active lifecycle for an open milestone matching the slug exactly', () => {
    vi.mocked(ghApiGet).mockReturnValue([
      { title: 'some-unrelated-slug', description: 'not this one', state: 'open' },
      { title: 'aeg-forge-state-v1', description: 'Migrate this repo governance state.', state: 'open' }
    ])

    expect(findMilestoneForSlug(OWNER, REPO, 'aeg-forge-state-v1')).toEqual({
      goal: 'Migrate this repo governance state.',
      lifecycle: 'active'
    })
  })

  it('returns goal + complete lifecycle for a closed milestone', () => {
    vi.mocked(ghApiGet).mockReturnValue([{ title: 'vinaya-cli-v1', description: 'Ship the CLI.', state: 'closed' }])

    expect(findMilestoneForSlug(OWNER, REPO, 'vinaya-cli-v1')).toEqual({
      goal: 'Ship the CLI.',
      lifecycle: 'complete'
    })
  })

  it('treats a missing description as an empty goal', () => {
    vi.mocked(ghApiGet).mockReturnValue([{ title: 'aeg-forge-state-v1', description: null, state: 'open' }])

    expect(findMilestoneForSlug(OWNER, REPO, 'aeg-forge-state-v1')).toEqual({ goal: '', lifecycle: 'active' })
  })

  it('returns null when no milestone matches the slug (the real, current fixture — no Milestone exists yet for any active iteration)', () => {
    vi.mocked(ghApiGet).mockReturnValue(emptyMilestones)

    expect(findMilestoneForSlug(OWNER, REPO, 'aeg-forge-state-v1')).toBeNull()
  })
})
