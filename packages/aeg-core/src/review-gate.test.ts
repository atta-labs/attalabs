import { describe, expect, it } from 'vitest'
import { checkReviewGate } from './review-gate'

const APPROVE_COMMENT = 'Reviewed the diff. verdict: APPROVE. Looks clean.'
const PASS_COMMENT = 'security review: PASS, no findings.'
const REQUEST_CHANGES_COMMENT = 'verdict: REQUEST_CHANGES — see inline notes.'
const FAIL_COMMENT = 'FAIL — hardcoded credential found. security scan complete.'

describe('checkReviewGate', () => {
  it('passes when both verdicts are clean (APPROVE + PASS)', () => {
    const result = checkReviewGate({
      comments: [APPROVE_COMMENT, PASS_COMMENT],
      labels: [],
      waiverLabelActor: null
    })
    expect(result.verdict).toBe('pass')
    expect(result.waived).toBe(false)
  })

  it('fails when no review comments exist at all (the historical-PR case, e.g. PR #435)', () => {
    const result = checkReviewGate({ comments: [], labels: [], waiverLabelActor: null })
    expect(result.verdict).toBe('fail')
    expect(result.reason).toContain('code-reviewer verdict is not a clean APPROVE')
    expect(result.reason).toContain('security-review verdict is not a clean PASS')
  })

  it('fails when code review is REQUEST_CHANGES even though security is PASS', () => {
    const result = checkReviewGate({
      comments: [REQUEST_CHANGES_COMMENT, PASS_COMMENT],
      labels: [],
      waiverLabelActor: null
    })
    expect(result.verdict).toBe('fail')
    expect(result.reason).toContain('code-reviewer verdict is not a clean APPROVE (found: REQUEST CHANGES)')
  })

  it('fails when security is FAIL even though code review is APPROVE', () => {
    const result = checkReviewGate({
      comments: [APPROVE_COMMENT, FAIL_COMMENT],
      labels: [],
      waiverLabelActor: null
    })
    expect(result.verdict).toBe('fail')
    expect(result.reason).toContain('security-review verdict is not a clean PASS (found: FAIL)')
  })

  it('fails when only one of the two verdicts is present', () => {
    const result = checkReviewGate({ comments: [APPROVE_COMMENT], labels: [], waiverLabelActor: null })
    expect(result.verdict).toBe('fail')
    expect(result.reason).toContain('security-review verdict is not a clean PASS')
  })

  it('passes when both verdicts are clean, regardless of comment order', () => {
    const result = checkReviewGate({
      comments: [PASS_COMMENT, APPROVE_COMMENT],
      labels: [],
      waiverLabelActor: null
    })
    expect(result.verdict).toBe('pass')
  })

  describe('waiver:review actor verification (D-097 pattern)', () => {
    it('label absent → gate still evaluates verdicts normally (fails on empty comments)', () => {
      const result = checkReviewGate({ comments: [], labels: ['tier:1'], waiverLabelActor: 'daniboomerang' })
      expect(result.verdict).toBe('fail')
      expect(result.waived).toBe(false)
    })

    it('label present, actor not in allowlist → ignored, gate still fails on missing verdicts', () => {
      const result = checkReviewGate({
        comments: [],
        labels: ['waiver:review'],
        waiverLabelActor: 'some-agent-bot'
      })
      expect(result.verdict).toBe('fail')
      expect(result.waived).toBe(false)
    })

    it('label present, actor null (no labeling event found) → ignored, gate fails', () => {
      const result = checkReviewGate({ comments: [], labels: ['waiver:review'], waiverLabelActor: null })
      expect(result.verdict).toBe('fail')
      expect(result.waived).toBe(false)
    })

    it('label present, actor in allowlist → passes without any review comments', () => {
      const result = checkReviewGate({
        comments: [],
        labels: ['waiver:review'],
        waiverLabelActor: 'daniboomerang'
      })
      expect(result.verdict).toBe('pass')
      expect(result.waived).toBe(true)
    })

    it('a different label (waiver:docs) applied by the principal does not waive the review gate', () => {
      const result = checkReviewGate({
        comments: [],
        labels: ['waiver:docs'],
        waiverLabelActor: 'daniboomerang'
      })
      expect(result.verdict).toBe('fail')
      expect(result.waived).toBe(false)
    })
  })
})
