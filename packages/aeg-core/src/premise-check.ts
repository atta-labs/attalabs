/**
 * Premise-pinning grammar (aeg-governance-hardening task 11, #324). Pure —
 * no `fs`; file content is injected via `fileReader` so the checker stays
 * testable and CWD-independent.
 *
 * A brief/PR body's `Premise:` block pins concrete, checkable facts about the
 * code surface at authoring time — e.g. "this function still exists", "this
 * constant is still absent". `verify-dispatch --premise <body-file>`
 * re-asserts every pin immediately before Step 0: a premise that no longer
 * holds means the surface moved since the brief was written, and the
 * Developer should stop and re-dig rather than execute against a stale
 * mental model (the exact failure of aeg-governance-hardening's live-fire
 * #3 — two briefs described a target architecture a later, uncited migration
 * had already superseded).
 *
 * Deliberately minimal — exactly three assertion kinds. This is a pin
 * format, not a DSL; resist adding more.
 */

import { createHash } from 'node:crypto'
import { anchoredRegion } from './anchored-region'

export type PremiseAssertion =
  | { kind: 'contains'; path: string; value: string }
  | { kind: 'absent'; path: string; value: string }
  | { kind: 'sha256'; path: string; value: string }

const ASSERTION_KINDS = new Set(['contains', 'absent', 'sha256'])

/**
 * True for the header line in either serialization the rest of the brief
 * grammar uses (`brief-validation.ts`, `issue-validation.ts`): `**Premise:**`
 * bold-inline or `### Premise` heading. Strips `*`/`#` markup first rather
 * than trying to enumerate every marker placement — `**Premise:**` closes
 * its bold markers *after* the colon, `**Premise**:` closes them *before*.
 */
function isPremiseHeader(line: string): boolean {
  const stripped = line.replace(/[*#]/g, '').trim()
  return /^premise\s*:?$/i.test(stripped)
}

/** Matches one bullet line: `- <path> <kind>: <value>`. */
const PREMISE_LINE = /^[-*]\s*(\S+)\s+(contains|absent|sha256)\s*:\s*(.+)$/i

/**
 * Parse every `- <path> <kind>: <value>` bullet under the `Premise:` header.
 * Malformed bullets (wrong kind, missing colon) are silently skipped — this
 * mirrors `parsePremiseBlock`'s sibling parsers' presence-only philosophy;
 * the caller decides whether zero assertions is itself a failure
 * (`checkPremiseCoverage`). Stops the block at the first blank line or the
 * first non-bullet line after the header.
 *
 * When the body carries an `AEG:PREMISE` anchor pair (`anchored-region.ts`,
 * task 30), the block is parsed exclusively inside that pair — the pair must
 * contain the `**Premise:**` header line and its bullets; a premise-shaped
 * block anywhere else in the body is ignored. Bodies without the pair parse
 * exactly as before.
 */
export function parsePremiseBlock(prBody: string): PremiseAssertion[] {
  const searchIn = anchoredRegion(prBody, 'PREMISE') ?? prBody
  const lines = searchIn.split(/\r?\n/)
  const assertions: PremiseAssertion[] = []
  let inBlock = false

  for (const raw of lines) {
    const line = raw.trim()
    if (!inBlock) {
      if (isPremiseHeader(line)) inBlock = true
      continue
    }
    if (line === '') break
    const m = line.match(PREMISE_LINE)
    if (!m) break
    const [, path, kindRaw, value] = m
    const kind = (kindRaw as string).toLowerCase()
    if (!ASSERTION_KINDS.has(kind)) continue
    assertions.push({ kind, path: path as string, value: (value as string).trim() } as PremiseAssertion)
  }

  return assertions
}

export type PremiseCheckResult = { pass: boolean; failures: string[] }

/**
 * Re-assert every parsed premise against the current file content, injected
 * via `fileReader` (returns `null` when the path does not exist). One
 * failure line per broken pin, naming the exact path/kind/value so the
 * Developer can see precisely what moved.
 */
export function checkPremises(
  assertions: PremiseAssertion[],
  fileReader: (path: string) => string | null
): PremiseCheckResult {
  const failures: string[] = []

  for (const a of assertions) {
    const content = fileReader(a.path)
    if (content === null) {
      failures.push(
        `premise-check: ${a.path} does not exist on disk (premise asserted \`${a.kind}: ${a.value}\`) — the surface moved since this brief was authored; re-dig before proceeding.`
      )
      continue
    }

    if (a.kind === 'contains' && !content.includes(a.value)) {
      failures.push(
        `premise-check: ${a.path} no longer contains "${a.value}" — the premise this brief pinned has moved; re-dig before proceeding.`
      )
    } else if (a.kind === 'absent' && content.includes(a.value)) {
      failures.push(
        `premise-check: ${a.path} now contains "${a.value}", but the brief pinned it absent — the premise has moved; re-dig before proceeding.`
      )
    } else if (a.kind === 'sha256') {
      const actual = createHash('sha256').update(content).digest('hex')
      if (actual !== a.value.toLowerCase()) {
        failures.push(
          `premise-check: ${a.path} sha256 mismatch (brief pinned ${a.value}, file is now ${actual}) — the file changed since this brief was authored; re-dig before proceeding.`
        )
      }
    }
  }

  return { pass: failures.length === 0, failures }
}
