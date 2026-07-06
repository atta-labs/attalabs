export type ParsedRationaleDeps = {
  dependsOn: string[]
  conflictsWith: string[]
}

const SECTION_HEADER = /\*\*Dependency rationale\*\*/i
const NEXT_HEADER = /\*\*[A-Z][^*]*\*\*/
const FIELD_LABEL = /^(Depends-on|Conflicts-with)\s*:\s*(.*)$/i

/** A valid edge id: a bare task id (`1`, `7a`), a bare Issue ref (`#372`), or
 * a cross-iteration reference (`<slug> #372` / `<slug> 25`). Rejects plain
 * prose that happens to share a backtick span with a labeled field — e.g. a
 * `` `vinaya check` `` command-name mention inside the same "Dependency
 * rationale" paragraph (found in Issue #384's real body). */
const ID_TOKEN = /^(?:[\w.-]+\s+)?#?\d+[a-z]?$/i

function isEmptyMarker(s: string): boolean {
  const t = s.trim()
  return t === '' || t === '—' || t === '-' || t === '–'
}

function splitIds(raw: string): string[] {
  if (isEmptyMarker(raw)) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isEmptyMarker(s) && ID_TOKEN.test(s))
}

/** Slices the "Dependency rationale" paragraph out of a full Issue body — up
 * to (not including) the next `**Bold Header**` marker, or end of body. Every
 * AEG Issue template section is a bold header at the start of its own
 * paragraph, never inline mid-sentence emphasis, so this boundary is safe. */
function extractSection(body: string): string {
  const start = body.match(SECTION_HEADER)
  if (!start || start.index === undefined) return ''
  const rest = body.slice(start.index + start[0].length)
  const next = rest.match(NEXT_HEADER)
  const end = next && next.index !== undefined ? next.index : rest.length
  return rest.slice(0, end)
}

/**
 * Parses `Depends-on`/`Conflicts-with` edges out of an Issue body's
 * "Dependency rationale" section. Tolerates both known writing conventions:
 *
 *   - a single comma-joined backtick span (the topology file's own cell
 *     convention, echoed verbatim into some Issue bodies):
 *     `` `Depends-on: 1, 2` ``
 *
 *   - multiple separate backtick spans with explanatory prose between them,
 *     where only the FIRST span carries the field label and subsequent bare
 *     spans are additional values for that same field — the shape the
 *     2026-07-06 spike found in Issue #383's real body:
 *     `` `Depends-on: 1` `` (rationale prose...), `` `2` `` (more prose...)
 *
 * Scans backtick spans left-to-right, carrying forward whichever field
 * (`Depends-on` / `Conflicts-with`) was last labeled — a bare span before any
 * label is ignored, and a bare span is attributed to whichever label
 * preceded it, however far back.
 */
export function parseRationaleDeps(body: string): ParsedRationaleDeps {
  const section = extractSection(body)
  const dependsOn: string[] = []
  const conflictsWith: string[] = []
  let current: 'dependsOn' | 'conflictsWith' | null = null

  const spanPattern = /`([^`]*)`/g
  let match: RegExpExecArray | null = spanPattern.exec(section)
  while (match !== null) {
    const content = (match[1] ?? '').trim()
    const labelMatch = content.match(FIELD_LABEL)
    if (labelMatch) {
      current = labelMatch[1]?.toLowerCase() === 'conflicts-with' ? 'conflictsWith' : 'dependsOn'
      const ids = splitIds(labelMatch[2] ?? '')
      ;(current === 'dependsOn' ? dependsOn : conflictsWith).push(...ids)
    } else if (current) {
      const ids = splitIds(content)
      ;(current === 'dependsOn' ? dependsOn : conflictsWith).push(...ids)
    }
    match = spanPattern.exec(section)
  }

  return { dependsOn, conflictsWith }
}
