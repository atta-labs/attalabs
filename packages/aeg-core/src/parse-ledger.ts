import { readMarkdownTable } from './parse-registry'
import type { LedgerRow } from './types'

/**
 * Parse the append-only token/cost ledger for an iteration. See
 * `aeg-root/iterations/README.md` §12 for the canonical format.
 *
 * The ledger lives in a sibling file `aeg-root/iterations/<name>.tokens.md`
 * (the recommended home, since two roles appending rows do not collide with
 * a Planner editing the topology file) but the parser also accepts a
 * `## Token ledger` section inside any markdown — so a future iteration that
 * chose the inline form still parses.
 *
 * Pure: no I/O. The caller reads the file contents and hands them in.
 *
 * Tolerant by design: a malformed row is skipped rather than throwing, so a
 * typo does not crash Studio's display of an iteration's other rows.
 */
export function parseLedger(md: string): LedgerRow[] {
  const rows = readMarkdownTable(md, /^#{1,6}\s+Token\s+ledger\b/i)
  const out: LedgerRow[] = []
  for (const row of rows) {
    // Expected 7 columns: Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date.
    if (row.length < 7) continue
    const phase = (row[0] ?? '').trim()
    const role = (row[1] ?? '').trim()
    // Phase is the row's identity — every other cell may be unknown, but a
    // row without a phase is unusable (it can't be located on a re-pivot).
    if (!phase) continue
    out.push({
      phase,
      role,
      agentModel: (row[2] ?? '').trim(),
      tokensIn: parseIntCell(row[3] ?? ''),
      tokensOut: parseIntCell(row[4] ?? ''),
      cost: parseCostCell(row[5] ?? ''),
      date: (row[6] ?? '').trim()
    })
  }
  return out
}

function parseIntCell(cell: string): number | null {
  const trimmed = cell.replace(/`/g, '').trim()
  if (!trimmed || isEmDashOrDash(trimmed)) return null
  // Tolerate thousand-separator commas and underscores so a hand-written
  // `184,327` or `184_327` still resolves.
  const normalized = trimmed.replace(/[,_\s]/g, '')
  if (!/^-?\d+$/.test(normalized)) return null
  return Number(normalized)
}

function parseCostCell(cell: string): number | null {
  const trimmed = cell.replace(/`/g, '').trim()
  if (!trimmed || isEmDashOrDash(trimmed)) return null
  // Strip a leading `$` and any thousand-separators; preserve the decimal.
  const normalized = trimmed.replace(/^\$/, '').replace(/[,_\s]/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Number(normalized)
}

function isEmDashOrDash(s: string): boolean {
  const t = s.trim()
  return t === '—' || t === '-' || t === '–'
}
