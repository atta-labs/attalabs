/**
 * vocabulary-citation.ts — a generic, regex-parameterized citation checker.
 *
 * `retired-vocabulary.test.ts` hand-rolls this exact sweep shape (pattern +
 * scope + exemptions + a non-vacuity self-test) for this repo's own internal
 * use, but as a `vitest` file no adopter can install it — and it hardcodes
 * every pattern, scope and exemption as a repo-specific literal. This module
 * generalizes the sweep into a reusable primitive: every pattern, its scope,
 * its exemptions, and the sample that proves it is not vacuous arrive as
 * caller-supplied input. It contains no product name, host-tool path, or
 * any other repo-specific literal — that knowledge belongs to whoever
 * configures an instance (a Vinaya check bin is one such consumer).
 *
 * Pure — no `fs`, no child-process I/O. The caller injects `grepFn`/
 * `matchFn`, mirroring `evaluateC5`'s `fileExists` injection in
 * `doc-owners.ts`: this file decides what counts as a finding, the I/O shim
 * decides how to look.
 */

export type VocabularyPattern = {
  /** Short, stable id for reporting — never the raw regex, which can be long. */
  id: string
  /**
   * POSIX ERE, `grep -E` compatible. Never `\d`/`\w`/`\s` — GNU grep reads
   * those as literal characters, not shorthand classes, so a pattern relying
   * on them can pass locally (a permissive grep) and go silently vacuous on
   * CI (GNU grep). Use `[0-9]` etc. instead. `\b` is safe: both GNU and BSD
   * `grep -E` support it as an extension.
   */
  pattern: string
  /** Repo-root-relative paths/dirs this pattern is checked against. */
  scope: string[]
  /** Path substrings exempted for this pattern only, beyond `globalExempt`. */
  exempt?: string[]
  /**
   * Substrings that, when present on the matched LINE, make the hit legitimate.
   * Distinct from `exempt`, which filters by path: a name can be leakage in one
   * sentence and the product's own identifier in the next, within the same file.
   * An npm scope or a domain that merely CONTAINS a product name is the product
   * naming itself, not an unexplained reference an adopter cannot resolve —
   * exempting the whole file would blind the pattern to real leakage beside it.
   */
  exemptContent?: string[]
  /** A string this pattern MUST match — proves the pattern is not vacuous. */
  sample: string
  /**
   * When true, a hit on a line that is a markdown table row (starts with
   * `|`, ignoring leading whitespace) is not a finding. A registry table's
   * "implementation" column citing a harness path is verified by a gate
   * (e.g. `verify-registry.ts`'s G1/G2), not a claim stated as normative
   * prose — banning the shape would flag the very registry a widened
   * pattern exists to protect.
   */
  exemptTableRow?: boolean
}

export type VocabularyHit = { file: string; line: number; content: string }

export type VocabularyFinding = VocabularyHit & { patternId: string }

export type VocabularyCheckResult = {
  findings: VocabularyFinding[]
  /**
   * Patterns whose sample failed to self-match — a config bug, reported
   * loud instead of silently passing. A pattern that matches nothing passes
   * every scope silently, which is not hypothetical: this is the exact
   * failure mode `retired-vocabulary.test.ts`'s own non-vacuity suite exists
   * to catch (`\bD-(###|NNN)\b` shipped green over eleven live sites because
   * `\b` cannot anchor after `#`).
   */
  vacuousPatterns: string[]
}

const TABLE_ROW = /^\s*\|/

/**
 * Evaluates every pattern against its own scope, filtering exempted paths
 * and (optionally) table-row citations, and reports which patterns proved
 * vacuous against their own sample instead of silently returning clean.
 */
export function evaluateVocabularyCitation(
  patterns: VocabularyPattern[],
  grepFn: (pattern: string, scope: string[]) => VocabularyHit[],
  matchFn: (pattern: string, sample: string) => boolean,
  globalExempt: string[] = []
): VocabularyCheckResult {
  const findings: VocabularyFinding[] = []
  const vacuousPatterns: string[] = []

  for (const p of patterns) {
    if (!matchFn(p.pattern, p.sample)) {
      vacuousPatterns.push(p.id)
      continue
    }

    const exempt = [...globalExempt, ...(p.exempt ?? [])]
    const exemptContent = p.exemptContent ?? []
    const hits = grepFn(p.pattern, p.scope).filter((h) => {
      if (exempt.some((e) => h.file.includes(e))) return false
      if (exemptContent.some((e) => h.content.includes(e))) return false
      if (p.exemptTableRow && TABLE_ROW.test(h.content)) return false
      return true
    })

    for (const h of hits) findings.push({ ...h, patternId: p.id })
  }

  return { findings, vacuousPatterns }
}
