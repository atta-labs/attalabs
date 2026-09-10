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
