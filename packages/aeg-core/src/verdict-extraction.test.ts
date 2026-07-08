import { describe, expect, it } from 'vitest'
import { extractCodeReviewVerdict, extractSecurityReviewVerdict } from './verdict-extraction'

describe('extractCodeReviewVerdict', () => {
  it('extracts APPROVE from a verdict comment', () => {
    const result = extractCodeReviewVerdict(['Reviewed the diff. verdict: APPROVE. Looks clean.'])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })

  it('extracts REQUEST CHANGES (normalizing the separator) from a verdict comment', () => {
    const result = extractCodeReviewVerdict(['verdict: REQUEST_CHANGES — see inline notes.'])
    expect(result).toEqual({ value: 'REQUEST CHANGES', danglingNote: null })
  })

  it('extracts LGTM from a verdict comment', () => {
    const result = extractCodeReviewVerdict(['LGTM, nice work.'])
    expect(result).toEqual({ value: 'LGTM', danglingNote: null })
  })

  it('is DANGLING when no comment carries a code-review marker', () => {
    const result = extractCodeReviewVerdict(['unrelated comment', 'ship it'])
    expect(result.danglingNote).toBe('no code-reviewer verdict comment found on this PR')
    expect(result.value).toContain('DANGLING')
  })

  it('is DANGLING when a comment mentions review but the verdict marker is unclear', () => {
    const result = extractCodeReviewVerdict(['code review in progress, verdict pending'])
    expect(result.danglingNote).toBe('code-reviewer comment found but could not extract a clear verdict marker')
  })

  it('prefers a later clean APPROVE over an earlier REQUEST_CHANGES (real review-cycle shape)', () => {
    const result = extractCodeReviewVerdict([
      'verdict: REQUEST_CHANGES — please address the inline notes.',
      'Fixed per feedback.',
      'verdict: APPROVE — looks good now.'
    ])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })

  it('is not poisoned by an earlier DANGLING-note comment that merely mentions "verdict" in prose (live PR #461/#472 shape)', () => {
    const result = extractCodeReviewVerdict([
      '### AEG provenance — task 7\n- Code review: no code-reviewer pass was run before merge — DANGLING, see below\n\nDANGLING: no code-reviewer verdict comment found on this PR',
      'Code review (retroactive) — APPROVE. Verified independently.'
    ])
    expect(result).toEqual({ value: 'APPROVE', danglingNote: null })
  })
})

describe('extractSecurityReviewVerdict', () => {
  it('extracts PASS from a security-review comment', () => {
    const result = extractSecurityReviewVerdict(['security review: PASS, no findings.'])
    expect(result).toEqual({ value: 'PASS', danglingNote: null })
  })

  it('extracts FAIL from a security-review comment', () => {
    const result = extractSecurityReviewVerdict(['FAIL — hardcoded credential found. security scan complete.'])
    expect(result).toEqual({ value: 'FAIL', danglingNote: null })
  })

  it('is DANGLING when no comment carries a security-review marker', () => {
    const result = extractSecurityReviewVerdict(['unrelated comment'])
    expect(result.danglingNote).toBe('no security-review verdict comment found on this PR')
  })
})
