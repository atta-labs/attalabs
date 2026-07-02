import { describe, expect, it } from 'vitest'
import { buildProvenanceBlock, hasProvenance, taskRefFromBranch } from './archive-task'
import type { MergedPrFacts } from './archive-task'

function facts(overrides: Partial<MergedPrFacts> = {}): MergedPrFacts {
  return {
    number: 42,
    headRefName: 'task/aeg-governance-hardening/5d',
    body: '',
    mergedAt: '2026-07-02T12:00:00Z',
    mergeSha: 'abc123def456',
    comments: [],
    ...overrides
  }
}

const FULL_BODY = `
## Summary

Ships the thing. Closes #309

## Scope

**Tier:** 3

Project: aeg, aeg-core
For: a high-capability model (coding-agent CLI, dispatched session)
Conforms-to: D-077
Ticket: none
`

describe('taskRefFromBranch', () => {
  it('parses a well-formed task branch', () => {
    expect(taskRefFromBranch('task/aeg-governance-hardening/5d')).toEqual({
      iteration: 'aeg-governance-hardening',
      taskId: '5d'
    })
  })

  it('returns null for a plan branch', () => {
    expect(taskRefFromBranch('plan/aeg-consolidation')).toBeNull()
  })

  it('returns null for a fix branch', () => {
    expect(taskRefFromBranch('fix/animate-button-aschild')).toBeNull()
  })

  it('returns null for main', () => {
    expect(taskRefFromBranch('main')).toBeNull()
  })

  it('returns null for a malformed task branch (missing taskId)', () => {
    expect(taskRefFromBranch('task/aeg-governance-hardening')).toBeNull()
  })

  it('returns null for a malformed task branch (extra segment)', () => {
    expect(taskRefFromBranch('task/aeg-governance-hardening/5d/extra')).toBeNull()
  })
})

describe('hasProvenance', () => {
  it('is false for no comments', () => {
    expect(hasProvenance([])).toBe(false)
  })

  it('is false when no comment carries the heading', () => {
    expect(hasProvenance(['LGTM', 'ship it'])).toBe(false)
  })

  it('is true when the first comment carries the heading', () => {
    expect(hasProvenance(['### AEG provenance — task 1 (iteration x)', 'unrelated'])).toBe(true)
  })

  it('is true when a later comment carries the heading', () => {
    expect(hasProvenance(['unrelated', 'also unrelated', '### AEG provenance — task 1 (iteration x)'])).toBe(true)
  })
})

