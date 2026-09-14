/**
 * Stale-while-revalidate store for the tranche page's forge-heavy load path
 * (task `vinaya-studio-shell-v1` 1, #1053, O2/O3/O4).
 *
 * `readTranche`, `loadTrancheSnapshot`, `loadDispatchReadiness` and
 * `fetchTrancheTokenLedger` together are the slow part of the page (the
 * Issue's own rationale: 36s-63s, five sequential reads, three fanning out
 * further, `gh` shelled out to synchronously up to three times inside
 * `aeg-forge-state`). `resolveProjectView` is deliberately NOT part of the
 * cached bundle: in a registry-PRESENT repo (a `.vinaya/projects.md` file
 * exists — this repo has one) it really is a local file read, not a forge
 * call — see `read-root.ts`'s `resolveProjectView`. It is still timed at the
 * call site in the page, per O1, but caching it would mean keying the store
 * by project name too for no benefit here.
 *
 * That "no forge call" claim is scoped to registry-present repos only, and
 * this module does not close that gap (found live in review, corrected
 * here rather than left silently wrong): in a registry-ABSENT repo (no
 * `.vinaya/projects.md` anywhere above the walk root), `resolveProjectView`
 * falls through to `forgeDerivedProjectNames()`, which lists and derives
 * every active/archived tranche from the forge — real `gh`/GitHub reads,
 * memoized only per-request via React's `cache()` (see `read-root.ts`'s
 * `cachedListActiveTrancheSlugs`/`cachedDeriveTrancheFromForgeKnown`), not
 * across requests. So on a registry-absent repo, EVERY tranche-page load —
 * warm or cold — still hits the forge through this one uncached call, even
 * though `loadTranchePageData` below is serving everything else from disk.
 * This PR is deliberately scoped to registry-present repos for that O2
 * guarantee; bringing `resolveProjectView`'s registry-absent path into this
 * store (or a store of its own) is left as a follow-up, not silently
 * assumed to already be covered.
 *
 * The cached bundle is keyed by `owner/repo/slug` — repo and tranche, per
 * the brief's Boundary — never by token (`GITHUB_TOKEN` may differ between
 * requests; the derived facts do not). A NOT-FOUND tranche is never cached,
 * mirroring `resolve-repo.ts`'s own rule that a failed lookup is never
 * memoized.
 *
 * Read path (`loadTranchePageData`):
 *   - no cache entry yet            → compute synchronously, write, return fresh
 *   - entry younger than TTL_MS     → return it, zero forge calls
 *   - entry older than TTL_MS       → return the stale entry immediately,
 *                                      AND kick a background refresh (not
 *                                      awaited) that overwrites the entry
 *                                      once done — the NEXT load sees fresh
 *                                      data, per O3.
 *
 * `forceRefresh` (O4) is the same background-refresh primitive, called with
 * no TTL check at all — the visible refresh action's server function.
 *
 * Studio never deploys (`.claude/skills/vinaya-architecture/SKILL.md`), so
 * this module's in-process `inFlightRefreshes` dedup set and its reliance on
 * a long-lived Node process to finish a detached background promise are both
 * safe — there is no serverless cold-start to race against.
 *
 * SERVER-ONLY.
 */

import 'server-only'
import crypto from 'node:crypto'
import type { DispatchResult, LedgerRow } from '@attalabs/aeg-core'
import { resolveRepo } from '@attalabs/aeg-forge-state'
import { readTranche, type TrancheDetail } from '@/lib/repo-state'
import { readCacheEnvelope, writeCacheEnvelope } from './disk-cache'
import { loadDispatchReadiness } from './dispatch-readiness'
import { fetchTrancheTokenLedger, type TokenLedgerSnapshot } from './fetch-token-ledger'
import { loadTrancheSnapshot, type TrancheSnapshot } from './load-snapshot'
import { timeCall } from './timing'

/** Short TTL — the traps section's own phrase. One minute keeps a warm tab
 *  snappy while still catching an Issue edit within a normal review loop. */
const TTL_MS = 60_000

export type TrancheStoreData = {
  detail: TrancheDetail
  snapshot: TrancheSnapshot
  readiness: Map<string, DispatchResult>
  tokenLedger: TokenLedgerSnapshot
}

export type TranchePageResult =
  | { notFound: true }
  | { notFound: false; data: TrancheStoreData; storedAt: number; stale: boolean }

const inFlightRefreshes = new Set<string>()

