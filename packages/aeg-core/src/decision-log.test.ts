import { describe, expect, it } from 'vitest'
import { checkDecisionNumbers, hasStatusBlock, malformedDecisionEntries } from './decision-log'

describe('hasStatusBlock', () => {
  it('matches each accepted status value, bold or plain', () => {
    for (const status of ['draft', 'target', 'ratified', 'retired']) {
      expect(hasStatusBlock(`**Status:** ${status}`)).toBe(true)
      expect(hasStatusBlock(`Status: ${status}`)).toBe(true)
    }
  })

  it('rejects content with no Status field', () => {
    expect(hasStatusBlock('# A spec\n\nSome prose.')).toBe(false)
  })
})

describe('malformedDecisionEntries', () => {
  it('flags a D-NNN block missing Status or Type', () => {
    const content = '## D-001 — ok\n**Status:** ACTIVE\n**Type:** 1\n\n## D-002 — missing type\n**Status:** ACTIVE\n'
    expect(malformedDecisionEntries(content)).toEqual(['D-002'])
  })

  it('passes a well-formed block', () => {
    const content = '## D-001 — ok\n**Status:** ACTIVE\n**Type:** 1\n'
    expect(malformedDecisionEntries(content)).toEqual([])
  })

  it('ignores CONTRADICTION headings', () => {
    const content = '## CONTRADICTION — some conflict\nno status here\n'
    expect(malformedDecisionEntries(content)).toEqual([])
  })
})

describe('checkDecisionNumbers', () => {
  const oneThrough5 = `
## D-001 — First decision
## D-002 — Second decision
## D-003 — Third decision
## D-004 — Fourth decision
## D-005 — Fifth decision
`.trim()

  it('pass — sequential numbers, no duplicates, no gaps', () => {
    const { n1Errors, n2Notes, numbers } = checkDecisionNumbers(oneThrough5, 'test.md')
    expect(n1Errors).toHaveLength(0)
    expect(n2Notes).toHaveLength(0)
    expect(numbers).toEqual([1, 2, 3, 4, 5])
  })

  it('N1 fail — duplicate D-NNN within a log', () => {
    const content = '## D-001 — first\n## D-002 — second\n## D-001 — duplicate!'
    const { n1Errors } = checkDecisionNumbers(content, 'decisions.md')
    expect(n1Errors).toHaveLength(1)
    expect(n1Errors[0]).toMatch(/N1 decision-duplicate/)
    expect(n1Errors[0]).toMatch(/D-001/)
    expect(n1Errors[0]).toMatch(/2 times/)
  })

  it('N2 note — skipped number (advisory, not error)', () => {
    const content = '## D-001 — first\n## D-003 — skipped 002'
    const { n1Errors, n2Notes } = checkDecisionNumbers(content, 'decisions.md')
    expect(n1Errors).toHaveLength(0)
    expect(n2Notes).toHaveLength(1)
    expect(n2Notes[0]).toMatch(/N2 decision-skip/)
    expect(n2Notes[0]).toMatch(/D-002/)
  })

  it('empty log → no numbers, no errors', () => {
    const { n1Errors, n2Notes, numbers } = checkDecisionNumbers('# just a comment\n', 'empty.md')
    expect(n1Errors).toHaveLength(0)
    expect(n2Notes).toHaveLength(0)
    expect(numbers).toHaveLength(0)
  })

  it('ignores CONTRADICTION headings', () => {
    const content = '## D-001 — ok\n## CONTRADICTION — some conflict\n## D-002 — also ok'
    const { numbers } = checkDecisionNumbers(content, 'test.md')
    expect(numbers).toEqual([1, 2])
  })
})
