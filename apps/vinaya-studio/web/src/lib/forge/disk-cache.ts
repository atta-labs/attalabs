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
import crypto from 'node:crypto'
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
 *  failed/not-found lookup is never cached.
 *
 *  Writes to a sibling temp file first, then `fs.rename()`s it into place.
 *  `fs.rename` is atomic on POSIX (same filesystem, which a sibling file
 *  guarantees) — a concurrent `readCacheEnvelope` either sees the old
 *  complete file or the new complete file, never a torn write from a direct
 *  `fs.writeFile` that would fail `JSON.parse` and force a false cold
 *  recompute.
 *
 *  The cache dir and file are created with restrictive permissions (`0o700`/
 *  `0o600`): this data — repo/PR state and token-ledger cost figures — must
 *  not be world-readable on a shared machine. `fs.writeFile`'s own `mode`
 *  option only applies when the file doesn't already exist, so the temp
 *  file's mode is set explicitly at open, and the final path gets an
 *  explicit `fs.chmod` after the rename in case an earlier version of this
 *  file (pre-fix) already exists there with the old, looser mode. */
export async function writeCacheEnvelope<T>(key: string, data: T): Promise<void> {
  const envelope: CacheEnvelope<T> = { storedAt: Date.now(), data }
  // `mkdir`'s own `mode` option, like `writeFile`'s, only applies when the
  // directory doesn't already exist — it's a documented no-op on an
  // already-existing directory's mode. An explicit `chmod` re-tightens it
  // in case an earlier version of this cache dir (pre-fix) already exists
  // there with the old, looser mode.
  await fs.mkdir(cacheRoot(), { recursive: true, mode: 0o700 })
  await fs.chmod(cacheRoot(), 0o700)
  const finalPath = filePathFor(key)
  // The random suffix (not just pid+timestamp) matters: two concurrent
  // writers in the SAME process can land in the same millisecond (e.g. a
  // cold compute and an independently-triggered background refresh racing
  // for the same not-yet-cached key), and `process.pid` is identical for
  // both — without it they could pick the same temp path and one writer's
  // `fs.rename` would race the other's `fs.writeFile`.
  const unique = `${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString('hex')}`
  const tmpPath = path.join(path.dirname(finalPath), `.${path.basename(finalPath)}.${unique}.tmp`)
  try {
    await fs.writeFile(tmpPath, JSON.stringify(envelope, replacer), { encoding: 'utf8', mode: 0o600 })
    await fs.rename(tmpPath, finalPath)
    await fs.chmod(finalPath, 0o600)
  } catch (err) {
    await fs.rm(tmpPath, { force: true })
    throw err
  }
}
