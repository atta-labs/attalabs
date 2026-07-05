/**
 * PR tier derivation and the docs-gate override check. Pure — takes the diff,
 * PR body, and env-derived strings as explicit parameters. The original
 * `scripts/verify-docs.ts` read `process.env.PR_BODY` / `OVERRIDE_DOCS` /
 * `PR_LABELS` directly inside these functions; that hidden I/O is removed
 * here — the caller (the CLI shim) reads env once and passes the values in.
 */

import { anchoredRegion } from './anchored-region'
import { isDecisionLog, isDocFile, isSpecFile } from './file-classify'

/**
 * Derive a tier from the changed-file list when no `Tier:` field is in the PR body.
 *
 * Rules (in priority order):
 *   1. Decision log in diff       → Tier 3  (caller must still emit C0 — explicit declaration required)
 *   2. Spec or doc file in diff   → Tier 1
 *   3. Otherwise (code/config…)   → Tier 0
 */
export function deriveTierFromDiff(changed: string[]): 0 | 1 | 3 {
  if (changed.some(isDecisionLog)) return 3
  if (changed.some((p) => isSpecFile(p) || isDocFile(p))) return 1
  return 0
}

/**
 * Read the `Tier:` field from the PR body.
 *
 * Tolerates the three markdown shapes the field appears in:
 *   - plain:        `Tier: 3`
 *   - bold colon:   `**Tier:** 3`   (the `**` wraps `Tier:` including the colon)
 *   - bold label:   `**Tier**: 3`   (the `**` wraps only `Tier`)
 *
 * The field may appear inline in a metadata line (e.g.
 * `Iteration: x · Task: 1 · **Tier:** 3 · Project: y`), so it is NOT anchored
 * to line-start. Returns null when no Tier field is present at all — the caller
 * decides what a missing tier means (PR mode treats it as an explicit error,
 * NOT a silent default).
 *
 * When the body carries an `AEG:TIER` anchor pair (`anchored-region.ts`,
 * task 30), the same regex runs exclusively inside that pair — a `Tier:`
 * mention anywhere else (a pasted reference brief, a quoted example) is
 * ignored. Bodies without the pair parse exactly as before.
 */
export function readTierFromPrBody(prBody: string): 0 | 1 | 3 | null {
  const searchIn = anchoredRegion(prBody, 'TIER') ?? prBody
  // Match an optional bold-open, the word Tier, an optional bold-close, a colon,
  // an optional bold-close (covers `**Tier:**`), optional space, then the digit.
  const m = searchIn.match(/(\*\*)?\s*Tier\s*(\*\*)?\s*:\s*(\*\*)?\s*([013])\b/i)
  if (!m) return null
  const t = Number(m[4])
  return t === 0 || t === 1 || t === 3 ? (t as 0 | 1 | 3) : null
}

export function overrideActive(opts: { overrideDocsEnv?: string; prLabels?: string; prBody?: string }): boolean {
  if (opts.overrideDocsEnv === '1') return true
  const labels = (opts.prLabels || '').split(',').map((s) => s.trim())
  if (labels.includes('override:docs')) return true
  if ((opts.prBody || '').includes('[override:docs]')) return true
  return false
}
