import type { ForgeFacts } from '@atta/aeg-types'
import { describe, expect, it } from 'vitest'
import {
  DERIVABLE_STATUSES,
  DERIVATION_RULES,
  DERIVED_STATUSES,
  deriveStatusFromModel,
  FORGE_FACT_INPUTS
} from './state-machine-model'
import type { DerivedStatus } from './types'

function facts(overrides: Partial<ForgeFacts> = {}): ForgeFacts {
  return {
    issueState: 'open',
    assigned: false,
    branchExists: false,
    prState: 'none',
    reviewDecision: 'none',
    blockedLabel: false,
    stateReason: null,
    closedAt: null,
    mergedAt: null,
    ...overrides
  }
}

describe('FORGE_FACT_INPUTS — the model names every input it reads', () => {
  it('covers every ForgeFacts field exactly once', () => {
    // The literal key list is the point: a new ForgeFacts field must be
    // described here too, and this test is what forces that.
    const expected: Array<keyof ForgeFacts> = [
      'issueState',
      'assigned',
      'branchExists',
      'prState',
      'reviewDecision',
      'blockedLabel',
      'stateReason',
      'closedAt',
      'mergedAt'
    ]
    const described = FORGE_FACT_INPUTS.map((i) => i.fact)
    expect(described.slice().sort()).toEqual(expected.slice().sort())
    expect(new Set(described).size).toBe(described.length)
  })

  it('every input names the GitHub object it is read from, and what it means', () => {
    for (const i of FORGE_FACT_INPUTS) {
      expect(i.readsFrom.length).toBeGreaterThan(0)
      expect(i.meaning.length).toBeGreaterThan(0)
    }
  })

  it('a fact keyed here is real — the type would reject a typo', () => {
    const sample = facts()
    for (const i of FORGE_FACT_INPUTS) {
      expect(Object.hasOwn(sample, i.fact)).toBe(true)
    }
  })
})

describe('DERIVED_STATUSES', () => {
  it('is the full 9-value set', () => {
    expect(DERIVED_STATUSES).toHaveLength(9)
    expect(new Set(DERIVED_STATUSES).size).toBe(9)
  })

  it('keeps backlog in the set but out of the derivable subset (D-059)', () => {
    expect(DERIVED_STATUSES).toContain('backlog')
    expect(DERIVABLE_STATUSES).not.toContain('backlog')
    expect(DERIVABLE_STATUSES).toHaveLength(8)
  })
})

describe('DERIVATION_RULES — shape', () => {
  it('every id is unique', () => {
    const ids = DERIVATION_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every rule concludes a real DerivedStatus', () => {
    for (const r of DERIVATION_RULES) {
      expect(DERIVED_STATUSES).toContain(r.status)
    }
  })

  it('no rule concludes backlog — it is never emitted by derivation (D-059)', () => {
    expect(DERIVATION_RULES.some((r) => r.status === 'backlog')).toBe(false)
  })

  it('every rule carries its prose and its ordering rationale', () => {
    for (const r of DERIVATION_RULES) {
      expect(r.when.length).toBeGreaterThan(0)
      expect(r.why.length).toBeGreaterThan(0)
    }
  })

  it('is total — the last rule matches unconditionally, so evaluation always concludes', () => {
    const last = DERIVATION_RULES[DERIVATION_RULES.length - 1]
    expect(last?.matches(facts())).toBe(true)
    expect(last?.matches(facts({ issueState: 'closed', stateReason: 'completed' }))).toBe(true)
  })
})

describe('DERIVATION_RULES — order is load-bearing', () => {
  it('chain steps run 1..8 and never go backwards', () => {
    const steps = DERIVATION_RULES.map((r) => r.chainStep)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(steps[0]).toBe(1)
    expect(steps[steps.length - 1]).toBe(8)
    expect(new Set(steps).size).toBe(8)
  })

  it('matches the canonical chain, rule for rule', () => {
    expect(DERIVATION_RULES.map((r) => [r.chainStep, r.id, r.status])).toEqual([
      [1, 'no-facts', 'todo'],
      [2, 'blocked-label', 'blocked'],
      [3, 'reopened-after-merge-with-branch', 'in-flight'],
      [3, 'reopened-after-merge-no-branch', 'todo'],
      [4, 'pr-merged', 'merged'],
      [5, 'pr-open-changes-requested', 'changes-requested'],
      [5, 'pr-open', 'in-review'],
      [6, 'branch-exists', 'in-flight'],
      [7, 'issue-open', 'todo'],
      [8, 'closed-not-planned', 'dropped'],
      [8, 'closed-without-merge', 'incoherent']
    ])
  })

  it('both reopened-after-merge rules precede the plain merged rule', () => {
    const idx = (id: string) => DERIVATION_RULES.findIndex((r) => r.id === id)
    expect(idx('reopened-after-merge-with-branch')).toBeLessThan(idx('pr-merged'))
    expect(idx('reopened-after-merge-no-branch')).toBeLessThan(idx('pr-merged'))
  })

  it('blocked precedes every rule except the no-facts guard', () => {
    expect(DERIVATION_RULES.findIndex((r) => r.id === 'blocked-label')).toBe(1)
  })

  it('changes-requested precedes the plain open-PR rule', () => {
    const idx = (id: string) => DERIVATION_RULES.findIndex((r) => r.id === id)
    expect(idx('pr-open-changes-requested')).toBeLessThan(idx('pr-open'))
  })
})

