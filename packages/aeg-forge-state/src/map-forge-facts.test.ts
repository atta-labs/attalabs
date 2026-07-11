import { describe, expect, it } from 'vitest'
import { AEG_BLOCKED_LABEL, mapForgeFacts } from './map-forge-facts'
import type { RawTaskFacts } from '@atta/aeg-types'

type IssueOverride = Partial<NonNullable<RawTaskFacts['issue']>> | null
type PullRequestOverride = Partial<NonNullable<RawTaskFacts['pullRequest']>> | null

/**
 * Fixture builder — fills every required `RawTaskFacts` field with a
 * realistic default, letting each test override only the fields it cares
 * about. `issue: null` short-circuits to the "no issue" shape; any other
 * partial merges onto the open/unassigned/unlabeled default.
 */
function rawBase(
  overrides: { issue?: IssueOverride; refExists?: boolean; pullRequest?: PullRequestOverride } = {}
): RawTaskFacts {
  const issue: RawTaskFacts['issue'] =
    overrides.issue === null
      ? null
      : { state: 'OPEN', stateReason: null, closedAt: null, assigneesCount: 0, labels: [], ...overrides.issue }

  const pullRequest: RawTaskFacts['pullRequest'] =
    overrides.pullRequest === null
      ? null
      : overrides.pullRequest === undefined
        ? null
        : {
            number: 1,
            url: 'https://github.com/o/r/pull/1',
            state: 'OPEN',
            reviewDecision: null,
            mergedAt: null,
            ...overrides.pullRequest
          }

  return {
    issue,
    refExists: overrides.refExists ?? false,
    pullRequest
  }
}

