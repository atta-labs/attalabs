/**
 * registry-parse.ts — pure, no-I/O parser for `aeg-root/enforcement.md`'s
 * three ring markdown tables (Ring 0/1/2). enforcement.md's tables ARE the
 * gate registry (D-117/D-118: no live file duplicates forge state); this
 * parses them rather than maintaining a second copy.
 *
 * The generic markdown-table extraction lives in `./markdown-table` — the one
 * aeg-core-owned parser every doctrine consumer shares (D-087). This module
 * imports `findTable`/`findHeadingLine` from there rather than re-deriving
 * them; it adds only the enforcement-specific normalization on top (the
 * ring-heading list, `stripBackticks`, and the last-two-columns rule).
 *
 * Each ring's table has a different header wording (Ring 0: Action/Gate/...;
 * Ring 1: CI check/Re-verifies; Ring 2: Mechanism/Runs/Catches) but always
 * ends in the same two columns: implementation, then lock. The FIRST column
 * is always the row's identifying label. This parser normalizes on that
 * structural shape, not on header text.
 */

import { findHeadingLine, findTable } from './markdown-table'

export type GateRing = 'ring0' | 'ring1' | 'ring2'

export type GateRow = {
  ring: GateRing
  action: string
  summary: string
  category: 'ci' | 'hook' | 'event'
  /** The substantive middle column — "What must be true..." (ring0),
   * "Re-verifies" (ring1), "Catches" (ring2) — always the column
   * immediately before `implementation`. Each ring names it differently,
   * but structurally it's always the same slot: what the check actually
   * verifies/produces, distinct from `summary`'s rhetorical question.
   * Undefined when a table has no such column (only 5 cells: action,
   * summary, category, implementation, lock). */
  detail?: string
  implementation: string
  lock: string
  line: number
}

const RING_HEADINGS: Array<{ ring: GateRing; pattern: RegExp }> = [
  { ring: 'ring0', pattern: /^##\s+Ring 0\b/ },
  { ring: 'ring1', pattern: /^##\s+Ring 1\b/ },
  { ring: 'ring2', pattern: /^##\s+Ring 2\b/ }
]

function stripBackticks(cell: string): string {
  const trimmed = cell.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/** Strips markdown `**bold**` markers from a gate/check row's own name.
 * `action` is the one cell this parser has never sanitized — most rows are
 * plain text, but a real row can legitimately bold its name for doctrine-
 * prose emphasis, and that literal `**...**` was leaking straight through
 * to `DiagramNode.label` (visible asterisks in the how-it-works UI; every
 * label already renders bold via CSS where it matters, so the markdown
 * marker carries zero information downstream). Root-cause fix, not a
 * per-row doctrine patch — the next accidentally-bolded name is covered
 * too, not just the ones caught so far. */
function stripBold(cell: string): string {
  return cell.trim().replace(/\*\*/g, '')
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
      const action = stripBold(cells[0] ?? '')
      const summary = stripBackticks(cells[1] ?? '')
      const category = stripBackticks(cells[2] ?? '') as GateRow['category']
      const implementation = stripBackticks(cells[cells.length - 2] ?? '')
      const lock = (cells[cells.length - 1] ?? '').trim()
      // The column right before `implementation` — only meaningful once it's
      // past `category` (index 2); a bare 5-cell row has no such column.
      const detail = cells.length > 5 ? stripBackticks(cells[cells.length - 3] ?? '') : undefined
      result.push({ ring, action, summary, category, detail, implementation, lock, line: row.line })
    }
  }

  return result
}
