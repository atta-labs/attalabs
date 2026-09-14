import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DispatchResult, LedgerRow, Tranche } from '@attalabs/aeg-core'
import type { TrancheDetail } from '@/lib/repo-state'
import type { TrancheSnapshot } from './load-snapshot'

// `server-only` throws unconditionally on plain import — Next's bundler
// substitutes a client-detection version; plain vitest gets the real
// package. Same mock as `disk-cache.test.ts`/`read-root.test.ts`.
vi.mock('server-only', () => ({}))

// `resolveRepo` is the only export this module reads from
// `@attalabs/aeg-forge-state` — `importOriginal` keeps the rest of the
// package's module graph real, same pattern as `read-root.test.ts`.
const resolveRepoMock = vi.fn()
vi.mock('@attalabs/aeg-forge-state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@attalabs/aeg-forge-state')>()
  return { ...actual, resolveRepo: () => resolveRepoMock() }
})

const readTrancheMock = vi.fn()
vi.mock('@/lib/repo-state', () => ({ readTranche: (slug: string) => readTrancheMock(slug) }))

const loadTrancheSnapshotMock = vi.fn()
vi.mock('./load-snapshot', () => ({ loadTrancheSnapshot: (...args: unknown[]) => loadTrancheSnapshotMock(...args) }))

const loadDispatchReadinessMock = vi.fn()
vi.mock('./dispatch-readiness', () => ({
  loadDispatchReadiness: (...args: unknown[]) => loadDispatchReadinessMock(...args)
}))

const fetchTrancheTokenLedgerMock = vi.fn()
vi.mock('./fetch-token-ledger', () => ({
  fetchTrancheTokenLedger: (...args: unknown[]) => fetchTrancheTokenLedgerMock(...args)
}))

const readCacheEnvelopeMock = vi.fn()
const writeCacheEnvelopeMock = vi.fn()
vi.mock('./disk-cache', () => ({
  readCacheEnvelope: (...args: unknown[]) => readCacheEnvelopeMock(...args),
  writeCacheEnvelope: (...args: unknown[]) => writeCacheEnvelopeMock(...args)
}))

const { loadTranchePageData, forceRefresh } = await import('./tranche-page-snapshot')

const REPO = { owner: 'atta-labs', repo: 'attalabs' }

