/**
 * Generic on-disk JSON cache for server-derived data that must survive
 * dev-server restarts. Lives under the OS cache dir (`$XDG_CACHE_HOME` if
 * set, else `~/.cache`) — outside the repo tree entirely, so it is never
 * committed and never read by the CLI (task `vinaya-studio-shell-v1` 1,
 * #1053's Boundary criterion).
 *
 * `Map` values are serialized explicitly: `ForgeFacts`/`LedgerRow[]`/
 * `DispatchResult` snapshots live in `Map`s throughout `src/lib/forge`, and a
 * bare `JSON.stringify` silently drops them (renders as `{}`). The
 * replacer/reviver pair below round-trips any `Map`, at any depth, back to a
 * real `Map` instance — not a plain object.
 *
 * SERVER-ONLY.
 */

import 'server-only'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type CacheEnvelope<T> = {
  /** `Date.now()` at write time — the age line ("snapshot from HH:MM") and
   *  the TTL check both read this. */
  storedAt: number
  data: T
}

let cacheRootOverride: string | null = null

/** Test-only: points every read/write at an isolated temp directory. Not exported from any public index. */
export function __setDiskCacheRootForTests(dir: string | null): void {
  cacheRootOverride = dir
}

function cacheRoot(): string {
  if (cacheRootOverride) return cacheRootOverride
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache')
  return path.join(base, 'vinaya-studio')
}

function filePathFor(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_.-]/g, '_')
  return path.join(cacheRoot(), `${safe}.json`)
}

type SerializedMap = { __type: 'Map'; entries: Array<[unknown, unknown]> }

function isSerializedMap(value: unknown): value is SerializedMap {
  return typeof value === 'object' && value !== null && (value as { __type?: unknown }).__type === 'Map'
}

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    const entry: SerializedMap = { __type: 'Map', entries: Array.from(value.entries()) }
    return entry
  }
  return value
}

function reviver(_key: string, value: unknown): unknown {
  if (isSerializedMap(value)) return new Map(value.entries)
  return value
}

/** Reads a stored envelope, or `null` when absent/corrupt. A read never
 *  throws — a corrupt or missing cache file degrades to "cold", the same as
 *  no cache ever having been written. */
export async function readCacheEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await fs.readFile(filePathFor(key), 'utf8')
    return JSON.parse(raw, reviver) as CacheEnvelope<T>
  } catch {
    return null
  }
}

/** Writes `data` under `key`, stamping `storedAt` as now. Only ever called
 *  with a successfully-derived value — per `resolve-repo.ts`'s own rule, a
 *  failed/not-found lookup is never cached. */
export async function writeCacheEnvelope<T>(key: string, data: T): Promise<void> {
  const envelope: CacheEnvelope<T> = { storedAt: Date.now(), data }
  await fs.mkdir(cacheRoot(), { recursive: true })
  await fs.writeFile(filePathFor(key), JSON.stringify(envelope, replacer), 'utf8')
}
