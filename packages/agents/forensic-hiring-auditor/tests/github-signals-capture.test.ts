// githubSignals capture — herald-hardening-v1 Task 13
//
// Two things are tested here:
// 1. MatchReport.githubSignals survives the attach → validate → JSON round
//    trip, same pattern as estimatedCostUsd in task 11 (no mocked run()/LLM
//    execution — no existing harness for that in this package).
// 2. createGithubSignalToolHandler's per-invocation capture is genuinely
//    isolated across concurrent calls — not asserted by code-reading alone,
//    exercised for real against two concurrent handlers sharing the same
//    process.env.GITHUB_PAT but auditing two different handles.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MatchReportSchema } from '../src/schema'
import { createGithubSignalToolHandler } from '../src/tools/github-signals'
import type { RawSignal } from '../src/tools/github-signals'

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures')

function loadFixture(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const { _fixture_meta: _, ...rest } = parsed
  return rest
}

describe('MatchReport.githubSignals', () => {
  it('survives the attach → validate → JSON round trip', () => {
    const base = loadFixture(join(FIXTURES_DIR, 'after/alex-chen-frontend-web3.json'))
    const signal: RawSignal = {
      type: 'architecture',
      evidence: 'Detected: Turborepo monorepo configuration (turbo.json)',
      source: { repo: 'alex-chen/example', file: 'turbo.json', isPrivate: false },
      confidence: 'high'
    }
    const withSignals = { ...base, githubSignals: [signal] }

    const validated = MatchReportSchema.parse(withSignals)
    expect(validated.githubSignals).toEqual([signal])

    const roundTripped = JSON.parse(JSON.stringify(validated))
    expect(roundTripped.githubSignals).toEqual([signal])
  })

  it('is optional — a report without it still validates', () => {
    const base = loadFixture(join(FIXTURES_DIR, 'after/alex-chen-frontend-web3.json'))

    const validated = MatchReportSchema.parse(base)
    expect(validated.githubSignals).toBeUndefined()
  })
})

describe('createGithubSignalToolHandler — per-invocation isolation', () => {
  const originalFetch = globalThis.fetch
  const originalToken = process.env.GITHUB_PAT

  beforeEach(() => {
    process.env.GITHUB_PAT = 'fake-token-shared-across-both-calls'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.GITHUB_PAT = originalToken
  })

  it('two concurrent handlers auditing different handles never cross-contaminate captured signals', async () => {
    // Each handle owns exactly one repo with exactly one commit, so each
    // handler should capture exactly one signal — its own.
    const reposByUser: Record<string, unknown[]> = {
      alice: [
        {
          full_name: 'alice/repo-a',
          name: 'repo-a',
          private: false,
          pushed_at: '2026-01-01T00:00:00Z',
          default_branch: 'main',
          owner: { login: 'alice', type: 'User' }
        }
      ],
      bob: [
        {
          full_name: 'bob/repo-b',
          name: 'repo-b',
          private: false,
          pushed_at: '2026-01-01T00:00:00Z',
          default_branch: 'main',
          owner: { login: 'bob', type: 'User' }
        }
      ]
    }

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

      const usersReposMatch = url.match(/\/users\/(\w+)\/repos/)
      if (usersReposMatch) {
        const username = usersReposMatch[1] as string
        return ok(reposByUser[username] ?? [])
      }
      if (url.includes('/user/repos')) return ok([])
      if (url.includes('/commits?author=')) {
        return ok([{ sha: 'abc123', commit: { message: 'Initial commit' } }])
      }
      if (url.includes('/search/issues')) return ok({ items: [] })
      if (url.match(/\/repos\/\w+\/[\w-]+\/contents\/package\.json/)) return new Response(null, { status: 404 })
      if (url.match(/\/repos\/\w+\/[\w-]+\/contents$/)) return ok([])
      return new Response(null, { status: 404 })
    }) as typeof fetch

    const aliceCaptured: RawSignal[][] = []
    const bobCaptured: RawSignal[][] = []
    const aliceHandler = createGithubSignalToolHandler((signals) => aliceCaptured.push(signals))
    const bobHandler = createGithubSignalToolHandler((signals) => bobCaptured.push(signals))

    // Run concurrently — this is the actual batch-mode shape (1-10
    // concurrent run() calls), not sequential.
    await Promise.all([aliceHandler({ github_handle: 'alice' }), bobHandler({ github_handle: 'bob' })])

    expect(aliceCaptured).toHaveLength(1)
    expect(bobCaptured).toHaveLength(1)
    expect(aliceCaptured[0]?.every((s) => s.source.repo === 'alice/repo-a')).toBe(true)
    expect(bobCaptured[0]?.every((s) => s.source.repo === 'bob/repo-b')).toBe(true)
    expect(aliceCaptured[0]?.length).toBeGreaterThan(0)
    expect(bobCaptured[0]?.length).toBeGreaterThan(0)
  })
})
