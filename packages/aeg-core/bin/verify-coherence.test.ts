import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchProvenance } from './verify-coherence'

/**
 * Regression coverage for aeg-governance-hardening task 20 (#340) — two
 * confirmed root causes in `fetchProvenance`:
 *
 * 1. `timelineItems(first: 1, ...)` fetched the FIRST `ClosedEvent`, not the
 *    most recent, missing provenance on a reopened-then-reclosed issue.
 * 2. Issues closed via explicit `gh issue close` never populate
 *    GitHub's `closer` field, even when a real merged PR did the work.
 *
 * The mock below fakes `@octokit/graphql`'s `graphql.defaults(...)` client,
 * dispatching on whether the outgoing query targets `CLOSED_EVENT` (and
 * whether it uses `last: 1` vs `first: 1`) or `CROSS_REFERENCED_EVENT`, so
 * the fixtures below exercise the exact query shapes `fetchProvenance` emits.
 */

type FixtureCloser = { number: number; body: string; comments: string[] } | null
type FixtureCrossRefSource = { number: number; body: string; comments: string[] }

let closedEventFixtures: Record<number, FixtureCloser[]> = {}
let crossRefFixtures: Record<number, FixtureCrossRefSource[]> = {}

vi.mock('@octokit/graphql', () => ({
  graphql: {
    defaults: () => async (query: string) => {
      const issueNums = [...query.matchAll(/i_(\d+):/g)].map((m) => Number(m[1]))
      const repository: Record<string, unknown> = {}

      if (query.includes('CLOSED_EVENT')) {
        const usesLast = /timelineItems\(last:\s*1/.test(query)
        for (const n of issueNums) {
          const closers = closedEventFixtures[n] ?? []
          const picked = usesLast ? closers[closers.length - 1] : closers[0]
          repository[`i_${n}`] = {
            timelineItems: {
              nodes: [
                {
                  closer: picked
                    ? {
                        number: picked.number,
                        body: picked.body,
                        comments: { nodes: picked.comments.map((body) => ({ body })) }
                      }
                    : null
                }
              ]
            }
          }
        }
      } else if (query.includes('CROSS_REFERENCED_EVENT')) {
        for (const n of issueNums) {
          const sources = crossRefFixtures[n] ?? []
          repository[`i_${n}`] = {
            timelineItems: {
              nodes: sources.map((s) => ({
                source: {
                  number: s.number,
                  body: s.body,
                  comments: { nodes: s.comments.map((body) => ({ body })) }
                }
              }))
            }
          }
        }
      }

      return { repository }
    }
  }
}))

const PROVENANCE_FOR = (issue: number) =>
  `### AEG provenance — task 1 (iteration fixture)\n- Issue:        #${issue}  (closed by merge)\n- Tier:         1`

beforeEach(() => {
  closedEventFixtures = {}
  crossRefFixtures = {}
})

describe('fetchProvenance — Part 1: most-recent-closure', () => {
  it('finds provenance on the most recent closer, not the first (Issue #287 → PR #288 then #313)', async () => {
    closedEventFixtures[287] = [
      { number: 288, body: 'no provenance here', comments: [] },
      { number: 313, body: 'merge commit', comments: [PROVENANCE_FOR(287)] }
    ]

    const result = await fetchProvenance([287], 'owner', 'repo', 'token')

    expect(result.get(287)).toBe(true)
  })

  it('still correctly reports false when the most recent closer genuinely lacks provenance', async () => {
    closedEventFixtures[999] = [{ number: 1000, body: 'no provenance here', comments: [] }]

    const result = await fetchProvenance([999], 'owner', 'repo', 'token')

    expect(result.get(999)).toBe(false)
  })
})

describe('fetchProvenance — Part 2: null-closer fallback', () => {
  it('finds provenance via a cross-referenced merged PR when closer is null (Issue #167 → PR #148)', async () => {
    closedEventFixtures[167] = [null]
    crossRefFixtures[167] = [
      { number: 189, body: 'unrelated mention of #167', comments: [] },
      { number: 148, body: 'the real work', comments: [PROVENANCE_FOR(167)] }
    ]

    const result = await fetchProvenance([167], 'owner', 'repo', 'token')

    expect(result.get(167)).toBe(true)
  })

  it('correctly returns false when closer is null and no cross-referenced PR carries provenance', async () => {
    closedEventFixtures[900] = [null]
    crossRefFixtures[900] = [{ number: 901, body: 'mentions #900 in passing', comments: [] }]

    const result = await fetchProvenance([900], 'owner', 'repo', 'token')

    expect(result.get(900)).toBe(false)
  })

  it('does not false-positive on a cross-referenced PR carrying provenance for a DIFFERENT issue', async () => {
    // Mirrors live data: PR #193 mentions #170 in passing but its own
    // provenance block targets #171; PR #321 mentions #168 but targets #282.
    closedEventFixtures[170] = [null]
    crossRefFixtures[170] = [{ number: 193, body: 'references #170', comments: [PROVENANCE_FOR(171)] }]

    const result = await fetchProvenance([170], 'owner', 'repo', 'token')

    expect(result.get(170)).toBe(false)
  })

  it('resolves a mixed batch independently per issue', async () => {
    closedEventFixtures[287] = [
      { number: 288, body: '', comments: [] },
      { number: 313, body: '', comments: [PROVENANCE_FOR(287)] }
    ]
    closedEventFixtures[167] = [null]
    crossRefFixtures[167] = [{ number: 148, body: '', comments: [PROVENANCE_FOR(167)] }]
    closedEventFixtures[900] = [null]
    crossRefFixtures[900] = []

    const result = await fetchProvenance([287, 167, 900], 'owner', 'repo', 'token')

    expect(result.get(287)).toBe(true)
    expect(result.get(167)).toBe(true)
    expect(result.get(900)).toBe(false)
  })
})

/**
 * Regression coverage for the PR #378 review (aeg-governance-hardening task
 * 24, #364): `--json` mode's stdout must be pure, parseable JSON — nothing
 * else (a stray `console.log`/`console.warn`, or noise leaking from a
 * shelled-out command like the item-5 `git fetch origin main`) may write to
 * it, because the `coherence-gate` CI job captures stdout+stderr combined
 * into one file and feeds it straight to `jq`. Spawns the real CLI as a
 * subprocess (not the in-process `runCoherenceChecks`) so this actually
 * exercises the same stdio path CI does, including the real `git fetch`
 * this file's `loadIterationFiles` now performs.
 *
 * Timeout raised 30s → 60s (aeg-forge-state-v1 3b, #437): `loadIterationFiles`
 * now derives each non-touched iteration from the forge (one `gh` round trip
 * per iteration, sequential) instead of a local `git show` — ~30s observed
 * across this repo's real ~20 iterations, leaving no margin under the old
 * 30s budget.
 */
describe('CLI --json mode produces pure JSON on stdout (PR #378 review)', () => {
  it('parses as JSON with no leading/trailing noise, regardless of exit code', () => {
    const scriptPath = join(import.meta.dirname, 'verify-coherence.ts')
    // Exit code is 1 when the oracle finds a real `fail` — not a script
    // error. Read stdout from the thrown error in that case too (mirrors
    // `verify-dispatch.ts`'s `captureCombinedOutput`), so this test asserts
    // JSON purity independent of the repo's current coherence state.
    let out: string
    try {
      out = execFileSync('bun', [scriptPath, '--json'], { encoding: 'utf8', timeout: 120_000 })
    } catch (err) {
      out = (err as { stdout?: string }).stdout ?? ''
    }
    expect(() => JSON.parse(out)).not.toThrow()
    const parsed = JSON.parse(out)
    expect(parsed).toHaveProperty('summary')
    expect(parsed).toHaveProperty('checks')
  }, 120_000)
})
