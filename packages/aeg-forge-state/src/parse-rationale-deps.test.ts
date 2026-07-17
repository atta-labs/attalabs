import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseRationaleDeps } from './parse-rationale-deps'

const FIXTURES = join(__dirname, 'fixtures')
/** Captured verbatim via `gh issue view <n> --json body` on 2026-07-06 — the
 * real bodies the 2026-07-06 spike and this task's own golden comparison
 * were validated against. Static fixtures, not live calls: `bun test` must
 * not depend on network/gh access (CI has no `GH_TOKEN` wired for this job). */
function readIssueBodyFixture(number: 383 | 384 | 509): string {
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

  it('parses multiple separate backtick spans with prose between them (cross-iteration form), inheriting the slug qualifier onto the bare continuation', () => {
    // Regression for Issue #388's real body (aeg-forge-state-v1 3b, #437):
    // the bare continuation span `#372` is ALSO an aeg-governance-hardening
    // reference — it must inherit that slug, not resolve as this
    // iteration's own #372.
    const body =
      '**Dependency rationale** — `Depends-on: aeg-governance-hardening #368` (task 26) and `#372` (task 28): both reshape the surface.\n\n**Traps to avoid** — none.'
    expect(parseRationaleDeps(body)).toEqual({
      dependsOn: ['aeg-governance-hardening #368', 'aeg-governance-hardening #372'],
      conflictsWith: []
    })
  })

  it('does NOT attach a spurious slug to a same-iteration bare-then-bare sequence', () => {
    const body =
      '**Dependency rationale** — `Depends-on: 1` (rationale prose) and `2` (more prose): both same-iteration tasks.\n\n**Traps to avoid** — none.'
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: ['1', '2'], conflictsWith: [] })
  })

  it('resets slug inheritance after one bare span, so a THIRD span does not inherit a stale qualifier', () => {
    const body =
      "**Dependency rationale** — `Depends-on: aeg-governance-hardening #368` (task 26), `#372` (task 28, inherits), and `5` (this iteration's own task, must NOT inherit).\n\n**Traps to avoid** — none."
    expect(parseRationaleDeps(body)).toEqual({
      dependsOn: ['aeg-governance-hardening #368', 'aeg-governance-hardening #372', '5'],
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

  it("does NOT re-parse a prose-cited historical field as a live edge (Issue #509's real body)", () => {
    // Regression for Issue #509 ([vinaya-pages-v1] 2): the `Depends-on: 1`
    // labeled span is the live declaration; the LATER `Depends-on: 2` span
    // is prose citing a removed historical edge (an Amendment explaining why
    // it no longer applies), not a fresh re-declaration. Before the fix this
    // resolved to `dependsOn: ['1', '2']`, and since #509 was renumbered to
    // task id "2" in the same amendment, edge "2" self-referenced #509.
    const body = readIssueBodyFixture(509)
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: ['1'], conflictsWith: [] })
  })

  it('does NOT duplicate an id that a later bare span merely re-mentions in prose (Issue #569 regression)', () => {
    // Regression for Issue #569 ([vinaya-pages-v1] 9): `Conflicts-with: #570`
    // is the live declaration; the later bare `#570` span is plain prose
    // ("the `#570` edge is sequencing, not exclusion...") re-mentioning the
    // SAME id, not a continuation value. Before the fix this resolved to
    // conflictsWith: ['#570', '#570'], which propagated to a React key
    // collision in Vinaya Studio's task table (DepList, page.tsx).
    const body =
      '**Dependency rationale** — `Depends-on: —`. `Conflicts-with: #570`. The `#570` edge is sequencing, not exclusion: task 10 re-derives `/known-limits`.\n\n**Traps to avoid** — none.'
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: [], conflictsWith: ['#570'] })
  })

  it('returns empty edges when the body has no Dependency rationale section', () => {
    expect(parseRationaleDeps('**Boundary** — some text with `a backtick span` in it.')).toEqual({
      dependsOn: [],
      conflictsWith: []
    })
  })
})
