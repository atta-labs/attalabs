import { execFileSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { findMilestoneForSlug } from './fetch-milestone'

const OWNER = 'daniboomerang'
const REPO = 'attalabs'

function createThrowawayMilestone(title: string, description: string, state: 'open' | 'closed'): number {
  const out = execFileSync(
    'gh',
    [
      'api',
      `repos/${OWNER}/${REPO}/milestones`,
      '-f',
      `title=${title}`,
      '-f',
      `description=${description}`,
      '-f',
      `state=${state}`
    ],
    { encoding: 'utf8' }
  )
  return (JSON.parse(out) as { number: number }).number
}

function deleteMilestone(number: number): void {
  execFileSync('gh', ['api', `repos/${OWNER}/${REPO}/milestones/${number}`, '-X', 'DELETE'])
}

describe('findMilestoneForSlug', () => {
  let createdNumber: number | null = null

  afterEach(() => {
    if (createdNumber !== null) {
      deleteMilestone(createdNumber)
      createdNumber = null
    }
  })

  it('round-trips goal + active lifecycle for an open milestone', () => {
    const slug = `forge-state-test-open-${Date.now()}`
    const goal = 'Throwaway spike milestone created by packages/forge-state tests.'
    createdNumber = createThrowawayMilestone(slug, goal, 'open')

    const facts = findMilestoneForSlug(OWNER, REPO, slug)
    expect(facts).toEqual({ goal, lifecycle: 'active' })
  })

  it('round-trips goal + complete lifecycle for a closed milestone', () => {
    const slug = `forge-state-test-closed-${Date.now()}`
    const goal = 'Throwaway closed milestone created by packages/forge-state tests.'
    createdNumber = createThrowawayMilestone(slug, goal, 'closed')

    const facts = findMilestoneForSlug(OWNER, REPO, slug)
    expect(facts).toEqual({ goal, lifecycle: 'complete' })
  })

  it('returns null when no milestone exists yet for the slug (transitional state)', () => {
    const facts = findMilestoneForSlug(OWNER, REPO, `forge-state-nonexistent-${Date.now()}`)
    expect(facts).toBeNull()
  })
})
