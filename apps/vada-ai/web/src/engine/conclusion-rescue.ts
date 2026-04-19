// Display-time rescue for stored conclusion JSON. Mirrors the engine's
// extractJson + repairJson + closeTruncatedJson so old rows where the
// Synthesizer's output was mangled or truncated still render on the
// deliberation page AND the benchmark page. Same code path both places —
// one source of truth, no drift.
//
// Used from server components so keeping it dependency-free (no 'use client').

function repairJson(s: string): string {
  return s.replace(/([^\\])"(\s+)"([A-Za-z_][A-Za-z0-9_]*)"(\s*):/g, '$1", "$3"$4:').replace(/,(\s*[}\]])/g, '$1')
}

function closeTruncatedJson(s: string): string | null {
  let inString = false
  let escaped = false
  let braces = 0
  let brackets = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (c === '\\') {
      escaped = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === '{') braces++
    else if (c === '}') braces--
    else if (c === '[') brackets++
    else if (c === ']') brackets--
    if (braces < 0 || brackets < 0) return null
  }
  let out = s
  if (inString) {
    if (out.endsWith('\\')) out = out.slice(0, -1)
    out += '"'
  }
  out = out.replace(/,\s*$/, '')
  while (brackets > 0) {
    out += ']'
    brackets--
  }
  while (braces > 0) {
    out += '}'
    braces--
  }
  return out
}

function tryParseVariants(s: string): Record<string, unknown> | null {
  const closed = closeTruncatedJson(s)
  const candidates = [s, repairJson(s), closed, closed ? repairJson(closed) : null].filter(
    (c): c is string => typeof c === 'string'
  )
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as Record<string, unknown>
      if (parsed && typeof parsed.recommendation === 'string') return parsed
    } catch {
      // try next
    }
  }
  return null
}

// Given a `recommendation` field that might hold a raw / truncated JSON
// string (salvage artifact from before the engine's robust parser), return
// the structured conclusion if we can recover one, else null.
export function rescueFromStringifiedJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim()
  if (!trimmed.includes('{') || !trimmed.includes('}')) return null
  const slices: string[] = []
  const outer = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(trimmed)
  if (outer?.[1]) slices.push(outer[1].trim())
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first !== -1 && last > first) slices.push(trimmed.slice(first, last + 1))
  slices.push(trimmed)
  for (const s of slices) {
    const parsed = tryParseVariants(s)
    if (parsed) return parsed
  }
  return null
}

// Given a conclusion row (originalJson/revisedJson), return the best
// renderable conclusion object. Prefers revisedJson when present, handles
// the legacy { raw, error } shape, and rescues salvage-artifact recommendations.
export function extractRenderableConclusion(
  conclusionRow: {
    originalJson?: Record<string, unknown> | null
    revisedJson?: Record<string, unknown> | null
  } | null
): Record<string, unknown> | null {
  if (!conclusionRow) return null
  let candidate = conclusionRow.revisedJson ?? conclusionRow.originalJson ?? null
  if (!candidate) return null

  // Legacy shape { raw, error } — raw often contains valid JSON.
  if (typeof candidate.raw === 'string' && !candidate.recommendation) {
    try {
      const parsed = JSON.parse(candidate.raw) as Record<string, unknown>
      if (parsed && typeof parsed.recommendation === 'string') {
        candidate = parsed
      }
    } catch {
      // fall through — rescue below may still recover
    }
  }

  // Salvage artifact — recommendation contains a stringified JSON blob.
  if (typeof candidate.recommendation === 'string') {
    const rescued = rescueFromStringifiedJson(candidate.recommendation)
    if (rescued) candidate = rescued
  }

  return candidate
}
