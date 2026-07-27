/**
 * registry-parse.ts — pure, no-I/O parser for `aeg-root/enforcement.md`'s
 * three ring markdown tables (Ring 0/1/2). enforcement.md's tables ARE the
 * gate registry (no live file duplicates forge state); this
 * parses them rather than maintaining a second copy.
 *
 * The generic markdown-table extraction lives in `./markdown-table` — the one
 * aeg-core-owned parser every doctrine consumer shares. This module
 * imports `findTable`/`findHeadingLine` from there rather than re-deriving
 * them; it adds only the enforcement-specific normalization on top (the
 * ring-heading list, `stripBackticks`, and the last-two-columns rule).
 *
 * Each ring's table has a different header wording (Ring 0: Action/Gate/...;
 * Ring 1: CI check/Re-verifies; Ring 2: Mechanism/Runs/Catches). The FIRST
 * column is always the row's identifying label; `implementation` and
 * `description` are resolved BY HEADER NAME, since those two are spelled
 * identically in all three tables. Positional reads are used only where no
 * shared header name exists.
 *
 * The one exception is `Description`, which IS looked up by header name: it is
 * the only column spelled identically in all three tables, and the only one a
 * table can legitimately lack. Position cannot express that difference (a
 * 7-column table means two different shapes depending on the ring), so the
 * name is the only honest key. See the lookup in `parseEnforcementRegistry`.
 */

import { findHeadingLine, findTable } from './markdown-table'

export type GateRing = 'ring0' | 'ring1' | 'ring2'

export type GateRow = {
  ring: GateRing
  action: string
  summary: string
  category: 'ci' | 'hook' | 'event'
  /** One plain sentence: what this gate does, for a reader. Present in all
   * three ring tables and resolved by header name (see the lookup below).
   *
   * The counterpart to `spec`, and not interchangeable with it — `spec` is
   * written to ENFORCE: 17 of the 31 real rows cite an Issue number, a
   * task number or a file path, and the longest runs 2708 chars. That is
   * correct for a gate and unreadable on a page. This column is the same fact
   * addressed to a person, and is what a row's `summary` question gets
   * answered by. The same bar `roles/*.md`/`contracts/*.md` hold via
   * `description:` frontmatter and `ACTIONS` holds via its `description`
   * field, so a reader gets one register whatever they click.
   *
   * Optional on the type only so a malformed table degrades instead of
   * throwing — every real row carries one, asserted against the live file. */
  description?: string
  /** The substantive middle column — "What must be true..." (ring0),
   * "Re-verifies" (ring1), "Catches" (ring2) — always the column
   * immediately before `implementation`. Each ring names it differently,
   * but structurally it's always the same slot: the normative spec, written
   * for enforcement. Distinct from `summary`'s rhetorical question and from
   * `description`'s plain-language answer to it. Undefined when a table has
   * no such column. */
  spec?: string
  implementation: string
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
 * column; `implementation` is resolved by header name, falling back to the
 * last column.
 */
export function parseEnforcementRegistry(content: string): GateRow[] {
  const lines = content.split('\n')
  const result: GateRow[] = []

  for (const { ring, pattern } of RING_HEADINGS) {
    const headingLine = findHeadingLine(lines, pattern)
    if (headingLine === null) continue
    const table = findTable(lines, headingLine + 1)
    if (!table) continue
    // `description` is found BY HEADER NAME, never by position — the one
    // column here that can be. Every other column is positional out of
    // necessity: the three ring tables name their first column differently
    // ("Action"/"CI check"/"Mechanism") and their middle columns differently
    // again ("Gate" + "What must be true" / "Re-verifies" / "Runs" +
    // "Catches"), so only the ends are reliable. "Description" is spelled the
    // same in all three, which makes a name lookup possible — and a name
    // lookup is what keeps a table WITHOUT the column from having some other
    // column silently read as its description. By index that is undetectable:
    // a 7-column table means "has Description" in one ring and "has Gate" in
    // another, and the parser cannot tell which. -1 here simply means the
    // table doesn't have one.
    const descriptionIndex = table.headers.findIndex((h) => h.trim().toLowerCase() === 'description')
    const implementationIndex = table.headers.findIndex((h) => h.trim().toLowerCase() === 'implementation')
    for (const row of table.rows) {
      const cells = row.cells
      if (cells.length < 3) continue
      const action = stripBold(cells[0] ?? '')
      const summary = stripBackticks(cells[1] ?? '')
      const category = stripBackticks(cells[2] ?? '') as GateRow['category']
      const implementation = stripBackticks(
        (implementationIndex === -1 ? cells[cells.length - 1] : cells[implementationIndex]) ?? ''
      )
      const description =
        descriptionIndex === -1 ? undefined : stripBackticks(cells[descriptionIndex] ?? '') || undefined
      const spec = cells.length > 4 ? stripBackticks(cells[cells.length - 2] ?? '') : undefined
      result.push({ ring, action, summary, category, description, spec, implementation, line: row.line })
    }
  }

  return result
}
