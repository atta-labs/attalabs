import { rowFromCells } from './parse-ledger'
import { splitTableRow } from './parse-registry'
import type { LedgerRow } from './types'

/**
 * Live-source token parsing (aeg-forge-state-v1 task 4b, #445). Where
 * `parse-ledger.ts` reads the Archivist's hand-assembled `<name>.tokens.md`
 * ledger, this file extracts the same `LedgerRow` shape directly from the
 * artifacts D-071 says every role already produces on its own turn — the
 * Developer's "Token report" section in a PR body, and the Reviewer's /
 * Security's / Planner's one-line `Tokens: …` report in a verdict comment,
 * PR body, or planning report. Nothing here does I/O — the caller (Studio's
 * forge adapter, `apps/aeg/web/studio/src/lib/forge/fetch-token-ledger.ts`)
 * fetches the PR bodies/comments and hands them to `aggregateTaskTokenRows`.
 *
 * Cell parsing (`—`/null tolerance, thousand-separator commas, `$` cost
 * prefix) is NOT reimplemented here — every row is built through
 * `parse-ledger.ts`'s `rowFromCells`, so a live-fetched row and a
 * `.tokens.md`-parsed row for the same underlying report are byte-identical
 * in how their cells resolve.
 */

// A "Token report" heading, alone on its line: `## Token report`,
// `### Token report`, or the bold-inline `**Token report**` form seen in the
// wild (real PRs use both — #412 uses `## Token report`, #454 uses the bold
// form). A PR re-pushed after `CHANGES_REQUESTED` carries this heading more
// than once — every occurrence is parsed as its own entry (roles/developer.md:
// re-entry appends a new "Token report" entry, never edits the first).
const TOKEN_REPORT_HEADING = /^\s*(?:#{1,6}\s*Token report\s*|\*\*Token report\*\*)\s*$/i

// Inline field-list form, a real drift already present in this repo's own
// history (PR #374, #362) alongside the table form: one line reading
// `Phase: … | Role: … | Agent/Model: … | Tokens in: … | Tokens out: … |
// Cost: … | Date: …`. Tolerated as a second recognized shape rather than
// treated as malformed, since both are real, current, human-authored output.
const INLINE_FIELD_LIST =
  /Phase:\s*([^|]+?)\s*\|\s*Role:\s*([^|]+?)\s*\|\s*Agent\/Model:\s*([^|]+?)\s*\|\s*Tokens in:\s*([^|]+?)\s*\|\s*Tokens out:\s*([^|]+?)\s*\|\s*Cost:\s*([^|]+?)\s*\|\s*Date:\s*(.+?)\s*$/im

/**
 * Extract every "Token report" entry from a Developer's PR body. Each
 * occurrence of the heading is parsed independently (table form preferred;
 * falls back to the inline field-list form when no table follows), and
 * every occurrence found contributes a row — a re-pushed PR undercounts if
 * only the first/last match is read, per this task's own Traps section.
 */
export function parseTokenReportEntries(body: string): LedgerRow[] {
  const lines = body.split(/\r?\n/)
  const headingIdxs: number[] = []
  lines.forEach((line, i) => {
    if (TOKEN_REPORT_HEADING.test(line)) headingIdxs.push(i)
  })

  const out: LedgerRow[] = []
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = (headingIdxs[h] as number) + 1
    const end = h + 1 < headingIdxs.length ? (headingIdxs[h + 1] as number) : lines.length
    const section = lines.slice(start, end).join('\n')

    const tableRows = parseTableSection(section)
    if (tableRows.length > 0) {
      out.push(...tableRows)
      continue
    }
    const inlineRow = parseInlineFieldList(section)
    if (inlineRow) out.push(inlineRow)
  }
  return out
}