function buildTranche(): Tranche {
  return {
    name: 'vinaya-studio-shell-v1',
    lifecycle: 'active',
    goal: 'Measure the forge reads',
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
}

function buildDetail(): TrancheDetail {
  return { fileSlug: 'vinaya-studio-shell-v1', archived: false, tranche: buildTranche() }
}

function buildSnapshot(): TrancheSnapshot {
  return {
    derived: { tranche: buildTranche(), tasks: [], unknownEdges: [] },
    repo: REPO,
    facts: new Map(),
    prRefs: new Map(),
    unavailable: false
  }
}

function buildReadiness(): Map<string, DispatchResult> {
  return new Map()
}

function buildTokenLedger(): { ledgers: Map<string, LedgerRow[]>; unavailable: boolean } {
  return { ledgers: new Map(), unavailable: false }
}

/** Wires every mock to a clean, successful "cold compute" path — individual
 *  tests override the piece they're exercising. */
function stubCleanComputation(): void {
  readTrancheMock.mockResolvedValue(buildDetail())
  loadTrancheSnapshotMock.mockResolvedValue(buildSnapshot())
  loadDispatchReadinessMock.mockResolvedValue(buildReadiness())
  fetchTrancheTokenLedgerMock.mockResolvedValue(buildTokenLedger())
  writeCacheEnvelopeMock.mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveRepoMock.mockResolvedValue(REPO)
  readCacheEnvelopeMock.mockResolvedValue(null)
  stubCleanComputation()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadTranchePageData — TTL boundary and stale-vs-fresh branching (O2/O3)', () => {
  it('a cache entry younger than the 60s TTL is served fresh with zero recompute calls', async () => {
    readCacheEnvelopeMock.mockResolvedValue({ storedAt: Date.now() - 59_000, data: { marker: 'cached' } })

    const result = await loadTranchePageData('vinaya-studio-shell-v1')

    expect(result.notFound).toBe(false)
    if (result.notFound) throw new Error('unreachable')
    expect(result.stale).toBe(false)
    expect(result.data).toEqual({ marker: 'cached' })
    expect(readTrancheMock).not.toHaveBeenCalled()
    expect(writeCacheEnvelopeMock).not.toHaveBeenCalled()
  })

  it('a cache entry exactly at the TTL boundary (age === TTL_MS) is treated as stale, not fresh', async () => {
    // `ageMs < TTL_MS` is a strict `<` in the implementation — age === TTL_MS
    // must fall on the stale side, not the fresh side.
    const storedAt = Date.now() - 60_000
    readCacheEnvelopeMock.mockResolvedValue({ storedAt, data: { marker: 'stale-boundary' } })

    const result = await loadTranchePageData('vinaya-studio-shell-v1')

    expect(result.notFound).toBe(false)
    if (result.notFound) throw new Error('unreachable')
    expect(result.stale).toBe(true)
    expect(result.data).toEqual({ marker: 'stale-boundary' })
    // The stale entry is still returned immediately — the background
    // refresh it kicks off is fire-and-forget and not awaited here.
  })

  it('a cache entry older than the TTL is served stale AND a background refresh is kicked off', async () => {
    readCacheEnvelopeMock.mockResolvedValue({ storedAt: Date.now() - 61_000, data: { marker: 'stale' } })

    const result = await loadTranchePageData('vinaya-studio-shell-v1')

    expect(result.notFound).toBe(false)
    if (result.notFound) throw new Error('unreachable')
    expect(result.stale).toBe(true)
    expect(result.data).toEqual({ marker: 'stale' })

    // The background refresh is a detached promise (`void refreshInBackground`)
    // — give the microtask queue a turn so its recompute has actually run.
    await vi.waitFor(() => expect(readTrancheMock).toHaveBeenCalledWith('vinaya-studio-shell-v1'))
    await vi.waitFor(() => expect(writeCacheEnvelopeMock).toHaveBeenCalled())
  })

  it('no cache entry at all computes synchronously, writes the store, and returns fresh', async () => {
    readCacheEnvelopeMock.mockResolvedValue(null)

    const result = await loadTranchePageData('vinaya-studio-shell-v1')

    expect(result.notFound).toBe(false)
    if (result.notFound) throw new Error('unreachable')
    expect(result.stale).toBe(false)
    expect(readTrancheMock).toHaveBeenCalledWith('vinaya-studio-shell-v1')
    expect(writeCacheEnvelopeMock).toHaveBeenCalledTimes(1)
  })

  it('a NOT-FOUND tranche (readTranche resolves undefined) is never written to the cache', async () => {
    readCacheEnvelopeMock.mockResolvedValue(null)
    readTrancheMock.mockResolvedValue(undefined)

    const result = await loadTranchePageData('does-not-exist')

    expect(result.notFound).toBe(true)
    expect(writeCacheEnvelopeMock).not.toHaveBeenCalled()
  })
})

