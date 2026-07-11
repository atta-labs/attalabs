/**
 * registry-parse.ts — pure, no-I/O parser for `aeg-root/enforcement.md`'s
 * three ring markdown tables (Ring 0/1/2). enforcement.md's tables ARE the
 * gate registry (D-117/D-118: no live file duplicates forge state); this
 * parses them rather than maintaining a second copy.
 *
 * Standalone by design — `apps/vinaya/web/src/lib/aeg/markdown-table.ts`
 * parses the same tables for the Vinaya renderer, but packages must never
 * import from apps (layering), so this is a small independent re-derivation,
 * not a shared import.
 *
 * Each ring's table has a different header wording (Ring 0: Action/Gate/...;
 * Ring 1: CI check/Re-verifies; Ring 2: Mechanism/Runs/Catches) but always
 * ends in the same two columns: implementation, then lock. The FIRST column
 * is always the row's identifying label. This parser normalizes on that
 * structural shape, not on header text.
 */

export type GateRing = 'ring0' | 'ring1' | 'ring2'

export type GateRow = {
  ring: GateRing
  action: string
  implementation: string
  lock: string
  line: number
}

type TableRow = { cells: string[]; line: number }
type ParsedTable = { headers: string[]; rows: TableRow[] }

const RING_HEADINGS: Array<{ ring: GateRing; pattern: RegExp }> = [
  { ring: 'ring0', pattern: /^##\s+Ring 0\b/ },
  { ring: 'ring1', pattern: /^##\s+Ring 1\b/ },
  { ring: 'ring2', pattern: /^##\s+Ring 2\b/ }
]

const TABLE_ROW_PATTERN = /^\s*\|.*\|\s*$/
const SEPARATOR_ROW_PATTERN = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function stripBackticks(cell: string): string {
  const trimmed = cell.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/** Finds the first markdown table at or after `fromLine` (1-indexed), stopping at the next `## ` heading. */
function findTable(lines: string[], fromLine: number): ParsedTable | null {
  let i = fromLine - 1
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (i > fromLine - 1 && /^##\s/.test(line)) return null
    if (TABLE_ROW_PATTERN.test(line)) {
      const sepLine = lines[i + 1] ?? ''
      if (!SEPARATOR_ROW_PATTERN.test(sepLine)) {
        i++
        continue
      }
      const headers = splitRow(line)
      const rows: TableRow[] = []
      let j = i + 2
      while (j < lines.length && TABLE_ROW_PATTERN.test(lines[j] ?? '')) {
        rows.push({ cells: splitRow(lines[j] ?? ''), line: j + 1 })
        j++
      }
      return { headers, rows }
    }
    i++
  }
  return null
}

function findHeadingLine(lines: string[], pattern: RegExp): number | null {
  for (let idx = 0; idx < lines.length; idx++) {
    if (pattern.test(lines[idx] ?? '')) return idx + 1
  }
  return null
}

/**
 * Parses the three ring tables out of `enforcement.md`'s raw content into a
 * flat, normalized `GateRow[]`. Each row's `action` is its table's first
 * column; `implementation`/`lock` are always its last two columns,
 * regardless of the differing middle columns per ring.
 */
export function parseEnforcementRegistry(content: string): GateRow[] {
  const lines = content.split('\n')
  const result: GateRow[] = []

  for (const { ring, pattern } of RING_HEADINGS) {
    const headingLine = findHeadingLine(lines, pattern)
    if (headingLine === null) continue
    const table = findTable(lines, headingLine + 1)
    if (!table) continue
    for (const row of table.rows) {
      const cells = row.cells
      if (cells.length < 3) continue
      const action = cells[0] ?? ''
      const implementation = stripBackticks(cells[cells.length - 2] ?? '')
      const lock = (cells[cells.length - 1] ?? '').trim()
      result.push({ ring, action, implementation, lock, line: row.line })
    }
  }

  return result
}
