import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { parseRationaleDeps } from './parse-rationale-deps'

function fetchIssueBody(number: number): string {
  const out = execFileSync(
    'gh',
    ['issue', 'view', String(number), '--repo', 'daniboomerang/attalabs', '--json', 'body'],
    {
      encoding: 'utf8'
    }
  )
  return (JSON.parse(out) as { body: string }).body
}

describe('parseRationaleDeps', () => {
  it('parses the dash-empty form (`Depends-on: —`) as no edges', () => {
    const body =
      '**Dependency rationale** — `Depends-on: —`. First task; independently buildable.\n\n**Traps to avoid** — none.'
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: [], conflictsWith: [] })
  })

  it('parses a single comma-joined backtick span (topology-cell convention)', () => {
    const body = '**Dependency rationale** — `Depends-on: 1, 2`, `Conflicts-with: 3`.\n\n**Traps to avoid** — none.'
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: ['1', '2'], conflictsWith: ['3'] })
  })

  it('parses multiple separate backtick spans with prose between them (cross-iteration form)', () => {
    const body =
      '**Dependency rationale** — `Depends-on: aeg-governance-hardening #368` (task 26) and `#372` (task 28): both reshape the surface.\n\n**Traps to avoid** — none.'
    expect(parseRationaleDeps(body)).toEqual({
      dependsOn: ['aeg-governance-hardening #368', '#372'],
      conflictsWith: []
    })
  })

  it("parses Issue #383's real body — two separate backtick spans, `1` then `2`", () => {
    const body = fetchIssueBody(383)
    const result = parseRationaleDeps(body)
    expect(result.dependsOn).toContain('1')
    expect(result.dependsOn).toContain('2')
    expect(result.dependsOn).toEqual(['1', '2'])
  })

  it('returns empty edges when the body has no Dependency rationale section', () => {
    expect(parseRationaleDeps('**Boundary** — some text with `a backtick span` in it.')).toEqual({
      dependsOn: [],
      conflictsWith: []
    })
  })
})
