import { describe, expect, it } from 'vitest'
import { checkIssueRationale, isTaskIssueLabelSet } from './issue-validation'

// Bold-inline style, as on Issue #309.
const BOLD_STYLE = `
**Iteration:** aeg-governance-hardening · **Task:** 5d · **Project(s):** aeg

## Planner's rationale

**Boundary** — What this task is and is not.

**Sizing** — Passes all four tests.

**Project(s) + blast radius** — aeg, aeg-core.

**Dependency rationale** — No depends-on.

**Traps to avoid** — Do not do X.

**Suggested agent-class** — high.

**Stop-and-escalate** — If Y happens, stop.

**Docs to keep coherent** — state-machine.md §12.
`

// Heading style, as on Issue #219.
const HEADING_STYLE = `
### Boundary

The flow derives the list.

### Sizing

Small-medium.

### Project(s) + blast radius

aeg only.

### Dependency rationale

Depends on task 3.

### Traps

- The helper is an aid, not an enforcer.

### Stop-and-escalate

- Derivation needs undeclared intent.

### Suggested agent-class

Medium.

### Docs to keep coherent

planner.md.
`

describe('checkIssueRationale', () => {
  it('passes the bold-inline rationale style (#309 shape)', () => {
    expect(checkIssueRationale(BOLD_STYLE).status).toBe('pass')
  })

  it('passes the heading rationale style (#219 shape)', () => {
    expect(checkIssueRationale(HEADING_STYLE).status).toBe('pass')
  })

  it('fails an empty body with one error per missing field', () => {
    const r = checkIssueRationale('Just a title-ish body with no rationale.')
    expect(r.status).toBe('fail')
    expect(r.errors).toHaveLength(8)
  })

  it('fails only the missing field when one is dropped', () => {
    const body = BOLD_STYLE.replace('**Traps to avoid** — Do not do X.\n', '')
    const r = checkIssueRationale(body)
    expect(r.status).toBe('fail')
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toMatch(/Traps/)
  })

  it('does not accept a field name mentioned in plain prose (needs bold or heading form)', () => {
    const body = 'The boundary of this task is unclear and the sizing was never done.'
    expect(checkIssueRationale(body).status).toBe('fail')
  })
})

describe('isTaskIssueLabelSet', () => {
  it('is true when an iteration label is present', () => {
    expect(isTaskIssueLabelSet(['iteration:aeg-governance-hardening', 'tier:3'])).toBe(true)
  })
  it('is false for non-iteration labels', () => {
    expect(isTaskIssueLabelSet(['bug', 'help wanted'])).toBe(false)
  })
  it('is false for no labels', () => {
    expect(isTaskIssueLabelSet([])).toBe(false)
  })
})
