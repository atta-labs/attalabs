import { describe, expect, it } from 'bun:test'
import type { ArchiveDeps } from '../src/commands/archive.js'
import { runArchive, runArchiveTranche } from '../src/commands/archive.js'

function archiveDeps(overrides: Partial<ArchiveDeps> = {}): ArchiveDeps {
  return {
    detectRepo: async () => ({ repoRoot: '/tmp/does-not-matter', owner: 'acme', repo: 'widget' }),
    ...overrides
  }
}

describe('vinaya archive — pre-flight', () => {
  it('refuses when not a git repository', async () => {
    const exit = await runArchive([], archiveDeps({ detectRepo: async () => null }))
    expect(exit).toBe(1)
  })

  it('refuses when no GitHub owner/repo can be resolved from `origin`', async () => {
    const exit = await runArchive(
      [],
      archiveDeps({ detectRepo: async () => ({ repoRoot: '/tmp/does-not-matter', owner: '', repo: '' }) })
    )
    expect(exit).toBe(1)
  })
})

describe('vinaya archive tranche — pre-flight', () => {
  it('refuses with no slug argument', async () => {
    const exit = await runArchiveTranche([], archiveDeps())
    expect(exit).toBe(2)
  })

  it('refuses when not a git repository', async () => {
    const exit = await runArchiveTranche(['some-tranche'], archiveDeps({ detectRepo: async () => null }))
    expect(exit).toBe(1)
  })

  it('refuses when no GitHub owner/repo can be resolved from `origin`', async () => {
    const exit = await runArchiveTranche(
      ['some-tranche'],
      archiveDeps({ detectRepo: async () => ({ repoRoot: '/tmp/does-not-matter', owner: '', repo: '' }) })
    )
    expect(exit).toBe(1)
  })
})
