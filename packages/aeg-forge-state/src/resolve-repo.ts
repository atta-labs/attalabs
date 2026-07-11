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

let cached: RepoRef | null | undefined

export async function resolveRepo(): Promise<RepoRef | null> {
  if (cached !== undefined) return cached

  const fromEnv = process.env.AEG_REPO
  if (fromEnv) {
    const parsed = parseOwnerRepo(fromEnv)
    if (parsed) {
      cached = parsed
      return cached
    }
  }

  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { env: systemEnv, timeout: 5000 })
    const parsed = parseGitRemoteUrl(stdout.trim())
    cached = parsed
    return cached
  } catch {
    cached = null
    return cached
  }
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
