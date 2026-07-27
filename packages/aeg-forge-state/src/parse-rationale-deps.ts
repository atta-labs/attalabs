export type ParsedRationaleDeps = {
  dependsOn: string[]
  conflictsWith: string[]
}

/**
 * The one grammar. These four constants ARE the "Dependency rationale"
 * grammar; `parseRationaleDeps` (reader) and `amendRationaleDeps` (writer, in
 * `amend-rationale-deps.ts`) are the only two functions allowed to read them —
 * never a second copy of the regexes. Exported so the writer shares this exact
 * grammar rather than duplicating it.
 */
export const SECTION_HEADER = /\*\*Dependency rationale\*\*/i
export const NEXT_HEADER = /\*\*[A-Z][^*]*\*\*/
export const FIELD_LABEL = /^(Depends-on|Conflicts-with)\s*:\s*(.*)$/i

/** A valid edge id: a bare task id (`1`, `7a`), a bare Issue ref (`#372`), or
 * a cross-iteration reference (`<slug> #372` / `<slug> 25`). Rejects plain
 * prose that happens to share a backtick span with a labeled field — e.g. a
 * `` `vinaya check` `` command-name mention inside the same "Dependency
 * rationale" paragraph (found in Issue #384's real body). */
export const ID_TOKEN = /^(?:[\w.-]+\s+)?#?\d+[a-z]?$/i

/** Splits a qualified id (`aeg-governance-hardening #368`) into its slug and
 * the bare remainder (`#368`); `null` slug for an already-bare id (`#372`,
 * `3`). */
const SLUG_QUALIFIED_ID = /^([\w.-]+)\s+(#?\d+[a-z]?)$/i

function isEmptyMarker(s: string): boolean {
  const t = s.trim()
  return t === '' || t === '—' || t === '-' || t === '–'
}

/** Appends only ids not already present — a bare continuation span can
 * legitimately re-mention an id already captured for this field (plain prose
 * referencing the id it just labeled, e.g. `` `Conflicts-with: #570` ``
 * followed later by "the `#570` edge is..."), and that re-mention carries no
 * new edge. Fixed on Issue #569: without this, the duplicate propagated all
 * the way to a React key collision in Vinaya Studio's task table. */
function pushUnique(arr: string[], ids: string[]): void {
  for (const id of ids) {
    if (!arr.includes(id)) arr.push(id)
  }
}

function splitIds(raw: string): string[] {
  if (isEmptyMarker(raw)) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isEmptyMarker(s) && ID_TOKEN.test(s))
}

/**
 * Resolves each id in a comma-joined list against `lastSlug` (mutable,
 * carried across spans by the caller): a bare id (no slug of its own)
 * inherits the last-seen slug qualifier FOR THIS FIELD, then that
 * inheritance resets — a plain bare id (same-iteration reference) must not
 * silently pick up a stale cross-iteration slug from several spans back.
 * Confirmed real shape: Issue #388's body had a fully-qualified label span
 * (`` `Depends-on: aeg-governance-hardening #368` ``) followed by a bare
 * continuation span (`` `#372` ``) that was ALSO a same-slug reference — the
 * parser silently dropped the qualifier, which could misresolve `#372` as
 * this iteration's own issue instead of `aeg-governance-hardening`'s.
 */
function resolveIds(raw: string, lastSlug: { current: string | null }): string[] {
  const ids = splitIds(raw)
  const resolved: string[] = []
  for (const id of ids) {
    const qualified = id.match(SLUG_QUALIFIED_ID)
    if (qualified) {
      lastSlug.current = qualified[1] ?? null
      resolved.push(id)
    } else if (lastSlug.current) {
      resolved.push(`${lastSlug.current} ${id}`)
      lastSlug.current = null
    } else {
      resolved.push(id)
    }
  }
  return resolved
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
 * preceded it, however far back. A bare span's id also inherits the last
 * seen SLUG qualifier for that same field, one step only (`resolveIds`) —
 * fixed on Issue #388: a qualified label span followed by a bare
 * continuation span that was itself a same-slug reference used to silently
 * lose its qualifier.
 *
 * Each field (`dependsOn`/`conflictsWith`) is assigned by its FIRST labeled
 * span only. A later labeled span for a field already assigned is a prose
 * re-mention — e.g. an Amendment citing a removed historical value in
 * backticks for readability (`` `Depends-on: 2` `` describing a dropped
 * edge) — not a fresh re-declaration, and is ignored rather than resetting
 * or extending that field. Fixed on Issue #509: without this, the reader
 * treated the historical citation as a live edge, producing a
 * self-referencing dependency once the Issue was renumbered to that same
 * task id. This never collides with the tolerated multi-span convention
 * (Issue #383): there, only the FIRST span per field is ever labeled and
 * later values arrive as bare continuation spans, which this guard doesn't
 * touch.
 */
export function parseRationaleDeps(body: string): ParsedRationaleDeps {
  const section = extractSection(body)
  const dependsOn: string[] = []
  const conflictsWith: string[] = []
  let current: 'dependsOn' | 'conflictsWith' | null = null
  const assignedFields = new Set<'dependsOn' | 'conflictsWith'>()
  const lastSlugByField = {
    dependsOn: { current: null as string | null },
    conflictsWith: { current: null as string | null }
  }

  const spanPattern = /`([^`]*)`/g
  let match: RegExpExecArray | null = spanPattern.exec(section)
  while (match !== null) {
    const content = (match[1] ?? '').trim()
    const labelMatch = content.match(FIELD_LABEL)
    if (labelMatch) {
      const field = labelMatch[1]?.toLowerCase() === 'conflicts-with' ? 'conflictsWith' : 'dependsOn'
      if (!assignedFields.has(field)) {
        assignedFields.add(field)
        current = field
        const ids = resolveIds(labelMatch[2] ?? '', lastSlugByField[field])
        pushUnique(field === 'dependsOn' ? dependsOn : conflictsWith, ids)
      }
    } else if (current) {
      const ids = resolveIds(content, lastSlugByField[current])
      pushUnique(current === 'dependsOn' ? dependsOn : conflictsWith, ids)
    }
    match = spanPattern.exec(section)
  }

  return { dependsOn, conflictsWith }
}