/** Same table-body-reading contract as `parse-registry.ts`'s `readMarkdownTable`, minus the heading search (already sliced to a single "Token report" section, which may repeat within one body — the thing `readMarkdownTable` cannot express). */
function parseTableSection(section: string): LedgerRow[] {
  const lines = section.split(/\r?\n/)
  let i = 0
  for (; i < lines.length; i++) {
    if ((lines[i] ?? '').trim().startsWith('|')) break
  }
  if (i + 1 >= lines.length) return []
  i += 2 // skip header + separator row
  const out: LedgerRow[] = []
  for (; i < lines.length; i++) {
    const trimmed = (lines[i] ?? '').trim()
    if (!trimmed.startsWith('|')) break
    const row = rowFromCells(splitTableRow(trimmed))
    if (row) out.push(row)
  }
  return out
}

function parseInlineFieldList(section: string): LedgerRow | null {
  const m = section.match(INLINE_FIELD_LIST)
  if (!m) return null
  return rowFromCells([m[1], m[2], m[3], m[4], m[5], m[6], m[7]] as string[])
}

// `Tokens: <phase> — <Role> — <model> — <in>/<out>/<cost or — if unknown>`
// (`roles/reviewer.md`, `roles/security.md`, `roles/planner.md` — identical
// shape, phase/role text differs per role). Segments are separated by a dash
// with a space on both sides so an agent/model name's own internal hyphens
// (`claude-sonnet-5`) never split — a real separator always has surrounding
// whitespace. Tolerates `-`/`–` alongside the docs' own `—`, since no real
// verdict-comment example exists yet to confirm which glyph a live Reviewer
// turn actually reproduces.
const TOKENS_LINE_PREFIX = /^\s*(?:\*\*)?Tokens:(?:\*\*)?\s*(.+)$/i
const SEGMENT_SEP = /\s+[—–-]\s+/

/**
 * Extract every Reviewer/Security/Planner `Tokens: …` line from a body of
 * text (a verdict comment, a PR body, or a planning report). A re-review or
 * re-planning reports again without editing the prior line, so more than one
 * match is expected and every one is returned. A line that doesn't split
 * into exactly the 4 documented segments is skipped, not guessed at — same
 * discipline as `parse-ledger.ts`'s malformed-row tolerance.
 */
export function parseTokensLines(text: string): LedgerRow[] {
  const out: LedgerRow[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(TOKENS_LINE_PREFIX)
    if (!m) continue
    const rest = (m[1] as string).trim()
    const segments = rest.split(SEGMENT_SEP)
    if (segments.length !== 4) continue
    const [phase, role, agentModel, numbers] = segments as [string, string, string, string]
    const [tokensInCell, tokensOutCell, costCell] = splitNumbers(numbers)
    const row = rowFromCells([phase.trim(), role.trim(), agentModel.trim(), tokensInCell, tokensOutCell, costCell, ''])
    if (row) out.push(row)
  }
  return out
}

function splitNumbers(numbers: string): [string, string, string] {
  const trimmed = numbers.trim()
  if (isDashOnly(trimmed)) return ['—', '—', '—']
  const parts = trimmed.split('/')
  return [parts[0] ?? '—', parts[1] ?? '—', parts[2] ?? '—']
}

function isDashOnly(s: string): boolean {
  return s === '—' || s === '-' || s === '–'
}

/** One merged PR's body + top-level comments — the caller's fetch result, no I/O here. */
export type TokenSourcePr = {
  number: number
  body: string
  comments: string[]
}

/**
 * Pure aggregation over every merged PR associated with a task (its own
 * branch's PR(s), plus any plan/cross-referenced PR carrying the Planner's
 * report) — Developer "Token report" entries and `Tokens: …` lines from
 * each PR body, and `Tokens: …` lines from each PR's comments. Missing or
 * malformed reports simply produce no row for that report — never a
 * fabricated figure — matching `archivist.md`'s own "flag it under DANGLING
 * instead" discipline; the caller decides how to surface an empty result.
 */
export function aggregateTaskTokenRows(prs: TokenSourcePr[]): LedgerRow[] {
  const out: LedgerRow[] = []
  for (const pr of prs) {
    out.push(...parseTokenReportEntries(pr.body))
    out.push(...parseTokensLines(pr.body))
    for (const comment of pr.comments) out.push(...parseTokensLines(comment))
  }
  return out
}