describe('mapForgeFacts', () => {
  it('returns null when the issue is missing (caller omits → backlog)', () => {
    expect(mapForgeFacts(rawBase({ issue: null }))).toBeNull()
  })

  describe('issueState', () => {
    it("projects OPEN → 'open'", () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'OPEN', stateReason: null, assigneesCount: 0, labels: [] } })
      )
      expect(facts?.issueState).toBe('open')
    })

    it("projects CLOSED → 'closed'", () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'CLOSED', stateReason: null, assigneesCount: 0, labels: [] } })
      )
      expect(facts?.issueState).toBe('closed')
    })
  })

  describe('assigned', () => {
    it('is false when no assignees', () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'OPEN', stateReason: null, assigneesCount: 0, labels: [] } })
      )
      expect(facts?.assigned).toBe(false)
    })

    it('is true when at least one assignee', () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'OPEN', stateReason: null, assigneesCount: 1, labels: [] } })
      )
      expect(facts?.assigned).toBe(true)
    })
  })

  describe('blockedLabel', () => {
    it('is false when the label is absent', () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'OPEN', stateReason: null, assigneesCount: 0, labels: ['tier:1'] } })
      )
      expect(facts?.blockedLabel).toBe(false)
    })

    it('is true when aeg:blocked is present (Issue-scoped per state-machine §14)', () => {
      const facts = mapForgeFacts(
        rawBase({
          issue: { state: 'OPEN', stateReason: null, assigneesCount: 1, labels: ['tier:1', AEG_BLOCKED_LABEL] }
        })
      )
      expect(facts?.blockedLabel).toBe(true)
    })
  })

  describe('branchExists', () => {
    it('mirrors refExists directly', () => {
      expect(mapForgeFacts(rawBase({ refExists: true }))?.branchExists).toBe(true)
      expect(mapForgeFacts(rawBase({ refExists: false }))?.branchExists).toBe(false)
    })
  })

  describe('prState', () => {
    it("OPEN → 'open'", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'OPEN', reviewDecision: null } }))
      expect(facts?.prState).toBe('open')
    })

    it("MERGED → 'merged'", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'MERGED', reviewDecision: 'APPROVED' } }))
      expect(facts?.prState).toBe('merged')
    })

    it("CLOSED (without merge) → 'none' (AEG only models open/merged/none)", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'CLOSED', reviewDecision: null } }))
      expect(facts?.prState).toBe('none')
    })

    it("absent PR → 'none'", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: null }))
      expect(facts?.prState).toBe('none')
    })
  })

  describe('reviewDecision projection', () => {
    it("APPROVED → 'approved'", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'OPEN', reviewDecision: 'APPROVED' } }))
      expect(facts?.reviewDecision).toBe('approved')
    })

    it("CHANGES_REQUESTED → 'changes_requested' (the only one that flips status)", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'OPEN', reviewDecision: 'CHANGES_REQUESTED' } }))
      expect(facts?.reviewDecision).toBe('changes_requested')
    })

    it("REVIEW_REQUIRED → 'none' (no effective AEG difference)", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'OPEN', reviewDecision: 'REVIEW_REQUIRED' } }))
      expect(facts?.reviewDecision).toBe('none')
    })

    it("null reviewDecision → 'none'", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: { state: 'OPEN', reviewDecision: null } }))
      expect(facts?.reviewDecision).toBe('none')
    })

    it("no PR at all → 'none'", () => {
      const facts = mapForgeFacts(rawBase({ pullRequest: null }))
      expect(facts?.reviewDecision).toBe('none')
    })
  })

  describe('stateReason projection (D-069 — honest terminal derivation)', () => {
    it("COMPLETED → 'completed'", () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'CLOSED', stateReason: 'COMPLETED', assigneesCount: 1, labels: [] } })
      )
      expect(facts?.stateReason).toBe('completed')
    })

    it("NOT_PLANNED → 'not_planned'", () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'CLOSED', stateReason: 'NOT_PLANNED', assigneesCount: 1, labels: [] } })
      )
      expect(facts?.stateReason).toBe('not_planned')
    })

    it('REOPENED → null (no terminal close reason)', () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'OPEN', stateReason: 'REOPENED', assigneesCount: 1, labels: [] } })
      )
      expect(facts?.stateReason).toBeNull()
    })

    it('null → null (open issue / no reason recorded)', () => {
      const facts = mapForgeFacts(
        rawBase({ issue: { state: 'OPEN', stateReason: null, assigneesCount: 0, labels: [] } })
      )
      expect(facts?.stateReason).toBeNull()
    })
  })

  describe('composite fixtures (the kinds of rows Studio will actually render)', () => {
    it('open + unassigned + no branch + no PR → backlog-ish facts', () => {
      const facts = mapForgeFacts(rawBase())
      expect(facts).toEqual({
        issueState: 'open',
        assigned: false,
        blockedLabel: false,
        branchExists: false,
        prState: 'none',
        reviewDecision: 'none',
        stateReason: null,
        closedAt: null,
        mergedAt: null
      })
    })

    it('open + assigned + branch + no PR → in-flight-ish facts', () => {
      const facts = mapForgeFacts(
        rawBase({
          issue: { state: 'OPEN', stateReason: null, assigneesCount: 1, labels: ['tier:3'] },
          refExists: true
        })
      )
      expect(facts).toMatchObject({ assigned: true, branchExists: true, prState: 'none' })
    })

    it('PR merged + branch deleted (default GitHub behaviour) → merged wins', () => {
      const facts = mapForgeFacts(
        rawBase({
          issue: { state: 'CLOSED', stateReason: null, assigneesCount: 1, labels: [] },
          refExists: false,
          pullRequest: { state: 'MERGED', reviewDecision: 'APPROVED' }
        })
      )
      expect(facts?.prState).toBe('merged')
      expect(facts?.branchExists).toBe(false)
    })

    it('aeg:blocked + open PR → blockedLabel set (deriveIteration treats blocked as winner)', () => {
      const facts = mapForgeFacts(
        rawBase({
          issue: { state: 'OPEN', stateReason: null, assigneesCount: 1, labels: [AEG_BLOCKED_LABEL] },
          refExists: true,
          pullRequest: { state: 'OPEN', reviewDecision: 'CHANGES_REQUESTED' }
        })
      )
      expect(facts?.blockedLabel).toBe(true)
      expect(facts?.prState).toBe('open')
      expect(facts?.reviewDecision).toBe('changes_requested')
    })
  })
})