/** Hashes the `(owner, repo, slug)` tuple rather than flattening it into a
 *  delimited string: repo names can themselves contain `_`, so
 *  `${owner}__${repo}__${slug}` let two different tuples collide on the same
 *  sanitized filename (e.g. owner `a`, repo `b__c`, slug `d` vs. owner `a`,
 *  repo `b`, slug `c__d`). Hashing the tuple as a JSON array removes the
 *  ambiguity the delimiter introduced. */
function cacheKey(owner: string, repo: string, slug: string): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([owner, repo, slug]))
    .digest('hex')
}

async function computeTrancheStoreData(slug: string): Promise<TrancheStoreData | null> {
  const detail = await timeCall('readTranche', () => readTranche(slug))
  if (!detail) return null
  const { tranche, archived } = detail

  const snapshot = await timeCall('loadTrancheSnapshot', () => loadTrancheSnapshot(tranche, slug))

  const readiness = archived
    ? new Map<string, DispatchResult>()
    : await timeCall('loadDispatchReadiness', () => loadDispatchReadiness(tranche, slug, snapshot))

  const snapshotRepo = snapshot.repo
  const tokenLedger: TokenLedgerSnapshot = snapshotRepo
    ? await timeCall('fetchTrancheTokenLedger', () =>
        fetchTrancheTokenLedger({
          owner: snapshotRepo.owner,
          repo: snapshotRepo.repo,
          tranche: slug,
          tasks: tranche.tasks.map((task) => ({ id: String(task.id), issue: task.issue }))
        })
      )
    : {
        ledgers: new Map<string, LedgerRow[]>(),
        unavailable: true,
        reason: 'Could not resolve repository (no git remote found and AEG_REPO unset).'
      }

  return { detail, snapshot, readiness, tokenLedger }
}

async function refreshInBackground(key: string, slug: string): Promise<void> {
  if (inFlightRefreshes.has(key)) return
  inFlightRefreshes.add(key)
  try {
    const data = await computeTrancheStoreData(slug)
    if (data) await writeCacheEnvelope(key, data)
  } catch (err) {
    console.warn(`[tranche-page-snapshot] background refresh failed for "${key}": ${(err as Error).message}`)
  } finally {
    inFlightRefreshes.delete(key)
  }
}

/** The page's read path — cold/no-repo computes inline; warm-and-fresh reads
 *  the store with no forge call; warm-and-stale returns the stale entry and
 *  starts a background refresh for the next load. */
export async function loadTranchePageData(slug: string): Promise<TranchePageResult> {
  const repo = await resolveRepo()
  if (!repo) {
    // Nothing to key a cache entry by, and `computeTrancheStoreData`'s own
    // fallbacks already degrade gracefully with no repo resolvable — no
    // benefit to caching an unreachable-forge result under an unstable key.
    const data = await computeTrancheStoreData(slug)
    if (!data) return { notFound: true }
    return { notFound: false, data, storedAt: Date.now(), stale: false }
  }

  const key = cacheKey(repo.owner, repo.repo, slug)
  const cached = await readCacheEnvelope<TrancheStoreData>(key)

  if (cached) {
    const ageMs = Date.now() - cached.storedAt
    if (ageMs < TTL_MS) {
      return { notFound: false, data: cached.data, storedAt: cached.storedAt, stale: false }
    }
    void refreshInBackground(key, slug)
    return { notFound: false, data: cached.data, storedAt: cached.storedAt, stale: true }
  }

  const data = await computeTrancheStoreData(slug)
  if (!data) return { notFound: true }
  const storedAt = Date.now()
  // Guarded the same way `refreshInBackground` guards its own write: a
  // disk-write failure (permission denied, disk full) must not discard the
  // already-derived `data` and fail the whole page render — it degrades to
  // "this load isn't cached", not "this load 500s".
  try {
    await writeCacheEnvelope(key, data)
  } catch (err) {
    console.warn(`[tranche-page-snapshot] cache write failed for "${key}": ${(err as Error).message}`)
  }
  return { notFound: false, data, storedAt, stale: false }
}

/** The visible refresh action's server-side primitive (O4): forces a
 *  background refresh regardless of the entry's age. A no-op when the repo
 *  can't be resolved at all — there is no cache entry to refresh. */
export async function forceRefresh(slug: string): Promise<void> {
  const repo = await resolveRepo()
  if (!repo) return
  const key = cacheKey(repo.owner, repo.repo, slug)
  void refreshInBackground(key, slug)
}
