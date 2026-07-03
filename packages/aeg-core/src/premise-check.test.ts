import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { checkPremises, parsePremiseBlock } from './premise-check'

describe('parsePremiseBlock', () => {
  it('parses bold-inline header + bullet lines', () => {
    const body = `## Summary

**Premise:**
- packages/aeg-core/src/docs/surfaced-manifest.ts contains: export function isSurfacedDoc
- apps/herald-ai/web/src/lib/prompts.ts absent: SKEPTICAL_AUDITOR_PROMPT

## Test plan
`
    const assertions = parsePremiseBlock(body)
    expect(assertions).toEqual([
      {
        kind: 'contains',
        path: 'packages/aeg-core/src/docs/surfaced-manifest.ts',
        value: 'export function isSurfacedDoc'
      },
      { kind: 'absent', path: 'apps/herald-ai/web/src/lib/prompts.ts', value: 'SKEPTICAL_AUDITOR_PROMPT' }
    ])
  })

  it('parses a heading-style header', () => {
    const body = `### Premise
- src/foo.ts contains: export function foo
`
    expect(parsePremiseBlock(body)).toEqual([{ kind: 'contains', path: 'src/foo.ts', value: 'export function foo' }])
  })

  it('parses sha256 assertions', () => {
    const body = `**Premise:**
- src/bar.ts sha256: abc123
`
    expect(parsePremiseBlock(body)).toEqual([{ kind: 'sha256', path: 'src/bar.ts', value: 'abc123' }])
  })

  it('returns empty array when no Premise section exists', () => {
    expect(parsePremiseBlock('## Summary\nNothing here.\n')).toEqual([])
  })

  it('stops the block at the first blank line', () => {
    const body = `**Premise:**
- src/a.ts contains: foo

- src/b.ts contains: bar
`
    expect(parsePremiseBlock(body)).toEqual([{ kind: 'contains', path: 'src/a.ts', value: 'foo' }])
  })

  it('stops the block at the first malformed bullet', () => {
    const body = `**Premise:**
- src/a.ts contains: foo
this is not a bullet
- src/b.ts contains: bar
`
    expect(parsePremiseBlock(body)).toEqual([{ kind: 'contains', path: 'src/a.ts', value: 'foo' }])
  })

  it('is case-insensitive on the assertion kind', () => {
    const body = `**Premise:**
- src/a.ts CONTAINS: foo
`
    expect(parsePremiseBlock(body)).toEqual([{ kind: 'contains', path: 'src/a.ts', value: 'foo' }])
  })
})

describe('checkPremises', () => {
  const reader = (files: Record<string, string>) => (path: string) => files[path] ?? null

  it('passes when every assertion holds', () => {
    const assertions = parsePremiseBlock('**Premise:**\n- src/a.ts contains: export function foo\n')
    const result = checkPremises(assertions, reader({ 'src/a.ts': 'export function foo() {}' }))
    expect(result).toEqual({ pass: true, failures: [] })
  })

  it('fails when a contains assertion no longer holds', () => {
    const assertions: Array<{ kind: 'contains'; path: string; value: string }> = [
      { kind: 'contains', path: 'src/a.ts', value: 'export function foo' }
    ]
    const result = checkPremises(assertions, reader({ 'src/a.ts': 'export function bar() {}' }))
    expect(result.pass).toBe(false)
    expect(result.failures[0]).toContain('no longer contains')
  })

  it('fails when an absent assertion no longer holds', () => {
    const assertions: Array<{ kind: 'absent'; path: string; value: string }> = [
      { kind: 'absent', path: 'src/a.ts', value: 'DEPRECATED_FLAG' }
    ]
    const result = checkPremises(assertions, reader({ 'src/a.ts': 'const DEPRECATED_FLAG = true' }))
    expect(result.pass).toBe(false)
    expect(result.failures[0]).toContain('but the brief pinned it absent')
  })

  it('fails when the file no longer exists', () => {
    const assertions: Array<{ kind: 'contains'; path: string; value: string }> = [
      { kind: 'contains', path: 'src/gone.ts', value: 'anything' }
    ]
    const result = checkPremises(assertions, reader({}))
    expect(result.pass).toBe(false)
    expect(result.failures[0]).toContain('does not exist on disk')
  })

  it('passes a matching sha256 assertion and fails a mismatched one', () => {
    const content = 'export const x = 1\n'
    const hash = createHash('sha256').update(content).digest('hex')
    const passAssertions: Array<{ kind: 'sha256'; path: string; value: string }> = [
      { kind: 'sha256', path: 'src/x.ts', value: hash }
    ]
    expect(checkPremises(passAssertions, reader({ 'src/x.ts': content })).pass).toBe(true)

    const failAssertions: Array<{ kind: 'sha256'; path: string; value: string }> = [
      { kind: 'sha256', path: 'src/x.ts', value: 'deadbeef' }
    ]
    const failResult = checkPremises(failAssertions, reader({ 'src/x.ts': content }))
    expect(failResult.pass).toBe(false)
    expect(failResult.failures[0]).toContain('sha256 mismatch')
  })
})