describe('DERIVATION_RULES — reachability', () => {
  // One fact set per derivable status, chosen to land on that rule.
  const reaching: Array<[DerivedStatus, ForgeFacts | undefined]> = [
    ['todo', undefined],
    ['blocked', facts({ blockedLabel: true, branchExists: true, prState: 'open' })],
    ['in-flight', facts({ branchExists: true })],
    ['in-review', facts({ prState: 'open' })],
    ['changes-requested', facts({ prState: 'open', reviewDecision: 'changes_requested' })],
    ['merged', facts({ issueState: 'closed', prState: 'merged' })],
    ['dropped', facts({ issueState: 'closed', stateReason: 'not_planned' })],
    ['incoherent', facts({ issueState: 'closed', stateReason: 'completed' })]
  ]

  it('every derivable status is reachable by some rule', () => {
    const reached = new Set(reaching.map(([, f]) => deriveStatusFromModel(f)))
    for (const status of DERIVABLE_STATUSES) {
      expect(reached.has(status), `status '${status}' is unreachable`).toBe(true)
    }
  })

  for (const [status, f] of reaching) {
    it(`derives ${status}`, () => {
      expect(deriveStatusFromModel(f)).toBe(status)
    })
  }

  it('every rule is individually reachable — no rule is shadowed by an earlier one', () => {
    // A rule shadowed by its predecessors is dead code that would silently
    // never fire; enumerate the fact space and assert each rule wins at least
    // once. Timestamps are excluded — no rule reads them.
    const booleans = [true, false]
    const winners = new Set<string>()
    for (const issueState of ['open', 'closed'] as const)
      for (const branchExists of booleans)
        for (const prState of ['none', 'open', 'merged'] as const)
          for (const reviewDecision of ['none', 'changes_requested', 'approved'] as const)
            for (const blockedLabel of booleans)
              for (const stateReason of ['completed', 'not_planned', null] as const) {
                const f = facts({ issueState, branchExists, prState, reviewDecision, blockedLabel, stateReason })
                const winner = DERIVATION_RULES.find((r) => r.matches(f))
                if (winner) winners.add(winner.id)
              }
    winners.add('no-facts') // only reachable via undefined facts, outside the grid
    expect(winners.size).toBe(DERIVATION_RULES.length)
  })
})

describe('deriveStatusFromModel — equivalence with the pre-refactor if-chain', () => {
  // The literal chain as it stood before the model existed. Behavior-identity
  // is the whole bar of this refactor, so it is asserted directly against an
  // exhaustive fact grid rather than trusted to the fixture suite alone.
  function legacyDeriveStatus(f: ForgeFacts | undefined): DerivedStatus {
    if (!f) return 'todo'
    if (f.blockedLabel) return 'blocked'
    if (f.issueState === 'open' && f.prState === 'merged') {
      return f.branchExists ? 'in-flight' : 'todo'
    }
    if (f.prState === 'merged') return 'merged'
    if (f.prState === 'open') {
      return f.reviewDecision === 'changes_requested' ? 'changes-requested' : 'in-review'
    }
    if (f.branchExists) return 'in-flight'
    if (f.issueState === 'open') return 'todo'
    return f.stateReason === 'not_planned' ? 'dropped' : 'incoherent'
  }

  it('agrees on undefined facts', () => {
    expect(deriveStatusFromModel(undefined)).toBe(legacyDeriveStatus(undefined))
  })

  it('agrees on every combination of the facts derivation reads (432 cases)', () => {
    const booleans = [true, false]
    let cases = 0
    for (const issueState of ['open', 'closed'] as const)
      for (const assigned of booleans)
        for (const branchExists of booleans)
          for (const prState of ['none', 'open', 'merged'] as const)
            for (const reviewDecision of ['none', 'changes_requested', 'approved'] as const)
              for (const blockedLabel of booleans)
                for (const stateReason of ['completed', 'not_planned', null] as const) {
                  const f = facts({
                    issueState,
                    assigned,
                    branchExists,
                    prState,
                    reviewDecision,
                    blockedLabel,
                    stateReason
                  })
                  cases++
                  expect(deriveStatusFromModel(f), JSON.stringify(f)).toBe(legacyDeriveStatus(f))
                }
    expect(cases).toBe(2 * 2 * 2 * 3 * 3 * 2 * 3)
  })
})
