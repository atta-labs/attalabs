import { describe, expect, it } from 'vitest'
import { locateTestPlanSection } from './test-plan-section'

describe('locateTestPlanSection — inline form', () => {
  it('finds the bold inline marker', () => {
    const body = '## Summary\n\nsomething\n\n**Test Plan:**\n\n- [x] **[agent]** did a thing\n\n## Scope\n\nmore'
    const result = locateTestPlanSection(body)
    expect(result.found).toBe(true)
    if (result.found) {
      expect(result.section).toContain('[x] **[agent]** did a thing')
      expect(result.section).not.toContain('## Scope')
    }
  })

  it('finds the unit-tests-only sentinel on the same line', () => {
    const body = '## Summary\n\nx\n\nTest Plan: unit-tests-only\n\n## Scope\n\ny'
    const result = locateTestPlanSection(body)
    expect(result.found).toBe(true)
    if (result.found) expect(result.section).toContain('unit-tests-only')
  })
})

describe('locateTestPlanSection — heading form (the PR #377 live-fire gap)', () => {
  it('finds a plain heading', () => {
    const body = '## Summary\n\nx\n\n## Test Plan\n\n- [x] **[agent]** did a thing\n\n## Scope\n\ny'
    const result = locateTestPlanSection(body)
    expect(result.found).toBe(true)
    if (result.found) {
      expect(result.section).toContain('[x] **[agent]** did a thing')
      expect(result.section).not.toContain('## Scope')
    }
  })

  it('finds a numbered heading (## 9. Test Plan — the exact PR #377 shape)', () => {
    const body = [
      '## 8. Documentation-update list',
      '',
      '- some doc',
      '',
      '## 9. Test Plan',
      '',
      '- [x] **[agent]** Production build trace evidence: ...',
      '',
      '- [ ] **[principal]** BYOK path end-to-end in a real signed-in browser.',
      '',
      '## 10. Stop conditions',
      '',
      'STOP and report if: ...'
    ].join('\n')

    const result = locateTestPlanSection(body)
    expect(result.found).toBe(true)
    if (result.found) {
      expect(result.section).toContain('[x] **[agent]** Production build trace evidence')
      expect(result.section).toContain('[ ] **[principal]** BYOK path end-to-end')
      expect(result.section).not.toContain('Stop conditions')
      expect(result.section).not.toContain('Documentation-update list')
    }
  })

  it('finds a sub-heading numbered form (### 9a. Test Plan)', () => {
    const body = '## Summary\n\nx\n\n### 9a. Test Plan\n\n- [x] **[agent]** thing\n\n## Scope\n\ny'
    const result = locateTestPlanSection(body)
    expect(result.found).toBe(true)
  })
})

describe('locateTestPlanSection — no section', () => {
  it('reports not found when neither form is present', () => {
    const body = '## Summary\n\nsomething\n\n## Scope\n\nmore, no test plan anywhere'
    expect(locateTestPlanSection(body)).toEqual({ found: false })
  })

  it('reports not found on an empty body', () => {
    expect(locateTestPlanSection('')).toEqual({ found: false })
  })
})