describe('loadTranchePageData — cold-compute cache-write failure is non-fatal (finding 4)', () => {
  it('a disk-write failure on the cold path still returns the derived data instead of throwing', async () => {
    readCacheEnvelopeMock.mockResolvedValue(null)
    writeCacheEnvelopeMock.mockRejectedValue(new Error('ENOSPC: no space left on device'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await loadTranchePageData('vinaya-studio-shell-v1')

    expect(result.notFound).toBe(false)
    if (result.notFound) throw new Error('unreachable')
    expect(result.data.detail.fileSlug).toBe('vinaya-studio-shell-v1')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cache write failed'))
  })
})

describe('loadTranchePageData — no repo resolvable falls back to an uncached inline compute', () => {
  it('computes inline and never touches the disk cache when resolveRepo() returns null', async () => {
    resolveRepoMock.mockResolvedValue(null)

    const result = await loadTranchePageData('vinaya-studio-shell-v1')

    expect(result.notFound).toBe(false)
    if (result.notFound) throw new Error('unreachable')
    expect(result.stale).toBe(false)
    expect(readTrancheMock).toHaveBeenCalledWith('vinaya-studio-shell-v1')
    expect(readCacheEnvelopeMock).not.toHaveBeenCalled()
    expect(writeCacheEnvelopeMock).not.toHaveBeenCalled()
  })

  it('a NOT-FOUND tranche with no repo resolvable also reports notFound, not a crash', async () => {
    resolveRepoMock.mockResolvedValue(null)
    readTrancheMock.mockResolvedValue(undefined)

    const result = await loadTranchePageData('does-not-exist')

    expect(result.notFound).toBe(true)
  })
})

describe('inFlightRefreshes dedup', () => {
  it('forceRefresh does not start a second concurrent recompute for the same key while one is in flight', async () => {
    let resolveFirstCompute!: () => void
    const firstComputeGate = new Promise<void>((resolve) => {
      resolveFirstCompute = resolve
    })
    readTrancheMock.mockImplementationOnce(async () => {
      await firstComputeGate
      return buildDetail()
    })

    // Two overlapping refreshes for the same (owner, repo, slug) tuple.
    void forceRefresh('vinaya-studio-shell-v1')
    await vi.waitFor(() => expect(readTrancheMock).toHaveBeenCalledTimes(1))
    void forceRefresh('vinaya-studio-shell-v1')

    // Let any microtasks the second call might have queued run.
    await Promise.resolve()
    await Promise.resolve()

    // The second call's `refreshInBackground` bailed out via the
    // `inFlightRefreshes` guard before calling `readTranche` again.
    expect(readTrancheMock).toHaveBeenCalledTimes(1)

    resolveFirstCompute()
    await vi.waitFor(() => expect(writeCacheEnvelopeMock).toHaveBeenCalledTimes(1))
  })

  it('a refresh started after the first one finishes is allowed to run (the dedup set is cleared in `finally`)', async () => {
    await forceRefresh('vinaya-studio-shell-v1')
    await vi.waitFor(() => expect(writeCacheEnvelopeMock).toHaveBeenCalledTimes(1))

    await forceRefresh('vinaya-studio-shell-v1')
    await vi.waitFor(() => expect(writeCacheEnvelopeMock).toHaveBeenCalledTimes(2))

    expect(readTrancheMock).toHaveBeenCalledTimes(2)
  })

  it('forceRefresh is a no-op with no repo resolvable — there is no cache entry to refresh', async () => {
    resolveRepoMock.mockResolvedValue(null)

    await forceRefresh('vinaya-studio-shell-v1')
    await Promise.resolve()

    expect(readTrancheMock).not.toHaveBeenCalled()
    expect(writeCacheEnvelopeMock).not.toHaveBeenCalled()
  })
})

describe('cache key collision resistance (finding 6)', () => {
  it('two different (owner, repo, slug) tuples that would collide under a flattened `__`-joined key hash to different keys', async () => {
    resolveRepoMock.mockResolvedValueOnce({ owner: 'a', repo: 'b__c' })
    await loadTranchePageData('d')
    const keyA = readCacheEnvelopeMock.mock.calls[0]?.[0]

    readCacheEnvelopeMock.mockClear()
    resolveRepoMock.mockResolvedValueOnce({ owner: 'a', repo: 'b' })
    await loadTranchePageData('c__d')
    const keyB = readCacheEnvelopeMock.mock.calls[0]?.[0]

    // `${owner}__${repo}__${slug}` would flatten both tuples to
    // `a__b__c__d` — the hash-based key must not collide.
    expect(keyA).not.toBe(keyB)
    expect(keyA).toMatch(/^[0-9a-f]{64}$/)
    expect(keyB).toMatch(/^[0-9a-f]{64}$/)
  })
})
