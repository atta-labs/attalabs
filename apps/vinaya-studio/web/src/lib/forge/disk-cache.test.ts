import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DispatchResult, ForgeFacts, LedgerRow, PrRef } from '@attalabs/aeg-core'

// `server-only` throws unconditionally on plain import — Next's bundler
// substitutes a client-detection version; plain vitest gets the real
// package. Same mock as `read-root.test.ts`.
vi.mock('server-only', () => ({}))

import { __setDiskCacheRootForTests, readCacheEnvelope, writeCacheEnvelope } from './disk-cache'
import type { TrancheStoreData } from './tranche-page-snapshot'

/**
 * Golden round-trip test (task `vinaya-studio-shell-v1` 1, #1053, O5): a
 * stored snapshot must deserialize to the SAME shape a freshly derived one
 * has — in particular, every `Map` (`snapshot.facts`, `snapshot.prRefs`,
 * `readiness`, `tokenLedger.ledgers`) must come back as a real `Map`
 * instance, not the plain object a bare `JSON.parse` would produce. The
 * fixture below mirrors `TrancheStoreData`'s exact shape, Maps at every
 * level the real page-load bundle carries one.
 */

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vinaya-studio-disk-cache-test-'))
  __setDiskCacheRootForTests(tmpDir)
})

afterEach(async () => {
  __setDiskCacheRootForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function buildFixture(): TrancheStoreData {
  const facts: ForgeFacts = {
    issueState: 'open',
    assigned: true,
    branchExists: true,
    prState: 'open',
    reviewDecision: 'none',
    blockedLabel: false,
    stateReason: null,
    closedAt: null,
    mergedAt: null,
    closedByActor: null
  }
  const prRef: PrRef = { number: 42, url: 'https://github.com/atta-labs/attalabs/pull/42', state: 'OPEN' }
  const readiness: DispatchResult = { ready: false, blockers: ['depends-on 1 not merged'] }
  const ledgerRow: LedgerRow = {
    phase: '1: develop',
    role: 'Developer',
    agentModel: 'claude-sonnet-5 (CC)',
    tokensIn: 12_345,
    tokensOut: 6_789,
    cost: 0.4321,
    date: '2026-09-10'
  }

  return {
    detail: {
      fileSlug: 'vinaya-studio-shell-v1',
      archived: false,
      tranche: {
        name: 'vinaya-studio-shell-v1',
        lifecycle: 'active',
        goal: 'Measure the forge reads; local snapshot store with stale-while-revalidate',
        tasks: [
          {
            id: '1',
            title: 'Measure the forge reads',
            issue: 1053,
            projects: ['vinaya-studio'],
            dependsOn: [],
            conflictsWith: [],
            rationaleMarkdown: ''
          }
        ],
        backlog: []
      }
    },
    snapshot: {
      derived: {
        tranche: {
          name: 'vinaya-studio-shell-v1',
          lifecycle: 'active',
          goal: '',
          tasks: [],
          backlog: []
        },
        tasks: [],
        unknownEdges: []
      },
      repo: { owner: 'atta-labs', repo: 'attalabs' },
      facts: new Map([['1', facts]]),
      prRefs: new Map([['1', prRef]]),
      unavailable: false
    },
    readiness: new Map([['1', readiness]]),
    tokenLedger: {
      ledgers: new Map([['1', [ledgerRow]]]),
      unavailable: false
    }
  }
}

describe('disk-cache round trip (O5: stored snapshot matches a freshly derived one)', () => {
  it('deserializes to the exact same shape it was written with, Maps included', async () => {
    const fixture = buildFixture()

    await writeCacheEnvelope('owner__repo__vinaya-studio-shell-v1', fixture)
    const result = await readCacheEnvelope<TrancheStoreData>('owner__repo__vinaya-studio-shell-v1')

    expect(result).not.toBeNull()
    expect(result?.data).toEqual(fixture)

    // Structural proof, not just deep-equal: a plain object with the same
    // enumerable entries would also pass `toEqual` against a Map in some
    // matcher configurations — assert the actual runtime type at every level.
    expect(result?.data.snapshot.facts).toBeInstanceOf(Map)
    expect(result?.data.snapshot.prRefs).toBeInstanceOf(Map)
    expect(result?.data.readiness).toBeInstanceOf(Map)
    expect(result?.data.tokenLedger.ledgers).toBeInstanceOf(Map)
    expect(result?.data.snapshot.facts.get('1')).toEqual(fixture.snapshot.facts.get('1'))
    expect(result?.data.tokenLedger.ledgers.get('1')).toEqual(fixture.tokenLedger.ledgers.get('1'))
  })

  it('returns null for a key that was never written — cold, not a crash', async () => {
    const result = await readCacheEnvelope('never-written-key')
    expect(result).toBeNull()
  })

  it('storedAt is a fresh timestamp at write time', async () => {
    const before = Date.now()
    await writeCacheEnvelope('timestamp-key', { hello: 'world' })
    const after = Date.now()

    const result = await readCacheEnvelope<{ hello: string }>('timestamp-key')
    expect(result).not.toBeNull()
    expect(result?.storedAt).toBeGreaterThanOrEqual(before)
    expect(result?.storedAt).toBeLessThanOrEqual(after)
  })
})

describe('writeCacheEnvelope — atomic write (finding 3: no torn read)', () => {
  it('never leaves a partial file at the final path: a reader either sees nothing or a complete, parseable envelope', async () => {
    // A direct `fs.writeFile` to the final path can be observed mid-write by
    // a concurrent reader. The temp-file+rename approach makes that
    // impossible: `fs.rename` is atomic on POSIX, so the final path only
    // ever names a complete file. Simulate many concurrent readers racing a
    // single writer and assert every read is either null (not yet renamed)
    // or a fully valid envelope — never a JSON.parse failure.
    const writes = Array.from({ length: 20 }, (_, i) => writeCacheEnvelope('race-key', { n: i }))
    const reads = Array.from({ length: 40 }, () => readCacheEnvelope<{ n: number }>('race-key'))

    const [, results] = await Promise.all([Promise.all(writes), Promise.all(reads)])

    for (const result of results) {
      if (result === null) continue
      expect(typeof result.data.n).toBe('number')
      expect(typeof result.storedAt).toBe('number')
    }
  })

  it('does not leave a stray temp file behind after a successful write', async () => {
    await writeCacheEnvelope('no-leftover-tmp-key', { ok: true })

    const entries = await fs.readdir(tmpDir)
    const tmpFiles = entries.filter((name) => name.includes('.tmp'))
    expect(tmpFiles).toEqual([])
  })

  it('cleans up its own temp file when the write itself fails, and rejects rather than silently dropping the write', async () => {
    const badData: unknown = {}
    ;(badData as { self?: unknown }).self = badData // circular — JSON.stringify throws

    await expect(writeCacheEnvelope('circular-key', badData)).rejects.toThrow()

    const entries = await fs.readdir(tmpDir)
    const tmpFiles = entries.filter((name) => name.includes('.tmp'))
    expect(tmpFiles).toEqual([])
    await expect(readCacheEnvelope('circular-key')).resolves.toBeNull()
  })
})

describe('writeCacheEnvelope — restrictive permissions (finding 5: cache is not world-readable)', () => {
  it('creates the cache directory as 0o700 (owner-only)', async () => {
    // `tmpDir` itself already exists (from `fs.mkdtemp` in `beforeEach`, which
    // is 0o700 by default on its own) — `fs.mkdir`'s `mode` option only takes
    // effect for a directory it actually creates, so point the override at a
    // not-yet-existing nested path to exercise that code path for real.
    const freshCacheDir = path.join(tmpDir, 'not-yet-created', 'vinaya-studio')
    __setDiskCacheRootForTests(freshCacheDir)

    await writeCacheEnvelope('perm-dir-key', { ok: true })

    const stat = await fs.stat(freshCacheDir)
    expect(stat.mode & 0o777).toBe(0o700)
  })

  it('writes the cache file as 0o600 (owner read/write only, no group/other access)', async () => {
    await writeCacheEnvelope('perm-file-key', { ok: true })

    const filePath = path.join(tmpDir, 'perm-file-key.json')
    const stat = await fs.stat(filePath)
    expect(stat.mode & 0o777).toBe(0o600)
  })

  it('re-tightens the mode via chmod even when a file already exists at that path with a looser mode', async () => {
    const filePath = path.join(tmpDir, 'preexisting-key.json')
    await fs.writeFile(filePath, '{}', { mode: 0o644 })
    await fs.chmod(filePath, 0o644)

    await writeCacheEnvelope('preexisting-key', { ok: true })

    const stat = await fs.stat(filePath)
    expect(stat.mode & 0o777).toBe(0o600)
  })

  it('re-tightens the cache directory mode via chmod even when the directory already exists with a looser mode', async () => {
    // `fs.mkdir`'s own `mode` option, like `writeFile`'s, only applies when
    // the directory doesn't already exist — it's a documented no-op on an
    // already-existing directory's mode. Create the cache dir ahead of time
    // with a looser mode to exercise the explicit `chmod` fallback.
    await fs.chmod(tmpDir, 0o755)

    await writeCacheEnvelope('preexisting-dir-key', { ok: true })

    const stat = await fs.stat(tmpDir)
    expect(stat.mode & 0o777).toBe(0o700)
  })
})
