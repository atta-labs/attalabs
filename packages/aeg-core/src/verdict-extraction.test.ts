import { describe, expect, it } from 'vitest'
import { extractCodeReviewVerdict, extractSecurityReviewVerdict } from './verdict-extraction'

/**
 * The post-merge Archivist's real, auto-generated DANGLING placeholder text
 * (`archive-task.ts`'s `extractVerdict`, missing-comment case) — the literal
 * string that appears on real merged PRs (e.g. #471/#472) when no
 * security-review comment exists yet. Contains the standalone word "pass"
 * ("...security-review pass was run...") — the exact bare-word-match exploit
 * this tightening closes.
 */
const DANGLING_SECURITY_PLACEHOLDER = 'no security-review pass was run before merge — DANGLING, see below'
const DANGLING_CODE_REVIEW_PLACEHOLDER = 'no code-reviewer pass was run before merge — DANGLING, see below'

/** A real subagent report, copied verbatim from `roles/reviewer.md`'s "Output format" template. */
const REAL_CODE_REVIEWER_REPORT = `VERDICT: APPROVE

BRIEF CONFORMANCE: implements exactly what the brief asked.
SPEC CONFORMANCE: clean

FINDINGS (ordered by severity):
1. [MINOR] src/foo.ts:12 — a nit, not blocking

SCOPE: clean
TESTS: honest`

/** A real subagent report, copied verbatim from `roles/security.md`'s "Output format" template. */
const REAL_SECURITY_REVIEWER_REPORT = `VERDICT: PASS

FINDINGS (ordered by severity):
1. [LOW] src/foo.ts:12 — informational only

CONFIG SCAN: clean
SECRETS: none found`

describe('extractCodeReviewVerdict', () => {
  it('extracts APPROVE from a standalone VERDICT: line', () => {
    const result = extractCodeReviewVerdict(['VERDICT: APPROVE'])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })

  it('extracts REQUEST CHANGES (normalizing the separator) from a VERDICT: line', () => {
    const result = extractCodeReviewVerdict(['VERDICT: REQUEST_CHANGES'])
    expect(result).toEqual({ value: 'REQUEST CHANGES', danglingNote: null })
  })

  it('extracts LGTM from a VERDICT: line', () => {
    const result = extractCodeReviewVerdict(['VERDICT: LGTM'])
    expect(result).toEqual({ value: 'LGTM', danglingNote: null })
  })

  it('is DANGLING/missing when no comment carries the marker at all', () => {
    const result = extractCodeReviewVerdict(['unrelated comment', 'ship it'])
    expect(result.danglingNote).toBe('no code-reviewer verdict comment found on this PR')
    expect(result.value).toContain('DANGLING')
  })

  it('prefers a later clean APPROVE over an earlier REQUEST CHANGES (real review-cycle shape)', () => {
    const result = extractCodeReviewVerdict([
      'VERDICT: REQUEST CHANGES\n\nplease address the inline notes.',
      'Fixed per feedback.',
      'VERDICT: APPROVE\n\nlooks good now.'
    ])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })

  // ---- required regression coverage (aeg-review-gate-v1 task 1 follow-up, security FAIL finding) ----

  it('regression 1: the literal DANGLING placeholder string does NOT produce a clean verdict', () => {
    const result = extractCodeReviewVerdict([
      `### AEG provenance\n- Code review: ${DANGLING_CODE_REVIEW_PLACEHOLDER}\n\nDANGLING: no code-reviewer verdict comment found on this PR`
    ])
    expect(result.danglingNote).not.toBeNull()
    expect(result.value).not.toBe('APPROVE')
  })

  it('regression 2: negated/incidental prose containing the bare word does NOT produce a clean APPROVE', () => {
    const result = extractCodeReviewVerdict(['I do NOT approve of that design — it needs a rethink.'])
    expect(result.danglingNote).not.toBeNull()
    expect(result.value).not.toBe('APPROVE')
  })

  it('regression 3: a real, line-anchored VERDICT: APPROVE (matching the actual subagent report shape) still produces a clean verdict', () => {
    const result = extractCodeReviewVerdict([REAL_CODE_REVIEWER_REPORT])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })

  it('regression 4: most-recent-clear-hit-wins tie-breaking still works under the tightened pattern', () => {
    const result = extractCodeReviewVerdict([
      'VERDICT: REQUEST CHANGES',
      DANGLING_CODE_REVIEW_PLACEHOLDER, // an intervening comment that must not count as a "clear hit"
      'VERDICT: APPROVE'
    ])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })
})

describe('extractSecurityReviewVerdict', () => {
  it('extracts PASS from a standalone VERDICT: line', () => {
    const result = extractSecurityReviewVerdict(['VERDICT: PASS'])
    expect(result).toEqual({ value: 'PASS', danglingNote: null })
  })

  it('extracts FAIL from a standalone VERDICT: line', () => {
    const result = extractSecurityReviewVerdict(['VERDICT: FAIL'])
    expect(result).toEqual({ value: 'FAIL', danglingNote: null })
  })

  it('is DANGLING/missing when no comment carries the marker at all', () => {
    const result = extractSecurityReviewVerdict(['unrelated comment'])
    expect(result.danglingNote).toBe('no security-review verdict comment found on this PR')
  })

  // ---- required regression coverage (aeg-review-gate-v1 task 1 follow-up, security FAIL finding) ----

  it('regression 1 (the confirmed exploit): the Archivist DANGLING placeholder\'s bare "pass" does NOT produce a clean PASS', () => {
    const result = extractSecurityReviewVerdict([
      `### AEG provenance\n- Security: ${DANGLING_SECURITY_PLACEHOLDER}\n\nDANGLING: no security-review verdict comment found on this PR`
    ])
    expect(result.value).not.toBe('PASS')
    expect(result.danglingNote).not.toBeNull()
  })

  it("regression 2: a code-reviewer's own VERDICT: APPROVE comment does not falsely satisfy the security extractor", () => {
    const result = extractSecurityReviewVerdict([REAL_CODE_REVIEWER_REPORT])
    expect(result.value).not.toBe('PASS')
    expect(result.value).not.toBe('FAIL')
    expect(result.danglingNote).toBe('no security-review verdict comment found on this PR')
  })

  it('regression 3: a real, line-anchored VERDICT: PASS (matching the actual subagent report shape) still produces a clean verdict', () => {
    const result = extractSecurityReviewVerdict([REAL_SECURITY_REVIEWER_REPORT])
    expect(result).toEqual({ value: 'PASS', danglingNote: null })
  })

  it('regression 4: most-recent-clear-hit-wins tie-breaking still works under the tightened pattern', () => {
    const result = extractSecurityReviewVerdict([
      'VERDICT: FAIL',
      DANGLING_SECURITY_PLACEHOLDER, // an intervening comment that must not count as a "clear hit"
      'VERDICT: PASS'
    ])
    expect(result).toEqual({ value: 'PASS', danglingNote: null })
  })
})
