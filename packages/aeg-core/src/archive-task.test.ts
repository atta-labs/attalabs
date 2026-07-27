import { describe, expect, it } from 'vitest'
import {
  buildProvenanceBlock,
  extractIssue,
  hasProvenance,
  isEligibleForProvenance,
  taskRefFromBranch
} from './archive-task'
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

// Canonical PR-body form: metadata fields in the header block, before the
// first h2 heading — where both the brief-validation gate and this module's
// extraction read them (headerRegion parity).
const FULL_BODY = `
**Tier:** 3
Closes #309
Project: aeg, aeg-core
For: a high-capability model (coding-agent CLI, dispatched session)
Ticket: none

## Summary

Ships the thing.

## Scope

One paragraph of blast radius.
`

describe('taskRefFromBranch', () => {
  it('parses a well-formed task branch', () => {
    expect(taskRefFromBranch('task/aeg-governance-hardening/5d')).toEqual({
      tranche: 'aeg-governance-hardening',
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

// #524/#530 regression: a task PR can close a tranche-labeled Issue from a
// non-task branch. `extractIssue` is the bin shim's second eligibility signal
// (alongside `taskRefFromBranch`) — it must find the closing Issue number so
// the shim can check that Issue's own `vinaya/tranche:*` label.
describe('extractIssue', () => {
  it('finds Closes #N on a non-task-branch PR body (the #530 shape)', () => {
    const body = '<!-- AEG:CLOSES:START -->\nCloses #524\n<!-- AEG:CLOSES:END -->\n\n## Summary\n\nCleanup fix.'
    expect(extractIssue(body)).toEqual({ issue: 524, extraIssues: [], outsideHeader: false })
  })

  it('returns null when no Closes #N is present', () => {
    expect(extractIssue('## Summary\n\nNo closing reference here.')).toEqual({
      issue: null,
      extraIssues: [],
      outsideHeader: false
    })
  })
})

// #524/#530 regression, the actual shipped decision (not just its inputs):
// a task-branch `ref` is sufficient on its own; a non-task branch needs the
// closed Issue's own labels to carry `vinaya/tranche:*`.
describe('isEligibleForProvenance', () => {
  const ref = { tranche: 'aeg-governance-hardening', taskId: '5d' }

  it('is eligible when ref is a real task branch, regardless of labels', () => {
    expect(isEligibleForProvenance(ref, [])).toBe(true)
    expect(isEligibleForProvenance(ref, ['unrelated'])).toBe(true)
  })

  it('is eligible when ref is null but the Issue carries a vinaya/tranche:* label (the #524/#530 shape)', () => {
    expect(isEligibleForProvenance(null, ['vinaya/tranche:herald-hardening-v1'])).toBe(true)
  })

  it('is NOT eligible when ref is null and no label starts with vinaya/tranche:', () => {
    expect(isEligibleForProvenance(null, ['bug', 'vinaya/needs:principal-input'])).toBe(false)
  })

  it('is NOT eligible when ref is null and there are no labels at all', () => {
    expect(isEligibleForProvenance(null, [])).toBe(false)
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
    expect(hasProvenance(['### AEG provenance — task 1 (tranche x)', 'unrelated'])).toBe(true)
  })

  it('is true when a later comment carries the heading', () => {
    expect(hasProvenance(['unrelated', 'also unrelated', '### AEG provenance — task 1 (tranche x)'])).toBe(true)
  })
})

describe('buildProvenanceBlock', () => {
  it('assembles the full happy path with the exact heading format', () => {
    const { block, issue, dangling } = buildProvenanceBlock(facts({ body: FULL_BODY }))
    expect(block.split('\n')[0]).toBe('### AEG provenance — task 5d (tranche aeg-governance-hardening)')
    expect(issue).toBe(309)
    expect(dangling).toEqual([
      'no code-reviewer verdict comment found on this PR',
      'no security-review verdict comment found on this PR'
    ])
    expect(block).toContain('- Issue:        #309  (closed by merge)')
    expect(block).toContain('- Tier:         3')
    expect(block).toContain('- Project(s):   aeg, aeg-core')
    expect(block).toContain('- Model/agent:  a high-capability model (coding-agent CLI, dispatched session)')
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

  it('ignores a Closes # reference inside a code fence or inline code (#311 regression)', () => {
    const body = `${FULL_BODY}\n\n## Test plan evidence\n\n\`\`\`\nBRANCH=plan/x PR_BODY="... Closes #123 ..." bun verify-brief.ts\n\`\`\`\n\nAnd inline: \`Closes #456\` as an example.`
    const { issue, dangling } = buildProvenanceBlock(facts({ body }))
    expect(issue).toBe(309)
    expect(dangling.some((d) => d.includes('additional Issues'))).toBe(false)
  })

  it('still resolves a Closes #N placed outside the header block, with a flag (defensive fallback)', () => {
    const body = '**Tier:** 3\nProject: aeg\nFor: Sonnet\n\n## Summary\n\nShips it. Closes #309'
    const { issue, dangling } = buildProvenanceBlock(facts({ body }))
    expect(issue).toBe(309)
    expect(dangling.some((d) => d.includes('outside the PR body'))).toBe(true)
  })

  it('does not extract a field value from prose that merely mentions the field name (#311 regression)', () => {
    const body = `${FULL_BODY.replace('Ticket: none\n', '')}\n\n## Decisions made\n\n- **\`Ticket:\` field.** Extracted via the same tolerant field-pattern as Project/For; absent means none.`
    const { block } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Ticket:       none')
    expect(block).not.toContain('Extracted via')
  })

  it('flags a Project field that only appears after a heading as DANGLING (#311 regression)', () => {
    const body = `${FULL_BODY.replace('Project: aeg, aeg-core\n', '')}\n\n## Notes\n\nThe Project: aeg field lives here, wrongly.`
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Project(s):   DANGLING — no Project field in PR body')
    expect(dangling).toContain('no `Project:` field found in PR body — Project(s) field is DANGLING')
  })

  it('flags a missing Tier field as DANGLING', () => {
    const body = FULL_BODY.replace('**Tier:** 3', '')
    const { block, dangling } = buildProvenanceBlock(facts({ body }))
    expect(block).toContain('- Tier:         DANGLING — no Tier field in PR body')
    expect(dangling).toContain('no `Tier:` field found in PR body — Tier field is DANGLING')
  })

  it('captures a code-review APPROVE verdict comment when present', () => {
    const comments = ['VERDICT: APPROVE\n\nBRIEF CONFORMANCE: clean. Looks good.']
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
    const comments = ['VERDICT: PASS\n\nFINDINGS: none.']
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
