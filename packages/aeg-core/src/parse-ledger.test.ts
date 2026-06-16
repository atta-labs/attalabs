import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLedger } from './parse-ledger'

const FIXTURES = join(__dirname, 'fixtures')
const aegUiTokensMd = readFileSync(join(FIXTURES, 'aeg-ui-v1.tokens.md'), 'utf8')

describe('parseLedger: aeg-ui-v1.tokens.md (sibling-file form)', () => {
  const rows = parseLedger(aegUiTokensMd)

  it('parses all 4 rows in source order — re-entry rows preserved', () => {
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.phase)).toEqual(['planning', '9: brief', '9: develop', '9: develop'])
  })

  it('reads em-dash cells as null (claude.ai rows pending Principal fill)', () => {
    const planner = rows[0]
    expect(planner?.role).toBe('Planner')
    expect(planner?.tokensIn).toBeNull()
    expect(planner?.tokensOut).toBeNull()
    expect(planner?.cost).toBeNull()
    expect(planner?.date).toBe('2026-06-13')
  })

  it('reads numeric cells exactly (terminal Developer self-report)', () => {
    const dev = rows[2]
    expect(dev?.role).toBe('Developer')
    expect(dev?.agentModel).toBe('claude-opus-4-7 (CC)')
    expect(dev?.tokensIn).toBe(184327)
    expect(dev?.tokensOut).toBe(12502)
    expect(dev?.cost).toBeCloseTo(3.4781, 4)
    expect(dev?.date).toBe('2026-06-15')
  })

  it('preserves a second `9: develop` row verbatim — re-entry is a new row, never an edit', () => {
    const retry = rows[3]
    expect(retry?.phase).toBe('9: develop')
    expect(retry?.tokensIn).toBe(2150)
    expect(retry?.tokensOut).toBe(320)
    expect(retry?.cost).toBeCloseTo(0.0512, 4)
  })
})

describe('parseLedger: alternative formats', () => {
  it('reads a `## Token ledger` section inside an iteration file (inline form)', () => {
    const md = [
      '# Iteration: x — June 2026',
      '',
      '## Token ledger',
      '',
      '| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |',
      '|-------|------|-------------|-----------|------------|------|------|',
      '| planning | Planner | claude-opus-4-7 (chat) | — | — | — | 2026-06-15 |',
      ''
    ].join('\n')
    const rows = parseLedger(md)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.role).toBe('Planner')
  })

  it('returns [] when no Token ledger section is present', () => {
    expect(parseLedger('# Some other doc\n\nNo ledger here.')).toEqual([])
  })

  it('skips a malformed row (< 7 columns) without throwing', () => {
    const md = [
      '# Token ledger',
      '',
      '| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |',
      '|-------|------|-------------|-----------|------------|------|------|',
      '| planning | Planner | claude-opus-4-7 | 0 | 0 | $0.00 | 2026-06-15 |',
      '| broken | Planner |', // 3 cells — skipped
      ''
    ].join('\n')
    expect(parseLedger(md).map((r) => r.phase)).toEqual(['planning'])
  })

  it('skips a row with an empty Phase cell (no row identity)', () => {
    const md = [
      '# Token ledger',
      '',
      '| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |',
      '|-------|------|-------------|-----------|------------|------|------|',
      '|  | Planner | claude-opus-4-7 | 0 | 0 | $0.00 | 2026-06-15 |',
      ''
    ].join('\n')
    expect(parseLedger(md)).toEqual([])
  })

  it('tolerates thousand-separator commas in integer cells', () => {
    const md = [
      '# Token ledger',
      '',
      '| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |',
      '|-------|------|-------------|-----------|------------|------|------|',
      '| 9: develop | Developer | claude-opus-4-7 (CC) | 184,327 | 12,502 | $3.4781 | 2026-06-15 |',
      ''
    ].join('\n')
    const r = parseLedger(md)[0]
    expect(r?.tokensIn).toBe(184327)
    expect(r?.tokensOut).toBe(12502)
  })

  it('returns null for unparseable numeric cells rather than NaN', () => {
    const md = [
      '# Token ledger',
      '',
      '| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |',
      '|-------|------|-------------|-----------|------------|------|------|',
      '| 9: develop | Developer | claude-opus-4-7 | not-a-number | 12 | $abc | 2026-06-15 |',
      ''
    ].join('\n')
    const r = parseLedger(md)[0]
    expect(r?.tokensIn).toBeNull()
    expect(r?.tokensOut).toBe(12)
    expect(r?.cost).toBeNull()
  })
})
