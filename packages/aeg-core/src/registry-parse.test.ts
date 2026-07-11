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

| Action | Gate | What must be true | implementation | lock |
|---|---|---|---|---|
| Editing a file | Edit gate | Something | \`.claude/hooks/check-skill.sh\` |  |

## Ring 1 — Detection (what turns the forge red)

| CI check | Re-verifies | implementation | lock |
|---|---|---|---|
| Coherence oracle | Plan/forge drift | \`packages/aeg-core/bin/verify-coherence.ts\` | D-100 |

## Ring 2 — Audit (drift from any writer, any era)

| Mechanism | Runs | Catches | implementation | lock |
|---|---|---|---|---|
| Post-merge archivist | On merge | Audit record | \`packages/aeg-core/bin/archive-task.ts\` |  |
| Staleness audits | Dispatched periodically | Doc drift |  |  |
`
    const rows = parseEnforcementRegistry(fixture)
    expect(rows).toHaveLength(4)

    const ring0 = rows.find((r) => r.ring === 'ring0')
    expect(ring0).toEqual<GateRow>({
      ring: 'ring0',
      action: 'Editing a file',
      implementation: '.claude/hooks/check-skill.sh',
      lock: '',
      line: ring0!.line
    })

    const ring1 = rows.find((r) => r.ring === 'ring1')
    expect(ring1?.action).toBe('Coherence oracle')
    expect(ring1?.implementation).toBe('packages/aeg-core/bin/verify-coherence.ts')
    expect(ring1?.lock).toBe('D-100')

    const ring2Rows = rows.filter((r) => r.ring === 'ring2')
    expect(ring2Rows).toHaveLength(2)
    expect(ring2Rows[0]?.implementation).toBe('packages/aeg-core/bin/archive-task.ts')
    expect(ring2Rows[1]?.action).toBe('Staleness audits')
    expect(ring2Rows[1]?.implementation).toBe('')
  })

  it('parses the real enforcement.md — 27 rows, only non-deterministic rows carry an empty implementation', () => {
    const content = readFileSync(ENFORCEMENT_PATH, 'utf8')
    const rows = parseEnforcementRegistry(content)

    expect(rows).toHaveLength(27)

    const ring0Count = rows.filter((r) => r.ring === 'ring0').length
    const ring1Count = rows.filter((r) => r.ring === 'ring1').length
    const ring2Count = rows.filter((r) => r.ring === 'ring2').length
    expect(ring0Count + ring1Count + ring2Count).toBe(27)

    const emptyImplementation = rows.filter((r) => r.implementation === '')
    // "Staleness audits" is the one genuinely non-deterministic row with no file.
    expect(emptyImplementation.map((r) => r.action)).toEqual(['**Staleness audits**'])

    for (const row of rows) {
      expect(row.line).toBeGreaterThan(0)
    }
  })
})
