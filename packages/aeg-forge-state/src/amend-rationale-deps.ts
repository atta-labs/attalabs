import { FIELD_LABEL, NEXT_HEADER, SECTION_HEADER } from './parse-rationale-deps'

/**
 * Input to {@link amendRationaleDeps}. A field left `undefined` is untouched;
 * a field set to `[]` writes the explicit empty marker `—`. `date` is injected
 * by the caller (the bin/I-O layer), never generated in this pure function, so
 * the rewrite stays deterministic and testable.
 */
export type AmendDepsInput = {
  /** New `Depends-on` edge set. Omitted = leave that field's spans untouched. */
  dependsOn?: string[]
  /** New `Conflicts-with` edge set. `[]` = write the explicit empty marker `—`. */
  conflictsWith?: string[]
  /** The why — becomes the appended amendment paragraph's prose. */
  note: string
  /** `YYYY-MM-DD`, injected by the caller (bin), never generated here. */
  date: string
  /** Amendment author. Defaults to `Planner`. */
  actor?: string
}

type FieldKey = 'dependsOn' | 'conflictsWith'

const FIELD_META: Record<FieldKey, { label: string }> = {
  dependsOn: { label: 'Depends-on' },
  conflictsWith: { label: 'Conflicts-with' }
}

/** Canonical comma-joined value for a field's span: the ids, or `—` when empty. */
function canonicalValue(ids: string[]): string {
  return ids.length > 0 ? ids.join(', ') : '—'
}

type SpanHit = { start: number; end: number; inner: string; field: FieldKey }

/**
 * Scans the section's backtick spans left-to-right EXACTLY as
 * `parseRationaleDeps` does — carrying forward whichever field was last
 * labeled — and returns, in order, every span attributed to `field` (its
 * labeled span first, then any bare continuation spans). Shares the parser's
 * own `FIELD_LABEL` grammar; it does not re-implement it.
 */
function collectFieldSpans(section: string, field: FieldKey): SpanHit[] {
  const hits: SpanHit[] = []
  let current: FieldKey | null = null
  const spanPattern = /`([^`]*)`/g
  let match: RegExpExecArray | null = spanPattern.exec(section)
  while (match !== null) {
    const inner = match[1] ?? ''
    const labelMatch = inner.trim().match(FIELD_LABEL)
    if (labelMatch) {
      current = labelMatch[1]?.toLowerCase() === 'conflicts-with' ? 'conflictsWith' : 'dependsOn'
    }
    if (current === field) {
      hits.push({ start: match.index, end: match.index + match[0].length, inner, field })
    }
    match = spanPattern.exec(section)
  }
  return hits
}

/**
 * Rewrites one field's spans in the section to a single canonical comma-joined
 * span carrying `ids`, dropping (unwrapping) that field's superseded bare
 * continuation spans while leaving their surrounding prose intact. If the field
 * has no span in the section yet, a fresh canonical span is appended. A short
 * `(amended <date> — see Amendment below)` parenthetical is added beside the
 * field's canonical span so a human reading the field alone is pointed at the
 * amendment paragraph.
 */
function rewriteField(section: string, field: FieldKey, ids: string[], date: string): string {
  const { label } = FIELD_META[field]
  const value = canonicalValue(ids)
  const canonicalSpan = `\`${label}: ${value}\` (amended ${date} — see Amendment below)`
  const hits = collectFieldSpans(section, field)

  if (hits.length === 0) {
    // Field not present in the section — append a fresh canonical span before
    // any trailing whitespace so it lands inside the section, not after its
    // terminating blank line.
    const trailing = section.match(/\s*$/)?.[0] ?? ''
    const core = section.slice(0, section.length - trailing.length)
    return `${core} ${canonicalSpan}.${trailing}`
  }

  // Apply replacements from LAST to FIRST so earlier offsets stay valid.
  // First hit (always the labeled span) becomes the canonical span; every
  // later hit (bare continuation) is unwrapped to its inner text — no longer a
  // backtick span, so `parseRationaleDeps` no longer reads it.
  let out = section
  for (let i = hits.length - 1; i >= 0; i--) {
    const hit = hits[i] as SpanHit
    const replacement = i === 0 ? canonicalSpan : hit.inner
    out = out.slice(0, hit.start) + replacement + out.slice(hit.end)
  }
  return out
}

/**
 * Atomically rewrites an Issue body's structured `Dependency rationale` edge
 * set AND appends the matching `**Amendment (...)**` paragraph — the two halves
 * that five live incidents this session drifted apart (#429/#431, #388 twice,
 * #382) because nothing forced them to change together. Both happen in this one
 * function; there is no way to do one without the other (Issue #481, drift
 * class #1; the Ring 0 shape modeled on D-097's "the sanctioned path is the
 * only path").
 *
 * Deterministic and pure — `date` is injected. The amendment paragraph is
 * appended at the very END of the body, which keeps it structurally OUTSIDE the
 * parsed section by construction: its leading `**Amendment ...**` bold header
 * terminates the `parseRationaleDeps` section extractor (`NEXT_HEADER`), so the
 * `Depends-on`/`Conflicts-with` words and backtick spans inside the prose can
 * never pollute what the parser extracts.
 *
 * The caller (bin) gates every real invocation on a runtime round-trip check
 * (`parseRationaleDeps(result)` must deep-equal the requested sets) — never
 * trusting this rewrite by construction (Issue #481's own rationale: this class
 * bit the Planner four times by trusting assumptions over verification).
 *
 * @throws if the body has no `**Dependency rationale**` section — a conforming
 *   task Issue always has one; the caller turns this into a refusal.
 */
export function amendRationaleDeps(body: string, input: AmendDepsInput): string {
  const start = body.match(SECTION_HEADER)
  if (!start || start.index === undefined) {
    throw new Error('amendRationaleDeps: no "**Dependency rationale**" section found in the Issue body')
  }
  const sectionStart = start.index + start[0].length
  const rest = body.slice(sectionStart)
  const next = rest.match(NEXT_HEADER)
  const sectionEnd = next && next.index !== undefined ? next.index : rest.length

  const before = body.slice(0, sectionStart)
  let section = rest.slice(0, sectionEnd)
  const after = rest.slice(sectionEnd)

  if (input.dependsOn !== undefined) section = rewriteField(section, 'dependsOn', input.dependsOn, input.date)
  if (input.conflictsWith !== undefined)
    section = rewriteField(section, 'conflictsWith', input.conflictsWith, input.date)

  const actor = input.actor ?? 'Planner'
  const clauses: string[] = []
  if (input.dependsOn !== undefined) clauses.push(`Depends-on is now \`${canonicalValue(input.dependsOn)}\``)
  if (input.conflictsWith !== undefined)
    clauses.push(`Conflicts-with is now \`${canonicalValue(input.conflictsWith)}\``)

  const amendment =
    `**Amendment (${input.date}, ${actor}) — dependency edges updated via amend-deps.** ` +
    `${input.note} ${clauses.join('; ')}.`

  const rewrittenBody = before + section + after
  return `${rewrittenBody.replace(/\s*$/, '')}\n\n${amendment}\n`
}
