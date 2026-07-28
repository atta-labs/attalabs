import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findHeadingLine, findTable, rowToRecord } from './markdown-table'

const REPO_ROOT = join(import.meta.dirname, '../../..')
const ENFORCEMENT_PATH = join(REPO_ROOT, 'aeg-root/enforcement.md')

/**
 * Round-trip proof that `enforcement.md`'s Ring 0/1/2 gate tables still
 * parse correctly through the same `findTable`/`rowToRecord` path the live
 * `/aeg` page uses. Every row ends with an `implementation` column, resolved
 * by header name — this guards against the column having been inserted
 * mid-row or the tables having been reshaped.
 */
describe('enforcement.md Ring 0/1/2 tables (implementation column)', () => {
  async function loadRingTables() {
    const raw = await fs.readFile(ENFORCEMENT_PATH, 'utf8')
    const lines = raw.split('\n')

    const ring0HeadingLine = findHeadingLine(lines, /^##\s*Ring 0/)
    const ring1HeadingLine = findHeadingLine(lines, /^##\s*Ring 1/)
    const ring2HeadingLine = findHeadingLine(lines, /^##\s*Ring 2/)
    if (!ring0HeadingLine || !ring1HeadingLine || !ring2HeadingLine) {
      throw new Error('enforcement.md: could not find all three Ring headings')
    }

    const ring0 = findTable(lines, ring0HeadingLine)
    const ring1 = findTable(lines, ring1HeadingLine)
    const ring2 = findTable(lines, ring2HeadingLine)
    if (!ring0 || !ring1 || !ring2) {
      throw new Error('enforcement.md: one or more Ring detail tables could not be parsed')
    }
    return { ring0, ring1, ring2 }
  }

  it('every ring table header ends with implementation, and carries no lock column', async () => {
    const { ring0, ring1, ring2 } = await loadRingTables()
    for (const table of [ring0, ring1, ring2]) {
      expect(table.headers[table.headers.length - 1]).toBe('implementation')
      expect(table.headers).not.toContain('lock')
    }
  })

  it('every gate row has a non-empty implementation, except the documented Staleness audits exception', async () => {
    const { ring0, ring1, ring2 } = await loadRingTables()
    const missingImplementation: string[] = []
    for (const table of [ring0, ring1, ring2]) {
      for (const row of table.rows) {
        const record = rowToRecord(table.headers, row)
        if (!record.implementation) missingImplementation.push(row.cells[0] ?? '')
      }
    }
    // "Staleness audits" (Ring 2) is a dispatched human/agent process, not a
    // deterministic script — apps/vinaya/web/src/lib/aeg/rings.ts already
    // documents this same absence for its own CI-job matching.
    expect(missingImplementation).toEqual(['**Staleness audits**'])
  })

  it('parses one record per gate row, matching the known row count per ring', async () => {
    const { ring0, ring1, ring2 } = await loadRingTables()
    expect(ring0.rows).toHaveLength(10)
    expect(ring1.rows).toHaveLength(16)
    // (2026-07-13) removed the "Daily drift check — stuck row-adjacent
    // blockers" ring-2 row (its subject matter, stale-blocker.ts, was retired).
    expect(ring2.rows).toHaveLength(6)
  })
})
