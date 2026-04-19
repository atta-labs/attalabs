// Conclusion parsing utilities — moved from apps/vada-ai/web/src/engine/turn.ts.
// These are pure functions with no Node.js or framework dependencies.

import type { Conclusion } from './conclusion-schema'
import { ConclusionSchema } from './conclusion-schema'

// Best-effort repair of common JSON mistakes produced by smaller models.
// Not a full parser — just targeted regex fixes for the shapes we've seen
// in real deliberation outputs. Observed failure modes: Llama/Mistral emit
// adjacent key-value pairs with no separating comma; many models trail a
// comma before `}`. DO NOT remove without understanding why.
function repairJson(s: string): string {
  let out = s
  // Missing comma between a string value and the next key:
  //   "foo": "bar" "baz": "qux"  →  "foo": "bar", "baz": "qux"
  out = out.replace(/([^\\])"(\s+)"([A-Za-z_][A-Za-z0-9_]*)"(\s*):/g, '$1", "$3"$4:')
  // Trailing comma before } or ]
  out = out.replace(/,(\s*[}\]])/g, '$1')
  return out
}

// Close truncated JSON. Small models under max_tokens emit `{ "recommendation":
// "...long string...` and just stop mid-value. Walk the string tracking string
// vs structural context, then append whatever closers are still open.
// Returns the balanced string, or null if structurally invalid (unmatched
// closers we can't recover from). Observed failure mode: any model with a
// tight token budget hits the ceiling mid-string-value; removing this causes
// all such outputs to become ERROR instead of CLEAN. DO NOT remove without understanding why.
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
  // If we ended mid-string, close it. Also trim a trailing backslash that
  // would escape our closing quote.
  if (inString) {
    if (out.endsWith('\\')) out = out.slice(0, -1)
    // Trim a trailing lone ',' or ':' that would make the post-close syntax
    // invalid (e.g. `"foo": "bar\nbaz` → closing gives `"baz"` at end; but
    // if the value ended with a colon followed by nothing, the repair still
    // produces junk — the parent object-close below then adds `}` which
    // JSON.parse will reject anyway, surfaces naturally as failure).
    out += '"'
  }
  // Drop dangling `,` that would sit between the last-closed value and the
  // appended `}` or `]`.
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

// Extract a JSON object from a model response that may be wrapped in code
// fences, prefixed with prose, contain nested ``` blocks inside string
// values, or have small syntax mistakes (missing commas, trailing commas).
// Observed failure modes: many models wrap output in ```json ... ``` fences;
// some prefix with "Here is the JSON:" prose; others return naked JSON.
// Strategy: try several candidate slices, with and without repair, and
// return the first one that parses. Falls back to trimmed raw — JSON.parse
// downstream will then throw and salvage takes over. DO NOT remove without understanding why.
function extractJson(raw: string): string {
  const trimmed = raw.trim()
  const slices: string[] = []

  // 1. Outer single ```json ... ``` wrapper around the entire response.
  const outer = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(trimmed)
  if (outer?.[1]) slices.push(outer[1].trim())

  // 2. First `{` to last `}` — robust against prose before/after the JSON.
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first !== -1 && last > first) slices.push(trimmed.slice(first, last + 1))

  // 3. Raw as-is (model returned naked JSON with no wrapper).
  slices.push(trimmed)

  // Try each slice four ways, in order of increasing aggression:
  //   1. as-is
  //   2. repairJson (missing commas, trailing commas)
  //   3. closeTruncatedJson (append missing `"` `]` `}` when output was cut
  //      off before the synthesizer finished)
  //   4. closeTruncatedJson + repairJson (both repairs chained)
  const attempts: Array<(s: string) => string | null> = [
    (x) => x,
    (x) => repairJson(x),
    (x) => closeTruncatedJson(x),
    (x) => {
      const closed = closeTruncatedJson(x)
      return closed ? repairJson(closed) : null
    }
  ]
  for (const s of slices) {
    for (const attempt of attempts) {
      const candidate = attempt(s)
      if (candidate == null) continue
      try {
        JSON.parse(candidate)
        return candidate
      } catch {
        // next attempt
      }
    }
  }
  return trimmed
}

export function parseConclusionJson(raw: string): Conclusion | null {
  try {
    const parsed: unknown = JSON.parse(extractJson(raw))
    return ConclusionSchema.parse(parsed)
  } catch {
    return null
  }
}

// Second-chance parse. Some providers (Gemini is the worst offender) return
// valid JSON that almost matches the schema but flattens `unresolved_points`
// into a string[] and omits `participants`. The deliberation already happened;
// dropping to salvage loses all the structure. Instead we coerce the known
// drift shapes and re-validate before giving up. Each coercion step targets
// a defect observed in production: string[] items (Gemini), object drift with
// renamed keys like `disagreement`/`disement`/`point_of_disagreement` (Qwen,
// GPT-4o), missing `participants` (most non-Anthropic providers).
// DO NOT remove without understanding why.
export function parseConclusionLenient(raw: string, agents: string[]): Conclusion | null {
  try {
    const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>
    const patched: Record<string, unknown> = { ...parsed }

    if (Array.isArray(patched.unresolved_points)) {
      patched.unresolved_points = patched.unresolved_points.map((item) => {
        if (typeof item === 'string') return { point: item, agents_involved: [] }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          // Model drift observed in the wild: `{ agents, disagreement }`,
          // `{ agents, disement }` (typo), `{ description }`, etc. Try each
          // likely text field before giving up and stringifying the object.
          // Try every text-ish key the models have produced in the wild.
          // Order matters only when multiple are present — prefer the most
          // specific first. `point_of_disagreement` is Qwen's favorite.
          const textKeys = [
            'point',
            'point_of_disagreement',
            'pointOfDisagreement',
            'disagreement',
            'disement',
            'description',
            'statement',
            'summary',
            'issue',
            'text'
          ]
          let point: string | null = null
          for (const k of textKeys) {
            const v = obj[k]
            if (typeof v === 'string' && v.trim().length > 0) {
              point = v
              break
            }
          }
          // Typo-tolerant fallback: if no recognized key matched, pick the
          // longest non-empty string value in the object. Catches model
          // typos like `poof_disagreement` or novel keys like `conflict`.
          if (!point) {
            let longest = ''
            for (const k of Object.keys(obj)) {
              const v = obj[k]
              if (typeof v === 'string' && v.trim().length > longest.length) longest = v
            }
            if (longest) point = longest
          }
          if (!point) point = JSON.stringify(item)
          const agentsInvolved = Array.isArray(obj.agents_involved)
            ? obj.agents_involved.filter((a): a is string => typeof a === 'string')
            : Array.isArray(obj.agents)
              ? obj.agents.filter((a): a is string => typeof a === 'string')
              : []
          return { point, agents_involved: agentsInvolved }
        }
        return { point: String(item), agents_involved: [] }
      })
    }

    if (!Array.isArray(patched.participants)) {
      patched.participants = agents.map((a) => ({ agent: a, version: 'v1' }))
    }

    return ConclusionSchema.parse(patched)
  } catch {
    return null
  }
}

export function classifyVerdict(raw: string): 'PASS' | string {
  const trimmed = raw.trim()
  const upper = trimmed.toUpperCase()
  if (upper.includes('PASS') && !upper.includes('FLAG')) return 'PASS'
  return trimmed
}
