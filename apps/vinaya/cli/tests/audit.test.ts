import { describe, expect, it } from 'bun:test'
import { findDeadBranchPushes } from '@atta/aeg-core'
import type { AuditDeps } from '../src/commands/audit.js'
import { runAudit } from '../src/commands/audit.js'

function auditDeps(overrides: Partial<AuditDeps> = {}): AuditDeps {
  return {
    detectRepo: async () => ({ repoRoot: '/tmp/does-not-matter', owner: 'acme', repo: 'widget' }),
    ...overrides
  }
}

describe('vinaya audit — pre-flight', () => {
  it('refuses when not a git repository', async () => {
    const exit = await runAudit([], auditDeps({ detectRepo: async () => null }))
    expect(exit).toBe(1)
  })

  it('refuses when no GitHub owner/repo can be resolved from `origin`', async () => {
    const exit = await runAudit(
      [],
      auditDeps({ detectRepo: async () => ({ repoRoot: '/tmp/does-not-matter', owner: '', repo: '' }) })
    )
    expect(exit).toBe(1)
  })
})

describe('vinaya audit — direct-main-push bounded poll (#870)', () => {
  it('finds the association on a later attempt and returns legitimate without exhausting the ceiling', async () => {
    let calls = 0
    const exit = await runAudit(
      ['--only=direct-push', '--sha=abc123'],
      auditDeps({
        fetchAssociatedMergedPrs: () => {
          calls++
          return calls < 3 ? [] : [42]
        },
        pollAttempts: 6,
        pollDelayMs: 1,
        sleep: async () => {}
      })
    )
    expect(exit).toBe(0)
    expect(calls).toBe(3)
  })

  it('still returns direct-push after the ceiling when genuinely no association ever appears', async () => {
    let calls = 0
    let incidentOpened = 0
    const exit = await runAudit(
      ['--only=direct-push', '--sha=def456'],
      auditDeps({
        fetchAssociatedMergedPrs: () => {
          calls++
          return []
        },
        pollAttempts: 3,
        pollDelayMs: 1,
        sleep: async () => {},
        openDirectPushIncident: () => {
          incidentOpened++
        }
      })
    )
    expect(exit).toBe(1)
    expect(calls).toBe(3)
    expect(incidentOpened).toBe(1)
  })
})

describe('vinaya audit — dead-branch-push detection parity', () => {
  it('flags a branch whose tip commit lands after its own PR already resolved, via the same pure findDeadBranchPushes @atta/aeg-core exports to packages/aeg-core/bin/dead-branch-audit.ts', () => {
    const findings = findDeadBranchPushes([
      {
        branch: 'task/scratch/1',
        prNumber: 1,
        prState: 'MERGED',
        resolvedAt: '2026-01-01T00:00:00Z',
        latestCommitAt: '2026-01-02T00:00:00Z'
      },
      {
        branch: 'task/scratch/2',
        prNumber: 2,
        prState: 'CLOSED',
        resolvedAt: '2026-01-02T00:00:00Z',
        latestCommitAt: '2026-01-01T00:00:00Z'
      }
    ])
    expect(findings).toEqual([
      {
        branch: 'task/scratch/1',
        prNumber: 1,
        prState: 'MERGED',
        resolvedAt: '2026-01-01T00:00:00Z',
        latestCommitAt: '2026-01-02T00:00:00Z'
      }
    ])
  })
})
