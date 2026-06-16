import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLedger } from './parse-ledger'
import { sumLedger } from './sum-ledger'

const FIXTURES = join(__dirname, 'fixtures')
const aegUiTokensMd = readFileSync(join(FIXTURES, 'aeg-ui-v1.tokens.md'), 'utf8')

describe('sumLedger', () => {
  it('sums tokens and cost over rows, treating nulls as zero', () => {
    const totals = sumLedger(parseLedger(aegUiTokensMd))
    // Two terminal Developer rows: 184327+2150 in, 12502+320 out, 3.4781+0.0512 cost.
    // Two claude.ai rows (Planner, Brief Author) contribute zero — null cells do not inflate.
    expect(totals.tokensIn).toBe(186477)
    expect(totals.tokensOut).toBe(12822)
    expect(totals.cost).toBeCloseTo(3.5293, 4)
    expect(totals.rows).toBe(4)
  })

  it('returns the identity for an empty ledger', () => {
    expect(sumLedger([])).toEqual({ tokensIn: 0, tokensOut: 0, cost: 0, rows: 0 })
  })

  it('counts a row even when every numeric cell is null (pending Principal fill)', () => {
    const rows = parseLedger(
      [
        '# Token ledger',
        '',
        '| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |',
        '|-------|------|-------------|-----------|------------|------|------|',
        '| planning | Planner | claude-opus-4-7 (chat) | — | — | — | 2026-06-15 |',
        ''
      ].join('\n')
    )
    const totals = sumLedger(rows)
    expect(totals).toEqual({ tokensIn: 0, tokensOut: 0, cost: 0, rows: 1 })
  })

  it('re-entry rows add to the total — the same `Phase` repeated is summed, never replaced', () => {
    // Two `9: develop` rows in the fixture stand for an initial dispatch + a
    // post-CHANGES_REQUESTED retry; both contribute.
    const rows = parseLedger(aegUiTokensMd).filter((r) => r.phase === '9: develop')
    expect(rows).toHaveLength(2)
    const totals = sumLedger(rows)
    expect(totals.tokensIn).toBe(186477)
    expect(totals.tokensOut).toBe(12822)
  })
})
