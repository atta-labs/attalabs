import { describe, expect, it } from 'vitest'
import { findDeadBranchPushes } from './dead-branch-push-audit'

describe('findDeadBranchPushes', () => {
  it('flags a branch whose tip commit lands strictly after its PR merged', () => {
    const facts = [
      {
        branch: 'task/aeg-governance-hardening/99',
        prNumber: 325,
        prState: 'MERGED' as const,
        resolvedAt: '2026-07-03T10:00:00Z',
        latestCommitAt: '2026-07-03T18:00:00Z'
      }
    ]
    const result = findDeadBranchPushes(facts)
    expect(result).toEqual([
      {
        branch: 'task/aeg-governance-hardening/99',
        prNumber: 325,
        prState: 'MERGED',
        resolvedAt: '2026-07-03T10:00:00Z',
        latestCommitAt: '2026-07-03T18:00:00Z'
      }
    ])
  })

  it('flags a branch whose tip commit lands after its PR was closed (never merged)', () => {
    const facts = [
      {
        branch: 'task/aeg-governance-hardening/50',
        prNumber: 210,
        prState: 'CLOSED' as const,
        resolvedAt: '2026-06-01T00:00:00Z',
        latestCommitAt: '2026-06-02T00:00:00Z'
      }
    ]
    expect(findDeadBranchPushes(facts)).toHaveLength(1)
  })

  it('does not flag a branch whose tip commit predates its PR resolution (normal, undeleted branch)', () => {
    const facts = [
      {
        branch: 'task/aeg-governance-hardening/1',
        prNumber: 100,
        prState: 'MERGED' as const,
        resolvedAt: '2026-06-21T17:00:00Z',
        latestCommitAt: '2026-06-21T16:00:00Z'
      }
    ]
    expect(findDeadBranchPushes(facts)).toEqual([])
  })

  it('does not flag a branch whose tip commit exactly matches its PR resolution time', () => {
    const facts = [
      {
        branch: 'task/aeg-governance-hardening/1',
        prNumber: 100,
        prState: 'MERGED' as const,
        resolvedAt: '2026-06-21T17:00:00Z',
        latestCommitAt: '2026-06-21T17:00:00Z'
      }
    ]
    expect(findDeadBranchPushes(facts)).toEqual([])
  })

  it('resolves a mixed batch independently per branch', () => {
    const facts = [
      {
        branch: 'task/iter/1',
        prNumber: 1,
        prState: 'MERGED' as const,
        resolvedAt: '2026-07-01T00:00:00Z',
        latestCommitAt: '2026-06-30T00:00:00Z'
      },
      {
        branch: 'task/iter/2',
        prNumber: 2,
        prState: 'MERGED' as const,
        resolvedAt: '2026-07-01T00:00:00Z',
        latestCommitAt: '2026-07-02T00:00:00Z'
      }
    ]
    const result = findDeadBranchPushes(facts)
    expect(result).toHaveLength(1)
    expect(result[0]!.branch).toBe('task/iter/2')
  })

  it('returns empty for an empty fact list', () => {
    expect(findDeadBranchPushes([])).toEqual([])
  })
})
