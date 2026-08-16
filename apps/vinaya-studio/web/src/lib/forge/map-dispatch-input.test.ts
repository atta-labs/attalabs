import { checkDispatchReadiness, type ForgeFacts, type Task } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { buildDispatchGateInput, type DispatchInputSources } from './map-dispatch-input'

/**
 * Fixture coverage for the facts → `DispatchGateInput` assembly (#372 bundled
 * finding). The readiness VERDICT is `checkDispatchReadiness`'s (aeg-core,
 * already tested there); these tests pin the mapping — each resolver must
 * mirror `bin/verify-dispatch.ts`'s CLI counterpart.
 */

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: `Task ${overrides.id}`,
    issue: null,
    projects: ['aeg'],
    dependsOn: [],
    conflictsWith: [],
    rationaleMarkdown: '',
    ...overrides
  }
}

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

function sources(overrides: Partial<DispatchInputSources> & { task: Task }): DispatchInputSources {
  return {
    trancheSlug: 'iter',
    facts: new Map(),
    taskById: new Map([[overrides.task.id, overrides.task]]),
    rationaleBodyByIssue: new Map(),
    provenanceByIssue: new Map(),
    crossIssueClosed: new Map(),
    priorTask: null,
    priorTrancheArchival: [],
    ...overrides
  }
}

describe('issue fact', () => {
  it('maps a fetched issue to { number, state }', () => {
    const t = task({ id: '2', issue: 10 })
    const input = buildDispatchGateInput(sources({ task: t, facts: new Map([['2', facts({ issueState: 'open' })]]) }))
    expect(input.issue).toEqual({ number: 10, state: 'open' })
  })

  it('is null (phantom) when the row names an Issue but no forge fact resolved', () => {
    const t = task({ id: '2', issue: 10 })
    const input = buildDispatchGateInput(sources({ task: t }))
    expect(input.issue).toBeNull()
  })

  it('is null when the row has no Issue at all', () => {
    const t = task({ id: '2' })
    const input = buildDispatchGateInput(sources({ task: t }))
    expect(input.issue).toBeNull()
  })
})

describe('rationale', () => {
  it('passes when the Issue body was not fetched (CLI parity: null gh view passes)', () => {
    const input = buildDispatchGateInput(sources({ task: task({ id: '2', issue: 10 }) }))
    expect(input.issueRationalePass).toBe(true)
  })

  it('fails via checkIssueRationale when the fetched body lacks the rationale fields', () => {
    const input = buildDispatchGateInput(
      sources({
        task: task({ id: '2', issue: 10 }),
        rationaleBodyByIssue: new Map([[10, 'no rationale here']])
      })
    )
    expect(input.issueRationalePass).toBe(false)
  })
})

describe('depends-on resolution', () => {
  function depSources(depFacts: ForgeFacts | null): DispatchInputSources {
    const dep = task({ id: '1', issue: 5 })
    const t = task({ id: '2', issue: 10, dependsOn: ['1'] })
    return sources({
      task: t,
      taskById: new Map([
        ['1', dep],
        ['2', t]
      ]),
      facts: depFacts ? new Map([['1', depFacts]]) : new Map()
    })
  }

  it('merged when the same-tranche dep has a merged PR', () => {
    expect(buildDispatchGateInput(depSources(facts({ prState: 'merged' }))).dependsOn).toEqual([
      { id: '1', issue: 5, merged: true }
    ])
  })

  it('unmerged when the dep PR is still open', () => {
    expect(buildDispatchGateInput(depSources(facts({ prState: 'open' }))).dependsOn).toEqual([
      { id: '1', issue: 5, merged: false }
    ])
  })

  it('falls back to issue-closed when no PR is known (CLI fallback)', () => {
    expect(buildDispatchGateInput(depSources(facts({ prState: 'none', issueState: 'closed' }))).dependsOn).toEqual([
      { id: '1', issue: 5, merged: true }
    ])
    expect(buildDispatchGateInput(depSources(facts({ prState: 'none', issueState: 'open' }))).dependsOn).toEqual([
      { id: '1', issue: 5, merged: false }
    ])
  })

  it('unmerged when the dep has no forge facts at all', () => {
    expect(buildDispatchGateInput(depSources(null)).dependsOn).toEqual([{ id: '1', issue: 5, merged: false }])
  })

  it('resolves cross-tranche #NNN edges from the pre-fetched issue state', () => {
    const t = task({ id: '2', issue: 10, dependsOn: ['other-iter #77', '#88'] })
    const input = buildDispatchGateInput(sources({ task: t, crossIssueClosed: new Map([[77, true]]) }))
    expect(input.dependsOn).toEqual([
      { id: 'other-iter #77', issue: 77, merged: true },
      { id: '#88', issue: 88, merged: false }
    ])
  })

  it('defaults an unresolvable edge to unmerged (conservative, CLI parity)', () => {
    const t = task({ id: '2', issue: 10, dependsOn: ['mystery-edge'] })
    expect(buildDispatchGateInput(sources({ task: t })).dependsOn).toEqual([
      { id: 'mystery-edge', issue: null, merged: false }
    ])
  })
})

