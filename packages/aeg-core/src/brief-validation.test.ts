import { describe, expect, it } from 'vitest'
import {
  checkAutonomyClause,
  checkBriefSections,
  checkClosesN,
  checkDocUpdateList,
  checkLockAck,
  checkPlanPrNoCloses,
  checkStopConditions,
  checkSurfaceMap,
  checkTestPlan,
  checkTierField,
  checkWorktreeStep0
} from './brief-validation'
import { readTierFromPrBody } from './pr-tier'

const WELL_FORMED = `
## Summary

Ships the brief-validation gate. Closes #252

## Test plan

- [ ] **[agent]** \`bun test\` passes.
- [ ] **[principal]** Reviewed in browser.

## Scope

One paragraph of blast radius.

**Tier:** 3

---

### 4. Technical surface map

- Create \`packages/aeg-core/src/brief-validation.ts\`.

### 5. Pre-flight checks

Step 0 (mandatory, verbatim):
\`\`\`
git worktree add .worktrees/task/aeg-governance-hardening/2 -b task/aeg-governance-hardening/2 origin/main
\`\`\`

### 7. Documentation-update list

- \`aeg-root/state-machine.md\` §12.

### 10. Stop conditions

- Pre-flight failure.

### 11. Constraints

**Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not
covered by a Section 10 stop condition, choose the most reasonable option.
`

describe('checkTierField', () => {
  it('passes when a Tier field is present', () => {
    expect(checkTierField(WELL_FORMED, readTierFromPrBody).status).toBe('pass')
  })
  it('fails when no Tier field is present', () => {
    const r = checkTierField('no tier here', readTierFromPrBody)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/tier/i)
  })
})

describe('checkTestPlan', () => {
  it('passes on unit-tests-only sentinel', () => {
    expect(checkTestPlan('Test Plan: unit-tests-only').status).toBe('pass')
  })
  it('passes on at least one tagged item', () => {
    expect(checkTestPlan('- [ ] **[agent]** run the tests').status).toBe('pass')
  })
  it('fails when the Test Plan section is missing entirely', () => {
    const r = checkTestPlan('## Summary\n\nno test plan section here')
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/Test Plan/)
  })
  it('does not require unit-tests-only to be justified by the surface map (presence-only)', () => {
    // Per the Planner's trap: a Test Plan: unit-tests-only sentinel passes even
    // when §4 lists an API route — that mismatch is a Reviewer judgment call,
    // not something checkTestPlan catches.
    const body = 'Test Plan: unit-tests-only\n\n### 4. Technical surface map\n- apps/x/api/route.ts'
    expect(checkTestPlan(body).status).toBe('pass')
  })
})

describe('checkSurfaceMap', () => {
  it('passes when well-formed', () => {
    expect(checkSurfaceMap(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkSurfaceMap('no such section').status).toBe('fail')
  })
})

describe('checkDocUpdateList', () => {
  it('passes when well-formed', () => {
    expect(checkDocUpdateList(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkDocUpdateList('no such section').status).toBe('fail')
  })
})

describe('checkWorktreeStep0', () => {
  it('passes when a git worktree add command is present', () => {
    expect(checkWorktreeStep0(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkWorktreeStep0('no worktree command here').status).toBe('fail')
  })
})

describe('checkStopConditions', () => {
  it('passes when well-formed', () => {
    expect(checkStopConditions(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkStopConditions('no such section').status).toBe('fail')
  })
})

describe('checkAutonomyClause', () => {
  it('passes on the standing clause, bold-labeled', () => {
    expect(checkAutonomyClause(WELL_FORMED).status).toBe('pass')
  })
  it('tolerates whitespace/emphasis variance', () => {
    const body = 'Autonomy:   do NOT stop   to ask clarifying   questions.'
    expect(checkAutonomyClause(body).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkAutonomyClause('no autonomy clause here').status).toBe('fail')
  })
})

describe('checkClosesN', () => {
  it('passes when Closes #N is present', () => {
    expect(checkClosesN(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkClosesN('no closes reference').status).toBe('fail')
  })
})

describe('checkLockAck', () => {
  it('passes trivially when the diff does not touch a lock', () => {
    expect(checkLockAck('no lock-ack anywhere', false).status).toBe('pass')
  })
  it('fails when a lock is touched but no ack is present', () => {
    const r = checkLockAck('no lock-ack anywhere', true)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/lock-ack/)
  })
  it('passes on a well-formed Conforms to lock line', () => {
    const body = '**Conforms to lock:** D-069 — implements the role-seam contract gates.'
    expect(checkLockAck(body, true).status).toBe('pass')
  })
  it('passes on a well-formed Challenges lock line with Rationale', () => {
    const body = '**Challenges lock:** D-069 — needs revision.\n\n**Rationale:** the lock is stale.'
    expect(checkLockAck(body, true).status).toBe('pass')
  })
  it('fails on a Challenges lock line with no Rationale', () => {
    const body = '**Challenges lock:** D-069 — needs revision.'
    expect(checkLockAck(body, true).status).toBe('fail')
  })
})

describe('checkBriefSections', () => {
  it('passes every section on a well-formed brief with no lock touched', () => {
    const { errors } = checkBriefSections(WELL_FORMED, false, readTierFromPrBody)
    expect(errors).toEqual([])
  })

  it('fails only the missing section when one is stripped out', () => {
    const withoutTestPlan = WELL_FORMED.replace(
      /## Test plan[\s\S]*?(?=## Scope)/,
      '## Test plan removed for this test\n\n'
    )
    const { errors } = checkBriefSections(withoutTestPlan, false, readTierFromPrBody)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/Test Plan/)
  })

  it('fails lock-ack when the PR touches a lock with no ack, on top of an otherwise well-formed body', () => {
    const { errors } = checkBriefSections(WELL_FORMED, true, readTierFromPrBody)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/lock-ack/)
  })

  it('passes lock-ack alongside everything else when a Conforms to lock line is added', () => {
    const withLockAck = `${WELL_FORMED}\n\n**Conforms to lock:** D-069 — implements the charter.`
    const { errors } = checkBriefSections(withLockAck, true, readTierFromPrBody)
    expect(errors).toEqual([])
  })
})

describe('checkPlanPrNoCloses', () => {
  it('fails a plan/* branch whose body carries Closes #N', () => {
    const result = checkPlanPrNoCloses('plan/aeg-consolidation', 'This plan adds tasks. Closes #123')
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toMatch(/plan-PR guard/)
  })

  it('passes a plan/* branch whose body has no Closes reference', () => {
    const result = checkPlanPrNoCloses('plan/aeg-consolidation', 'This plan adds tasks 1-5 to the topology.')
    expect(result.status).toBe('pass')
    expect(result.errors).toEqual([])
  })

  it('passes a task/* branch with Closes #N — unaffected by the guard', () => {
    const result = checkPlanPrNoCloses('task/aeg-governance-hardening/5d', 'Ships the thing. Closes #309')
    expect(result.status).toBe('pass')
    expect(result.errors).toEqual([])
  })

  it('passes a non-plan, non-task branch regardless of body', () => {
    const result = checkPlanPrNoCloses('fix/something', 'Fixes a bug. Closes #1')
    expect(result.status).toBe('pass')
  })

  it('is case-insensitive on the Closes keyword', () => {
    const result = checkPlanPrNoCloses('plan/x', 'this CLOSES #42 is bad')
    expect(result.status).toBe('fail')
  })
})