describe('buildProvenanceBlock', () => {
  it('assembles the full happy path with the exact heading format', () => {
    const { block, issue, dangling } = buildProvenanceBlock(facts({ body: FULL_BODY }))
    expect(block.split('\n')[0]).toBe('### AEG provenance — task 5d (iteration aeg-governance-hardening)')
    expect(issue).toBe(309)
    expect(dangling).toEqual([
      'no code-reviewer verdict comment found on this PR',
      'no security-review verdict comment found on this PR'
    ])
    expect(block).toContain('- Issue:        #309  (closed by merge)')
    expect(block).toContain('- Tier:         3')
    expect(block).toContain('- Project(s):   aeg, aeg-core')
    expect(block).toContain('- Model/agent:  a high-capability model (coding-agent CLI, dispatched session)')
    expect(block).toContain('- Decision:     D-077 (conforms to existing decision)')
    expect(block).toContain('- Ticket:       none')
    expect(block).toContain('- Merged:       abc123def456 at 2026-07-02T12:00:00Z')
  })

  it('flags a missing For: field as DANGLING, does not fabricate a value', () => {
    const body = FULL_BODY.replace('For: a high-capability model (coding-agent CLI, dispatched session)\n', '')
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Model/agent:  DANGLING — no For field in PR body')
    expect(dangling).toContain('no `For:` field found in PR body — Model/agent field is DANGLING')
  })

  it('flags a missing Closes #N as issue: null + DANGLING', () => {
    const body = FULL_BODY.replace('Closes #309', '')
    const { issue, block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(issue).toBeNull()
    expect(block).toContain('- Issue:        DANGLING — no Closes #N in PR body')
    expect(dangling).toContain('no `Closes #N` found in PR body — Issue field is DANGLING, no Issue will be closed')
  })

  it('closes only the first of multiple distinct Closes # references, flags the rest', () => {
    const body = `${FULL_BODY}\n\nAlso relates to and Closes #400 as a side effect.`
    const { issue, dangling } = buildProvenanceBlock(facts({ body }))
    expect(issue).toBe(309)
    expect(dangling).toContain(
      'PR body references additional Issues (#400) beyond the first — closing only #309, the rest are flagged, not closed'
    )
  })

  it('does not double-count a repeated identical Closes # reference', () => {
    const body = `${FULL_BODY}\n\nCloses #309 (again, same issue).`
    const { issue, dangling } = buildProvenanceBlock(facts({ body }))
    expect(issue).toBe(309)
    expect(dangling.some((d) => d.includes('additional Issues'))).toBe(false)
  })

  it('flags a missing Tier field as DANGLING', () => {
    const body = FULL_BODY.replace('**Tier:** 3', '')
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Tier:         DANGLING — no Tier field in PR body')
    expect(dangling).toContain('no `Tier:` field found in PR body — Tier field is DANGLING')
  })

  it('flags a Tier 3 PR with no Conforms-to field as DANGLING for Decision', () => {
    const body = FULL_BODY.replace('Conforms-to: D-077\n', '')
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain(
      '- Decision:     DANGLING — Tier 3 but no `Conforms-to:` field found and no new decision entry detectable from the PR body'
    )
    expect(dangling).toContain(
      'Tier 3 PR carries no `Conforms-to: D-###` field — verify a new decision entry was added and reference it manually'
    )
  })

  it('records Decision: none for a Tier 0/1 PR with no Conforms-to field', () => {
    const body = FULL_BODY.replace('**Tier:** 3', '**Tier:** 1').replace('Conforms-to: D-077\n', '')
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Decision:     none')
    expect(dangling.some((d) => d.includes('Conforms-to'))).toBe(false)
  })

  it('captures a code-review APPROVE verdict comment when present', () => {
    const comments = ['Reviewed the diff. verdict: APPROVE. Looks clean.']
    const { block, dangling } = buildProvenanceBlock(facts({ body: FULL_BODY, comments }))
    expect(block).toContain('- Code review:  APPROVE')
    expect(dangling.some((d) => d.includes('code-reviewer'))).toBe(false)
  })

  it('flags a missing code-review verdict comment as DANGLING', () => {
    const { block, dangling } = buildProvenanceBlock(facts({ body: FULL_BODY }))
    expect(block).toContain('- Code review:  no code-reviewer pass was run before merge — DANGLING, see below')
    expect(dangling).toContain('no code-reviewer verdict comment found on this PR')
  })

  it('captures a security PASS verdict comment when present', () => {
    const comments = ['security review: PASS, no findings.']
    const { block, dangling } = buildProvenanceBlock(facts({ body: FULL_BODY, comments }))
    expect(block).toContain('- Security:     PASS')
    expect(dangling.some((d) => d.includes('security-review'))).toBe(false)
  })

  it('flags a missing security verdict comment as DANGLING', () => {
    const { block, dangling } = buildProvenanceBlock(facts({ body: FULL_BODY }))
    expect(block).toContain('- Security:     no security-review pass was run before merge — DANGLING, see below')
    expect(dangling).toContain('no security-review verdict comment found on this PR')
  })

  it('labels the task from the branch when headRefName does not match task/<iter>/<n>', () => {
    const { block } = buildProvenanceBlock(facts({ body: FULL_BODY, headRefName: 'fix/some-branch' }))
    expect(block.split('\n')[0]).toBe('### AEG provenance — task (branch fix/some-branch)')
  })

  it('flags a missing Project field as DANGLING', () => {
    const body = FULL_BODY.replace('Project: aeg, aeg-core\n', '')
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Project(s):   DANGLING — no Project field in PR body')
    expect(dangling).toContain('no `Project:` field found in PR body — Project(s) field is DANGLING')
  })
})
