import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { amendRationaleDeps } from './amend-rationale-deps'
import { parseRationaleDeps } from './parse-rationale-deps'

const FIXTURES = join(__dirname, 'fixtures')

/** Real Issue bodies captured verbatim via `gh issue view <n> --json body` on
 * 2026-07-13 — the actual drifted-class bodies (#429/#388/#382) this task
 * exists to protect. Static fixtures, not live calls: `bun test` must not
 * depend on network/gh access. */
function readBody(number: 429 | 388 | 382 | 383): string {
  return readFileSync(join(FIXTURES, `issue-${number}-body.md`), 'utf8')
}

const DATE = '2026-07-13'

describe('amendRationaleDeps — round-trip against real drifted bodies', () => {
  it('#429: single labeled span + bare continuations — rewrites to the requested set', () => {
    const body = readBody(429)
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: ['1', '3a', '3b'], conflictsWith: [] })
    const out = amendRationaleDeps(body, { dependsOn: ['2', '3'], note: 'Task 3 dropped.', date: DATE })
    expect(parseRationaleDeps(out)).toEqual({ dependsOn: ['2', '3'], conflictsWith: [] })
  })

  it('#388: multi-span with prose between + slug-qualified ids — rewrites to the requested set', () => {
    const body = readBody(388)
    const out = amendRationaleDeps(body, { dependsOn: ['0', '1'], note: 'Simplified.', date: DATE })
    expect(parseRationaleDeps(out)).toEqual({ dependsOn: ['0', '1'], conflictsWith: [] })
  })

  it('#382: preserves slug-qualified ids through a round-trip', () => {
    const body = readBody(382)
    expect(parseRationaleDeps(body)).toEqual({
      dependsOn: ['aeg-governance-hardening #372', 'aeg-forge-state-v1 #425'],
      conflictsWith: ['aeg-governance-hardening 25']
    })
    const out = amendRationaleDeps(body, {
      dependsOn: ['aeg-governance-hardening #372'],
      note: 'One edge dropped.',
      date: DATE
    })
    expect(parseRationaleDeps(out)).toEqual({
      dependsOn: ['aeg-governance-hardening #372'],
      conflictsWith: ['aeg-governance-hardening 25']
    })
  })

  it('#382: amends one field and leaves the other untouched', () => {
    const body = readBody(382)
    const out = amendRationaleDeps(body, { conflictsWith: [], note: 'Conflict cleared.', date: DATE })
    // conflicts-with cleared to the empty marker; depends-on spans untouched.
    expect(parseRationaleDeps(out)).toEqual({
      dependsOn: ['aeg-governance-hardening #372', 'aeg-forge-state-v1 #425'],
      conflictsWith: []
    })
  })
})

describe('amendRationaleDeps — empty markers, both directions', () => {
  it('deps → none: clears Depends-on to the `—` marker', () => {
    const body = readBody(429)
    const out = amendRationaleDeps(body, { dependsOn: [], note: 'Now independent.', date: DATE })
    expect(parseRationaleDeps(out)).toEqual({ dependsOn: [], conflictsWith: [] })
    expect(out).toContain('`Depends-on: —`')
  })

  it('none → deps: adds a Conflicts-with field that did not exist before', () => {
    const body = readBody(429) // has Depends-on only, no Conflicts-with span
    const out = amendRationaleDeps(body, { conflictsWith: ['5'], note: 'New conflict.', date: DATE })
    expect(parseRationaleDeps(out)).toEqual({ dependsOn: ['1', '3a', '3b'], conflictsWith: ['5'] })
  })
})

describe('amendRationaleDeps — invariants', () => {
  it('idempotence: amending to the current value still round-trips', () => {
    const body = readBody(383)
    expect(parseRationaleDeps(body)).toEqual({ dependsOn: ['1', '2'], conflictsWith: [] })
    const out = amendRationaleDeps(body, { dependsOn: ['1', '2'], note: 'No change.', date: DATE })
    expect(parseRationaleDeps(out)).toEqual({ dependsOn: ['1', '2'], conflictsWith: [] })
  })

  it('the appended Amendment paragraph never alters what parseRationaleDeps extracts', () => {
    const body = readBody(388)
    const out = amendRationaleDeps(body, { dependsOn: ['7'], conflictsWith: ['8'], note: 'Both changed.', date: DATE })
    // The amendment prose mentions "Depends-on is now `...`" / "Conflicts-with
    // is now `...`" in backtick spans — proving those are OUTSIDE the parsed
    // section, the round-trip must still equal exactly the requested sets.
    expect(out).toContain('**Amendment (2026-07-13, Planner) — dependency edges updated via amend-deps.**')
    expect(out).toContain('Depends-on is now `7`')
    expect(out).toContain('Conflicts-with is now `8`')
    expect(parseRationaleDeps(out)).toEqual({ dependsOn: ['7'], conflictsWith: ['8'] })
  })

  it('defaults the actor to Planner and honors an explicit actor', () => {
    const body = readBody(429)
    expect(amendRationaleDeps(body, { dependsOn: ['2'], note: 'x', date: DATE })).toContain('(2026-07-13, Planner)')
    expect(amendRationaleDeps(body, { dependsOn: ['2'], note: 'x', date: DATE, actor: 'Alice' })).toContain(
      '(2026-07-13, Alice)'
    )
  })

  it('adds the amended-parenthetical beside the rewritten field span', () => {
    const body = readBody(429)
    const out = amendRationaleDeps(body, { dependsOn: ['2'], note: 'x', date: DATE })
    expect(out).toContain('`Depends-on: 2` (amended 2026-07-13 — see Amendment below)')
  })

  it('throws when the body has no Dependency rationale section', () => {
    expect(() =>
      amendRationaleDeps('**Boundary** — no rationale here.', { dependsOn: ['1'], note: 'x', date: DATE })
    ).toThrow(/no "\*\*Dependency rationale\*\*" section/)
  })
})
