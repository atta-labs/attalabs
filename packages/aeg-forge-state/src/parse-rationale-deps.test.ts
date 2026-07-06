import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseRationaleDeps } from './parse-rationale-deps'

const FIXTURES = join(__dirname, 'fixtures')
/** Captured verbatim via `gh issue view <n> --json body` on 2026-07-06 — the
 * real bodies the 2026-07-06 spike and this task's own golden comparison
 * were validated against. Static fixtures, not live calls: `bun test` must
 * not depend on network/gh access (CI has no `GH_TOKEN` wired for this job). */
function readIssueBodyFixture(number: 383 | 384): string {
  return readFileSync(join(FIXTURES, `issue-${number}-body.md`), 'utf8')
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
    const body = readIssueBodyFixture(383)
    const result = parseRationaleDeps(body)
    expect(result.dependsOn).toContain('1')
    expect(result.dependsOn).toContain('2')
    expect(result.dependsOn).toEqual(['1', '2'])
  })

  it("ignores an unrelated backtick span in the same paragraph (Issue #384's `vinaya check` mention)", () => {
    const body = readIssueBodyFixture(384)
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: ['3'], conflictsWith: [] })
  })

  it('returns empty edges when the body has no Dependency rationale section', () => {
    expect(parseRationaleDeps('**Boundary** — some text with `a backtick span` in it.')).toEqual({
      dependsOn: [],
      conflictsWith: []
    })
  })
})