describe('conflicts-with resolution', () => {
  it('blocking only when the same-tranche sibling has an OPEN PR', () => {
    const sibling = task({ id: '3', issue: 6 })
    const t = task({ id: '2', issue: 10, conflictsWith: ['3'] })
    const base = {
      task: t,
      taskById: new Map([
        ['3', sibling],
        ['2', t]
      ])
    }
    expect(
      buildDispatchGateInput(sources({ ...base, facts: new Map([['3', facts({ prState: 'open' })]]) })).conflictsWith
    ).toEqual([{ id: '3', issue: 6, openOrInFlight: true }])
    expect(
      buildDispatchGateInput(sources({ ...base, facts: new Map([['3', facts({ prState: 'merged' })]]) })).conflictsWith
    ).toEqual([{ id: '3', issue: 6, openOrInFlight: false }])
  })

  it('cross-tranche conflict edges default to not-blocking (no PR evidence, CLI parity)', () => {
    const t = task({ id: '2', issue: 10, conflictsWith: ['other #44'] })
    expect(buildDispatchGateInput(sources({ task: t })).conflictsWith).toEqual([
      { id: 'other #44', issue: 44, openOrInFlight: false }
    ])
  })
})

describe('prior-task (row-adjacency, dormant still assembled)', () => {
  it('attaches issue-closed, pr-merged, and provenance facts to the prior row', () => {
    const prior = task({ id: '1', issue: 5 })
    const t = task({ id: '2', issue: 10 })
    const input = buildDispatchGateInput(
      sources({
        task: t,
        priorTask: prior,
        facts: new Map([['1', facts({ issueState: 'closed', prState: 'merged' })]]),
        provenanceByIssue: new Map([[5, true]])
      })
    )
    expect(input.priorTask).toEqual({ id: '1', issue: 5, issueClosed: true, prMerged: true, hasProvenance: true })
  })

  it('reports all three owed when the prior row has no facts and no provenance', () => {
    const prior = task({ id: '1', issue: 5 })
    const input = buildDispatchGateInput(sources({ task: task({ id: '2', issue: 10 }), priorTask: prior }))
    expect(input.priorTask).toEqual({ id: '1', issue: 5, issueClosed: false, prMerged: false, hasProvenance: false })
  })

  it('is null for the first topology row', () => {
    expect(buildDispatchGateInput(sources({ task: task({ id: '1', issue: 5 }) })).priorTask).toBeNull()
  })
})

describe('end-to-end through checkDispatchReadiness', () => {
  it('a clean task with a fully archived prior row is READY', () => {
    const prior = task({ id: '1', issue: 5 })
    const t = task({ id: '2', issue: 10 })
    const result = checkDispatchReadiness(
      buildDispatchGateInput(
        sources({
          task: t,
          priorTask: prior,
          facts: new Map([
            ['1', facts({ issueState: 'closed', prState: 'merged' })],
            ['2', facts()]
          ]),
          provenanceByIssue: new Map([[5, true]])
        })
      )
    )
    expect(result).toEqual({ ready: true, blockers: [] })
  })

  it('an unmerged prior row no longer blocks (row-adjacency gate removed)', () => {
    const prior = task({ id: '1', issue: 5 })
    const t = task({ id: '2', issue: 10 })
    const result = checkDispatchReadiness(
      buildDispatchGateInput(
        sources({
          task: t,
          priorTask: prior,
          facts: new Map([
            ['1', facts({ issueState: 'open', prState: 'open' })],
            ['2', facts()]
          ])
        })
      )
    )
    expect(result).toEqual({ ready: true, blockers: [] })
  })
})
