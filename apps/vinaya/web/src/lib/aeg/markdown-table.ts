/**
 * Pure, no-I/O extraction of GitHub-flavored-markdown tables from raw text.
 * Every enforcement.md table this page renders is read through this parser —
 * never hand-copied — so the Rings section can't silently drift from the
 * real file the moment a row's wording changes.
 */

export type TableRow = {
  /** Raw cell text per column, in header order. */
  cells: string[]
  /** 1-indexed line number of this row in the source file. */
  line: number
}

export type ParsedTable = {
  headers: string[]
  rows: TableRow[]
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

const TABLE_ROW_PATTERN = /^\s*\|.*\|\s*$/
const SEPARATOR_ROW_PATTERN = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

/**
 * Finds the FIRST markdown table appearing at or after `fromLine` (1-indexed,
 * inclusive) in `lines`. Returns null if none is found before the next `## `
 * heading (or end of file) when `stopAtHeading` is true.
 */
export function findTable(lines: string[], fromLine: number, stopAtHeading = true): ParsedTable | null {
  let i = fromLine - 1
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (stopAtHeading && i > fromLine - 1 && /^##\s/.test(line)) return null
    if (TABLE_ROW_PATTERN.test(line)) {
      const headerLine = line
      const sepLine = lines[i + 1] ?? ''
      if (!SEPARATOR_ROW_PATTERN.test(sepLine)) {
        i++
        continue
      }
      const headers = splitRow(headerLine)
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

/** Finds the 1-indexed line of the first heading matching `pattern`, or null. */
export function findHeadingLine(lines: string[], pattern: RegExp): number | null {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i] ?? '')) return i + 1
  }
  return null
}

/** Convenience: row cells as a keyed object using `headers` as keys. */
export function rowToRecord(headers: string[], row: TableRow): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((h, idx) => {
    record[h] = row.cells[idx] ?? ''
  })
  return record
}
