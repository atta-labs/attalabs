/**
 * Token discovery for the local GitHub read adapter.
 *
 * Resolution order (read-only scope is all we need):
 *   1. Explicit token passed by the caller
 *   2. process.env.GITHUB_TOKEN
 *   3. process.env.GH_TOKEN
 *   4. `gh auth token` (the locally-authenticated GitHub CLI)
 *
 * Returns `null` when none of the above yields a token — `fetchForgeFacts`
 * then short-circuits to the graceful no-token snapshot. We never throw here;
 * the brief's degradation trap is explicit: Studio must render before GitHub
 * is reachable.
 *
 * SERVER-ONLY. This module imports `node:child_process` to invoke the local
 * `gh` CLI — that import alone makes Next.js refuse to bundle this file into
 * a client component. The token must never reach the browser.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Augment PATH so `gh` resolves under macOS Homebrew and the typical install
// locations even when Next/Bun launches with a minimal environment.
const systemEnv = {
  ...process.env,
  PATH: [process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean).join(':')
}

export async function resolveGithubToken(explicit?: string): Promise<string | null> {
  if (explicit && explicit.length > 0) return explicit
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN

  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], { env: systemEnv, timeout: 5000 })
    const token = stdout.trim()
    return token.length > 0 ? token : null
  } catch {
    return null
  }
}
