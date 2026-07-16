import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type GateRow, parseEnforcementRegistry } from './registry-parse'

const REPO_ROOT = join(import.meta.dirname, '../../..')
const ENFORCEMENT_PATH = join(REPO_ROOT, 'aeg-root/enforcement.md')

describe('parseEnforcementRegistry', () => {
  it('parses an inline fixture with differing middle columns per ring', () => {
    const fixture = `
## Ring 0 — Prevention (nothing invalid leaves the machine)

| Action | Summary | Category | Gate | What must be true | implementation | lock |
|---|---|---|---|---|---|---|
| Editing a file | Ever edited code you never read the docs for? | hook | Edit gate | Something | \`.claude/hooks/check-skill.sh\` |  |

## Ring 1 — Detection (what turns the forge red)

| CI check | Summary | Category | Re-verifies | implementation | lock |
|---|---|---|---|---|---|
| Coherence oracle | Ever found a task marked done that never merged? | ci | Plan/forge drift | \`packages/aeg-core/bin/verify-coherence.ts\` | D-100 |

## Ring 2 — Audit (drift from any writer, any era)

| Mechanism | Summary | Category | Runs | Catches | implementation | lock |
|---|---|---|---|---|---|---|
| Post-merge archivist | Ever wanted a permanent record of what shipped? | event | On merge | Audit record | \`packages/aeg-core/bin/archive-task.ts\` |  |
| Staleness audits | Ever had docs contradict a decision? | event | Dispatched periodically | Doc drift |  |  |
`
    const rows = parseEnforcementRegistry(fixture)
    expect(rows).toHaveLength(4)

    const ring0 = rows.find((r) => r.ring === 'ring0')
    expect(ring0).toEqual<GateRow>({
      ring: 'ring0',
      action: 'Editing a file',
      summary: 'Ever edited code you never read the docs for?',
      category: 'hook',
      // This fixture table has no `Description` header, so no description is
      // read — NOT the `Gate` cell ("Edit gate") that happens to sit at the
      // index a real table's Description occupies. That is the whole point of
      // resolving the column by name: this table is 7 columns wide and so is
      // Ring 0's real one, and only the header tells them apart.
      description: undefined,
      spec: 'Something',
      implementation: '.claude/hooks/check-skill.sh',
      lock: '',
      line: ring0!.line
    })

    const ring1 = rows.find((r) => r.ring === 'ring1')
    expect(ring1?.action).toBe('Coherence oracle')
    expect(ring1?.summary).toBe('Ever found a task marked done that never merged?')
    expect(ring1?.category).toBe('ci')
    expect(ring1?.implementation).toBe('packages/aeg-core/bin/verify-coherence.ts')
    expect(ring1?.lock).toBe('D-100')

    const ring2Rows = rows.filter((r) => r.ring === 'ring2')
    expect(ring2Rows).toHaveLength(2)
    expect(ring2Rows[0]?.summary).toBe('Ever wanted a permanent record of what shipped?')
    expect(ring2Rows[0]?.category).toBe('event')
    expect(ring2Rows[0]?.implementation).toBe('packages/aeg-core/bin/archive-task.ts')
    expect(ring2Rows[1]?.action).toBe('Staleness audits')
    expect(ring2Rows[1]?.category).toBe('event')
    expect(ring2Rows[1]?.implementation).toBe('')
  })

  it('parses the real enforcement.md — 31 rows (32 minus the D-120-retired stale-blocker ring-2 row), only non-deterministic rows carry an empty implementation', () => {
    const content = readFileSync(ENFORCEMENT_PATH, 'utf8')
    const rows = parseEnforcementRegistry(content)

    expect(rows).toHaveLength(31)

    const ring0Count = rows.filter((r) => r.ring === 'ring0').length
    const ring1Count = rows.filter((r) => r.ring === 'ring1').length
    const ring2Count = rows.filter((r) => r.ring === 'ring2').length
    expect(ring0Count + ring1Count + ring2Count).toBe(31)

    const emptyImplementation = rows.filter((r) => r.implementation === '')
    // "Staleness audits" is the one genuinely non-deterministic row with no file.
    expect(emptyImplementation.map((r) => r.action)).toEqual(['Staleness audits'])

    for (const row of rows) {
      expect(row.line).toBeGreaterThan(0)
      expect(row.summary.length).toBeGreaterThan(0)
      expect(['ci', 'hook', 'event']).toContain(row.category)
    }
  })

  it('reads summary/category correctly for a real row per ring', () => {
    const content = readFileSync(ENFORCEMENT_PATH, 'utf8')
    const rows = parseEnforcementRegistry(content)

    const ring0 = rows.find((r) => r.ring === 'ring0' && r.action === '`git push`')
    expect(ring0?.summary).toBe('Ever had someone accidentally push straight to main?')
    expect(ring0?.category).toBe('hook')

    const ring1 = rows.find((r) => r.ring === 'ring1' && r.action === 'Coherence oracle')
    expect(ring1?.summary).toBe('Ever found a task marked "done" that was never actually merged?')
    expect(ring1?.category).toBe('ci')

    const ring2 = rows.find((r) => r.ring === 'ring2' && r.action === 'Post-merge archivist')
    expect(ring2?.summary).toBe('Ever wanted a permanent, honest record of exactly what shipped and why?')
    expect(ring2?.category).toBe('event')
  })

  it('gives every real row a description, in all three rings', () => {
    const rows = parseEnforcementRegistry(readFileSync(ENFORCEMENT_PATH, 'utf8'))
    for (const row of rows) {
      expect(row.description?.trim(), `${row.ring} row '${row.action}' has no Description`).toBeTruthy()
    }
  })

  it('never reads the spec column as the description', () => {
    // The failure this guards is silent, not loud: `description` is resolved
    // by header name, but if that lookup ever regressed to an index, a ring
    // whose columns happen to line up would hand back its spec and every
    // assertion above would still pass — the page would just quietly go back
    // to showing 2708 chars of enforcement prose. Ring 0's real table is 8
    // columns and the fixture's is 7; only the header distinguishes them.
    const rows = parseEnforcementRegistry(readFileSync(ENFORCEMENT_PATH, 'utf8'))
    for (const row of rows) {
      expect(row.description, `${row.ring} row '${row.action}' description === spec`).not.toBe(row.spec)
    }
  })
})
