import { describe, expect, it } from 'vitest'
import { evaluateTestPlanGate } from './test-plan-gate'

const TASK_BRANCH = 'task/herald-hardening-v1/2'
const NON_TASK_BRANCH = 'fix/some-bug'

/** A faithful excerpt of PR #377's real body — the exact live-fire specimen
 * (aeg-governance-hardening task 25, #365): a `## 9. Test Plan` heading, two
 * ticked `[agent]` items, and one unticked `[principal]` item. The original
 * inline-only regex found no `Test Plan:` section here and advisory-PASSED. */
const PR_377_SPECIMEN = `## Summary

Fix audit YAML tracing.

## 9. Test Plan

- [x] **[agent]** Production build trace evidence: the YAML path appears in the traced output for every auditor route.

- [x] **[agent]** Booted production server: public (DANI_PROFILE) audit request returned a real report.

- [ ] **[principal]** BYOK path end-to-end in a real signed-in browser: run an audit with a real key.

## 10. Stop conditions

STOP and report if: pre-flight fails.
`

describe('evaluateTestPlanGate — empty body', () => {
  it('passes when PR_BODY is empty (local invocation)', () => {
    const result = evaluateTestPlanGate('', TASK_BRANCH)
    expect(result.verdict).toBe('pass')
  })
})

describe('evaluateTestPlanGate — the PR #377 live-fire specimen', () => {
  it('FAILs on the unticked [principal] box when read as a task-branch PR', () => {
    const result = evaluateTestPlanGate(PR_377_SPECIMEN, TASK_BRANCH)
    expect(result.verdict).toBe('fail')
    expect(result.messages.join('\n')).toContain('[principal]** BYOK path end-to-end')
  })
})

describe('evaluateTestPlanGate — both section forms parsed', () => {
  it('parses the heading form and PASSes when all boxes are ticked', () => {
    const body = '## 9. Test Plan\n\n- [x] **[agent]** did the thing\n\n## 10. Stop conditions\n\nx'
    const result = evaluateTestPlanGate(body, TASK_BRANCH)
    expect(result.verdict).toBe('pass')
  })

  it('parses the inline **Test Plan:** marker form and PASSes when all boxes are ticked', () => {
    const body = '**Test Plan:**\n\n- [x] **[agent]** did the thing\n\n## Scope\n\nx'
    const result = evaluateTestPlanGate(body, TASK_BRANCH)
    expect(result.verdict).toBe('pass')
  })

  it('parses the inline Test Plan: unit-tests-only sentinel and PASSes', () => {
    const body = '## Summary\n\nx\n\nTest Plan: unit-tests-only\n\n## Scope\n\ny'
    const result = evaluateTestPlanGate(body, TASK_BRANCH)
    expect(result.verdict).toBe('pass')
  })
})

describe('evaluateTestPlanGate — no section at all', () => {
  it('FAILs loud on a task branch with no Test Plan section anywhere', () => {
    const body = '## Summary\n\nx\n\n## Scope\n\nno test plan section here'
    const result = evaluateTestPlanGate(body, TASK_BRANCH)
    expect(result.verdict).toBe('fail')
    expect(result.messages.join('\n')).toContain('no Test Plan section found')
    expect(result.messages.join('\n')).toContain(TASK_BRANCH)
  })

  it('PASSes (advisory) on a non-task branch with no Test Plan section', () => {
    const body = '## Summary\n\nx\n\n## Scope\n\nno test plan section here'
    const result = evaluateTestPlanGate(body, NON_TASK_BRANCH)
    expect(result.verdict).toBe('pass')
  })

  it('PASSes (advisory) when BRANCH is unset entirely', () => {
    const body = '## Summary\n\nx\n\n## Scope\n\nno test plan section here'
    const result = evaluateTestPlanGate(body, '')
    expect(result.verdict).toBe('pass')
  })
})

describe('evaluateTestPlanGate — unticked boxes', () => {
  it('FAILs and names every unticked line', () => {
    const body = [
      '## Test Plan',
      '',
      '- [x] **[agent]** done',
      '- [ ] **[agent]** not done yet',
      '- [ ] **[principal]** also not done'
    ].join('\n')
    const result = evaluateTestPlanGate(body, TASK_BRANCH)
    expect(result.verdict).toBe('fail')
    const joined = result.messages.join('\n')
    expect(joined).toContain('not done yet')
    expect(joined).toContain('also not done')
  })
})
