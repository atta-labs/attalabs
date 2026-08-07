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
