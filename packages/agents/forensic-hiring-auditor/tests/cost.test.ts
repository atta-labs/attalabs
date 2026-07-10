// estimatedCostUsd round-trip — herald-hardening-v1 Task 11
//
// run()'s LLM execution is not mocked in this package (no existing harness
// for it), so this exercises the same merge + validate + serialize path
// run() and the API route rely on: attach estimatedCostUsd onto a parsed
// MatchReport, validate against MatchReportSchema, then survive a JSON
// round trip (what route.ts's NextResponse.json(report) does in practice).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { MatchReportSchema } from '../src/schema'

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures')

function loadFixture(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const { _fixture_meta: _, ...rest } = parsed
  return rest
}

describe('MatchReport.estimatedCostUsd', () => {
  it('survives the attach → validate → JSON round trip', () => {
    const base = loadFixture(join(FIXTURES_DIR, 'after/alex-chen-frontend-web3.json'))
    const withCost = { ...base, estimatedCostUsd: 0.0105 }

    const validated = MatchReportSchema.parse(withCost)
    expect(validated.estimatedCostUsd).toBe(0.0105)

    const roundTripped = JSON.parse(JSON.stringify(validated))
    expect(roundTripped.estimatedCostUsd).toBe(0.0105)
  })

  it('is optional — a report without it still validates', () => {
    const base = loadFixture(join(FIXTURES_DIR, 'after/alex-chen-frontend-web3.json'))

    const validated = MatchReportSchema.parse(base)
    expect(validated.estimatedCostUsd).toBeUndefined()
  })
})
