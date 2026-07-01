/**
 * GET /api/coherence
 *
 * Calls the plan↔forge oracle (`scripts/verify-coherence.ts`) via a Bun
 * subprocess and returns its JSON report. The Studio renders the output;
 * no check logic is re-implemented here.
 *
 * Token resolution: inherits GITHUB_TOKEN / GH_TOKEN / `gh auth token` from
 * the server process — same env pattern as `fetchForgeFacts` / `github-token.ts`.
 * When no token is available the oracle itself returns `forgeUnavailable: true`
 * so the client can show a degraded warning rather than crashing.
 *
 * Exit-code contract: oracle exits 0 on all-pass, 1 on any failure, but always
 * emits valid JSON on stdout — both exit paths are handled.
 *
 * SERVER-ONLY (Next.js App Router API route).
 */

import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { findAegRoot } from '@/lib/aeg-fs'
import { resolveRepo } from '@/lib/forge/resolve-repo'

const execFileAsync = promisify(execFile)

// Augment PATH so `bun` resolves across common install locations even when
// Next.js launches with a minimal shell environment.
function buildEnv(): NodeJS.ProcessEnv {
  const extra = [
    process.env.HOME ? path.join(process.env.HOME, '.bun', 'bin') : null,
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin'
  ].filter(Boolean)
  return { ...process.env, PATH: [process.env.PATH, ...extra].filter(Boolean).join(':') }
}

export type CheckFailure = {
  issue?: number | null
  iteration: string
  task?: string
  reason: string
}

export type CheckResult = {
  check: string
  status: 'pass' | 'fail' | 'info'
  failures: CheckFailure[]
  note?: string
}

export type CoherenceResponse = {
  summary: { passed: number; failed: number; info: number }
  forgeUnavailable: boolean
  checks: CheckResult[]
  repo: { owner: string; repo: string } | null
  /** Set when the oracle subprocess itself failed (infra error, not a check failure). */
  oracleError?: string
}

export async function GET(): Promise<NextResponse<CoherenceResponse>> {
  let aegRoot: string
  try {
    aegRoot = findAegRoot()
  } catch {
    return NextResponse.json({
      summary: { passed: 0, failed: 0, info: 0 },
      forgeUnavailable: true,
      checks: [],
      repo: null,
      oracleError: 'Could not locate aeg-root — Studio not running inside the repo.'
    })
  }

  const repoRoot = path.dirname(aegRoot)
  const scriptPath = path.join(repoRoot, 'scripts', 'verify-coherence.ts')
  const env = buildEnv()

  let stdout: string
  try {
    const result = await execFileAsync('bun', [scriptPath, '--json'], {
      env,
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024
    })
    stdout = result.stdout
  } catch (execErr: unknown) {
    // Exit code 1 = check failures — oracle still emits valid JSON on stdout.
    const maybeStdout =
      execErr && typeof execErr === 'object' && 'stdout' in execErr
        ? String((execErr as { stdout: unknown }).stdout).trim()
        : ''
    if (maybeStdout.startsWith('{')) {
      stdout = maybeStdout
    } else {
      const msg = execErr instanceof Error ? execErr.message : 'oracle subprocess failed'
      return NextResponse.json({
        summary: { passed: 0, failed: 0, info: 0 },
        forgeUnavailable: true,
        checks: [],
        repo: null,
        oracleError: msg
      })
    }
  }

  let parsed: {
    summary: { passed: number; failed: number; info: number }
    forgeUnavailable: boolean
    checks: CheckResult[]
  }
  try {
    parsed = JSON.parse(stdout) as typeof parsed
  } catch {
    return NextResponse.json({
      summary: { passed: 0, failed: 0, info: 0 },
      forgeUnavailable: true,
      checks: [],
      repo: null,
      oracleError: 'oracle output was not valid JSON'
    })
  }

  const repo = await resolveRepo()
  return NextResponse.json({ ...parsed, repo })
}
