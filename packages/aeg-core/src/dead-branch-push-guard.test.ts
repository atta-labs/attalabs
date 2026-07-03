import { describe, expect, it } from 'vitest'
import { checkDeadBranchPush } from './dead-branch-push-guard'

describe('checkDeadBranchPush', () => {
  it('refuses when the most recent PR is MERGED', () => {
    const result = checkDeadBranchPush({ branch: 'task/gov-hardening/18', prState: 'MERGED', prNumber: 343 })
    expect(result.verdict).toBe('refuse')
    expect(result.reason).toContain('MERGED')
    expect(result.reason).toContain('#343')
  })

  it('refuses when the most recent PR is CLOSED', () => {
    const result = checkDeadBranchPush({ branch: 'task/gov-hardening/18', prState: 'CLOSED', prNumber: 200 })
    expect(result.verdict).toBe('refuse')
    expect(result.reason).toContain('CLOSED')
    expect(result.reason).toContain('#200')
  })

  it('allows when the most recent PR is OPEN', () => {
    const result = checkDeadBranchPush({ branch: 'task/gov-hardening/18', prState: 'OPEN', prNumber: 335 })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('OPEN')
    expect(result.reason).toContain('#335')
  })

  it('allows when no PR exists yet', () => {
    const result = checkDeadBranchPush({ branch: 'task/gov-hardening/18', prState: 'NONE', prNumber: null })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('no PR yet')
  })

  it('allows when the PR state is UNKNOWN (fail-open on forge-unreachable)', () => {
    const result = checkDeadBranchPush({ branch: 'task/gov-hardening/18', prState: 'UNKNOWN', prNumber: null })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('Could not determine')
  })
})
