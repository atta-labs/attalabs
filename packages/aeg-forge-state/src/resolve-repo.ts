/**
 * Discovers the `{ owner, repo }` for the current Studio repository.
 *
 * Resolution order:
 *   1. `AEG_REPO` env (`owner/repo`).
 *   2. `git remote get-url origin`, parsed against common GitHub URL shapes.
 *
 * Returns `null` when discovery fails — callers degrade gracefully (no PR
 * fetch, no live status), matching the no-token contract of the rest of the
 * forge adapter (`fetchForgeFacts`). Never throws.
 *
 * Caching distinguishes *deterministic* from *transient* outcomes: a parsed
 * `AEG_REPO`, and any outcome of a git-remote lookup that *succeeded* (even a
 * parsed `null` from an unrecognizable URL — deterministic, same every call),
 * are cached for the process lifetime. A git-remote lookup that *throws*
 * (timeout, spawn failure) is NOT cached — it returns `null` and warns, and
 * the next call retries. Otherwise one transient failure during a dev-server
 * startup burst would poison the cache for the whole process, making Studio
 * render "No active tranches" indistinguishably from truth.
 *
 * SERVER-ONLY. Pulls `node:child_process` to invoke `git`.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const systemEnv = {
  ...process.env,
  PATH: [process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean).join(':')
}

export type RepoRef = { owner: string; repo: string }

/** The `git remote get-url origin` invocation, injectable for tests. */
export type ResolveRepoExec = () => Promise<{ stdout: string }>

const defaultExec: ResolveRepoExec = () =>
  execFileAsync('git', ['remote', 'get-url', 'origin'], { env: systemEnv, timeout: 5000 })

let cached: RepoRef | null | undefined
let inflight: Promise<RepoRef | null> | undefined

/** Clears the module-level cache. Test-only seam so both the cached and the
 * retry branches can be exercised deterministically. */
export function resetResolveRepoCache(): void {
  cached = undefined
  inflight = undefined
}

export async function resolveRepo(exec: ResolveRepoExec = defaultExec): Promise<RepoRef | null> {
  if (cached !== undefined) return cached

  const fromEnv = process.env.AEG_REPO
  if (fromEnv) {
    const parsed = parseOwnerRepo(fromEnv)
    if (parsed) {
      cached = parsed
      return cached
    }
  }

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const { stdout } = await exec()
      // Exec succeeded — the result is deterministic (same remote URL every
      // call), so cache it even when the URL is unparseable (`null`).
      cached = parseGitRemoteUrl(stdout.trim())
      return cached
    } catch (err) {
      // Transient failure (timeout, spawn error). Do NOT cache — retry next call.
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[aeg-forge-state] resolveRepo: git remote lookup failed (will retry): ${message}`)
      return null
    } finally {
      inflight = undefined
    }
  })()

  return inflight
}

function parseGitRemoteUrl(url: string): RepoRef | null {
  // git@github.com:owner/repo.git
  const ssh = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/)
  if (ssh?.[1] && ssh[2]) return { owner: ssh[1], repo: ssh[2] }

  // https://github.com/owner/repo(.git)
  const https = url.match(/^https?:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/)
  if (https?.[1] && https[2]) return { owner: https[1], repo: https[2] }

  return null
}

function parseOwnerRepo(value: string): RepoRef | null {
  const match = value.match(/^([^/]+)\/(.+)$/)
  if (!match?.[1] || !match[2]) return null
  return { owner: match[1], repo: match[2] }
}
