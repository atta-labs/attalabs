import { describe, expect, it } from 'bun:test'
import type { ForgeFacts } from '@atta/aeg-core'
import {
  checkA1,
  checkA2,
  checkA3,
  checkD1,
  checkL1,
  checkL2,
  checkL3,
  checkT1,
  checkT2,
  checkT3,
  type CheckResult,
  type IterationFile,
  type TaskEntry
} from './verify-coherence'

// ---------- fixture helpers ---------------------------------------------------

function makeTask(id: string, issue: number | null = null, dependsOn: string[] = []): import('@atta/aeg-core').Task {
  return { id, title: `Task ${id}`, issue, projects: ['aeg'], dependsOn, conflictsWith: [], rationaleMarkdown: '' }
}

function makeFacts(overrides: Partial<ForgeFacts> = {}): ForgeFacts {
  return {
    issueState: 'open',
    assigned: false,
    blockedLabel: false,
    branchExists: false,
    prState: 'none',
    reviewDecision: 'none',
    stateReason: null,
    closedAt: null,
    mergedAt: null,
    ...overrides
  }
}

function makeEntry(
  iterationSlug: string,
  taskId: string,
  issue: number | null,
  facts: ForgeFacts | undefined,
  archived = false,
  dependsOn: string[] = []
): TaskEntry {
  return {
    iterationSlug,
    archived,
    task: makeTask(taskId, issue, dependsOn),
    facts
  }
}

function makeIterationFile(slug: string, archived: boolean, taskCount = 2): IterationFile {
  return {
    slug,
    archived,
    iteration: {
      name: slug,
      lifecycle: archived ? 'complete' : 'active',
      goal: 'test',
      tasks: Array.from({ length: taskCount }, (_, i) => makeTask(String(i + 1), 100 + i + 1)),
      backlog: []
    }
  }
}

function passesWithNoFailures(r: CheckResult) {
  expect(r.status).toBe('pass')
  expect(r.failures).toHaveLength(0)
}

// ---------- A1: closed-without-merge -----------------------------------------

describe('A1: closed-without-merge', () => {
  it('pass — closed issue with merged PR', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed', prState: 'merged' }))]
    passesWithNoFailures(checkA1(entries))
  })

  it('fail — closed issue with no PR (prState: none)', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed', prState: 'none' }))]
    const r = checkA1(entries)
    expect(r.status).toBe('fail')
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0].issue).toBe(101)
    expect(r.failures[0].iteration).toBe('iter-1')
    expect(r.failures[0].reason).toMatch(/prState: none/)
  })

  it('fail — closed issue with open PR (unusual but checkable)', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed', prState: 'open' }))]
    expect(checkA1(entries).status).toBe('fail')
  })

  it('skip — open issue is not an A1 concern', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'open', prState: 'none' }))]
    passesWithNoFailures(checkA1(entries))
  })

  it('skip — entry with no facts (forge unavailable)', () => {
    const entries = [makeEntry('iter-1', '1', 101, undefined)]
    passesWithNoFailures(checkA1(entries))
  })

  it('info — closed-without-merge before COHERENCE_ENFORCED_FROM is grandfathered', () => {
    const entries = [
      makeEntry(
        'iter-1',
        '1',
        101,
        makeFacts({ issueState: 'closed', prState: 'none', closedAt: '2026-06-30T23:59:59Z' })
      )
    ]
    const r = checkA1(entries)
    expect(r.status).toBe('info')
    expect(r.failures[0].grandfathered).toBe(true)
  })

  it('fail — closed-without-merge on/after COHERENCE_ENFORCED_FROM is not grandfathered', () => {
    const entries = [
      makeEntry(
        'iter-1',
        '1',
        101,
        makeFacts({ issueState: 'closed', prState: 'none', closedAt: '2026-07-01T00:00:00Z' })
      )
    ]
    const r = checkA1(entries)
    expect(r.status).toBe('fail')
    expect(r.failures[0].grandfathered).toBe(false)
  })
})

// ---------- A2: archived-without-provenance ----------------------------------

describe('A2: archived-without-provenance', () => {
  it('pass — closed+merged entry with provenance present', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed', prState: 'merged' }))]
    const map = new Map([['iter-1/1', true]])
    passesWithNoFailures(checkA2(entries, map))
  })

  it('fail — closed+merged entry with no provenance', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed', prState: 'merged' }))]
    const map = new Map([['iter-1/1', false]])
    const r = checkA2(entries, map)
    expect(r.status).toBe('fail')
    expect(r.failures[0].task).toBe('1')
    expect(r.failures[0].reason).toMatch(/AEG provenance/)
  })

  it('skip — open issue is not checked for provenance', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'open', prState: 'open' }))]
    const map = new Map<string, boolean>()
    passesWithNoFailures(checkA2(entries, map))
  })

  it('skip — entry absent from map (forge error fetching provenance)', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed', prState: 'merged' }))]
    // key absent → skip
    const map = new Map<string, boolean>()
    passesWithNoFailures(checkA2(entries, map))
  })

  it('info — missing provenance before COHERENCE_ENFORCED_FROM is grandfathered', () => {
    const entries = [
      makeEntry(
        'iter-1',
        '1',
        101,
        makeFacts({ issueState: 'closed', prState: 'merged', mergedAt: '2026-06-15T10:00:00Z' })
      )
    ]
    const map = new Map([['iter-1/1', false]])
    const r = checkA2(entries, map)
    expect(r.status).toBe('info')
    expect(r.failures[0].grandfathered).toBe(true)
  })

  it('fail — missing provenance on/after COHERENCE_ENFORCED_FROM is not grandfathered', () => {
    const entries = [
      makeEntry(
        'iter-1',
        '1',
        101,
        makeFacts({ issueState: 'closed', prState: 'merged', mergedAt: '2026-07-05T10:00:00Z' })
      )
    ]
    const map = new Map([['iter-1/1', false]])
    const r = checkA2(entries, map)
    expect(r.status).toBe('fail')
    expect(r.failures[0].grandfathered).toBe(false)
  })
})

// ---------- A3: auto-close-misfire -------------------------------------------

describe('A3: auto-close-misfire (headline check)', () => {
  it('pass — merged PR + closed issue', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ prState: 'merged', issueState: 'closed' }))]
    passesWithNoFailures(checkA3(entries))
  })

  it('fail — merged PR but issue still open', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ prState: 'merged', issueState: 'open' }))]
    const r = checkA3(entries)
    expect(r.status).toBe('fail')
    expect(r.failures[0].issue).toBe(101)
    expect(r.failures[0].reason).toMatch(/misfire/)
  })

  it('pass — open PR does not trigger A3', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ prState: 'open', issueState: 'open' }))]
    passesWithNoFailures(checkA3(entries))
  })

  it('skip — no facts', () => {
    passesWithNoFailures(checkA3([makeEntry('iter-1', '1', 101, undefined)]))
  })

  it('info — misfire before COHERENCE_ENFORCED_FROM is grandfathered', () => {
    const entries = [
      makeEntry(
        'iter-1',
        '1',
        101,
        makeFacts({ prState: 'merged', issueState: 'open', mergedAt: '2026-06-01T00:00:00Z' })
      )
    ]
    const r = checkA3(entries)
    expect(r.status).toBe('info')
    expect(r.failures[0].grandfathered).toBe(true)
  })

  it('fail — misfire on/after COHERENCE_ENFORCED_FROM is not grandfathered', () => {
    const entries = [
      makeEntry(
        'iter-1',
        '1',
        101,
        makeFacts({ prState: 'merged', issueState: 'open', mergedAt: '2026-07-02T00:00:00Z' })
      )
    ]
    const r = checkA3(entries)
    expect(r.status).toBe('fail')
    expect(r.failures[0].grandfathered).toBe(false)
  })
})

// ---------- T1: phantom-issue-ref --------------------------------------------

describe('T1: phantom-issue-ref', () => {
  it('pass — task with issue number has facts', () => {
    const entries = [makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'open' }))]
    passesWithNoFailures(checkT1(entries))
  })

  it('fail — task has issue number but no facts (issue does not exist)', () => {
    const entries = [makeEntry('iter-1', '1', 999, undefined)]
    const r = checkT1(entries)
    expect(r.status).toBe('fail')
    expect(r.failures[0].issue).toBe(999)
    expect(r.failures[0].reason).toMatch(/does not resolve/)
  })

  it('skip — task with null issue (TBD) is not a T1 concern', () => {
    const entries = [makeEntry('iter-1', '1', null, undefined)]
    passesWithNoFailures(checkT1(entries))
  })
})

// ---------- T2: orphan-task --------------------------------------------------

describe('T2: orphan-task', () => {
  it('pass — open labeled issue appears in topology', () => {
    const openIssues = new Map([['iter-1', [101]]])
    const topology = new Map([['iter-1', new Set([101])]])
    passesWithNoFailures(checkT2(openIssues, topology))
  })

  it('fail — open labeled issue missing from topology', () => {
    const openIssues = new Map([['iter-1', [999]]])
    const topology = new Map([['iter-1', new Set([101])]])
    const r = checkT2(openIssues, topology)
    expect(r.status).toBe('fail')
    expect(r.failures[0].issue).toBe(999)
    expect(r.failures[0].iteration).toBe('iter-1')
    expect(r.failures[0].reason).toMatch(/does not appear in the topology/)
  })

  it('pass — empty open issues for an iteration', () => {
    const openIssues = new Map([['iter-1', []]])
    const topology = new Map([['iter-1', new Set([101])]])
    passesWithNoFailures(checkT2(openIssues, topology))
  })

  it('fail — topology for that slug is empty (iteration file has no matching tasks)', () => {
    const openIssues = new Map([['iter-1', [101]]])
    const topology = new Map<string, Set<number>>() // no entry for iter-1
    const r = checkT2(openIssues, topology)
    expect(r.status).toBe('fail')
    expect(r.failures[0].issue).toBe(101)
  })
})

// ---------- T3: tbd-in-active-iteration --------------------------------------

describe('T3: tbd-in-active-iteration', () => {
  it('pass — active iteration with all issue numbers present', () => {
    const entries = [makeEntry('iter-1', '1', 101, undefined, false)]
    passesWithNoFailures(checkT3(entries))
  })

  it('fail — active iteration with null issue', () => {
    const entries = [makeEntry('iter-1', '1', null, undefined, false)]
    const r = checkT3(entries)
    expect(r.status).toBe('fail')
    expect(r.failures[0].task).toBe('1')
    expect(r.failures[0].reason).toMatch(/TBD/)
  })

  it('pass — archived iteration with null issue is not a T3 concern', () => {
    const entries = [makeEntry('iter-1', '1', null, undefined, true)]
    passesWithNoFailures(checkT3(entries))
  })

  it('pass — ciIterationSlug scopes check: null issue in OTHER iteration is skipped', () => {
    const entries = [makeEntry('vada-production-v1', '6a', null, undefined, false)]
    // Running CI gate for aeg-coherence-v1 → only aeg-coherence-v1 T3 matters
    passesWithNoFailures(checkT3(entries, 'aeg-coherence-v1'))
  })

  it('fail — ciIterationSlug scopes check: null issue in SAME iteration still fails', () => {
    const entries = [makeEntry('aeg-coherence-v1', '99', null, undefined, false)]
    const r = checkT3(entries, 'aeg-coherence-v1')
    expect(r.status).toBe('fail')
    expect(r.failures[0].task).toBe('99')
  })

  it('info — null issue in iteration whose tasks have pre-cutoff closedAt is grandfathered', () => {
    const tbdEntry = makeEntry('vada-production-v1', '6a', null, undefined, false)
    const resolvedEntry = makeEntry(
      'vada-production-v1',
      '4',
      175,
      makeFacts({ issueState: 'closed', closedAt: '2026-06-20T00:00:00Z' }),
      false
    )
    const r = checkT3([tbdEntry], null, [tbdEntry, resolvedEntry])
    expect(r.status).toBe('info')
    expect(r.failures[0].grandfathered).toBe(true)
  })

  it('fail — null issue in iteration with no pre-cutoff dates is NOT grandfathered', () => {
    const tbdEntry = makeEntry('new-iter', '1', null, undefined, false)
    // Enriched entries show the iteration has only post-cutoff activity
    const resolvedEntry = makeEntry(
      'new-iter',
      '2',
      300,
      makeFacts({ issueState: 'closed', closedAt: '2026-08-01T00:00:00Z' }),
      false
    )
    const r = checkT3([tbdEntry], null, [tbdEntry, resolvedEntry])
    expect(r.status).toBe('fail')
    expect(r.failures[0].grandfathered).toBe(false)
  })
})

// ---------- D1: dispatched-on-unmet-deps -------------------------------------

describe('D1: dispatched-on-unmet-deps', () => {
  it('pass — open PR task with all deps closed (by issue ref)', () => {
    const dep = makeEntry('iter-1', '1', 100, makeFacts({ issueState: 'closed' }))
    const main = makeEntry('iter-1', '2', 200, makeFacts({ prState: 'open' }), false, ['#100'])
    const issueMap = new Map([[100, dep]])
    const taskMap = new Map<string, TaskEntry>()
    passesWithNoFailures(checkD1([main, dep], issueMap, taskMap))
  })

  it('fail — open PR task with open dep (by issue ref)', () => {
    const dep = makeEntry('iter-1', '1', 100, makeFacts({ issueState: 'open' }))
    const main = makeEntry('iter-1', '2', 200, makeFacts({ prState: 'open' }), false, ['#100'])
    const issueMap = new Map([[100, dep]])
    const taskMap = new Map<string, TaskEntry>()
    const r = checkD1([main, dep], issueMap, taskMap)
    expect(r.status).toBe('fail')
    expect(r.failures[0].task).toBe('2')
    expect(r.failures[0].reason).toMatch(/open/)
  })

  it('pass — open PR task with all deps closed (by task ID ref in same iteration)', () => {
    const dep = makeEntry('iter-1', '1', 100, makeFacts({ issueState: 'closed' }))
    const main = makeEntry('iter-1', '2', 200, makeFacts({ prState: 'open' }), false, ['1'])
    const issueMap = new Map([[100, dep]])
    const taskMap = new Map([['iter-1/1', dep]])
    passesWithNoFailures(checkD1([main, dep], issueMap, taskMap))
  })

  it('fail — open PR task with open dep (by task ID ref)', () => {
    const dep = makeEntry('iter-1', '1', 100, makeFacts({ issueState: 'open' }))
    const main = makeEntry('iter-1', '2', 200, makeFacts({ prState: 'open' }), false, ['1'])
    const issueMap = new Map([[100, dep]])
    const taskMap = new Map([['iter-1/1', dep]])
    const r = checkD1([main, dep], issueMap, taskMap)
    expect(r.status).toBe('fail')
  })

  it('skip — task with no open PR is not a D1 concern', () => {
    const dep = makeEntry('iter-1', '1', 100, makeFacts({ issueState: 'open' }))
    const main = makeEntry('iter-1', '2', 200, makeFacts({ prState: 'none' }), false, ['#100'])
    const issueMap = new Map([[100, dep]])
    const taskMap = new Map<string, TaskEntry>()
    passesWithNoFailures(checkD1([main, dep], issueMap, taskMap))
  })

  it('skip — unknown dep (not in maps) does not trip D1', () => {
    const main = makeEntry('iter-1', '2', 200, makeFacts({ prState: 'open' }), false, ['#999'])
    const r = checkD1([main], new Map(), new Map())
    passesWithNoFailures(r)
  })
})

// ---------- L1: stale-active-iteration ---------------------------------------

describe('L1: stale-active-iteration', () => {
  it('flag — active iteration with all issues closed', () => {
    const f = makeIterationFile('iter-1', false)
    const entries = f.iteration.tasks.map((t) =>
      makeEntry('iter-1', t.id, t.issue, makeFacts({ issueState: 'closed' }), false)
    )
    const entriesBySlug = new Map([['iter-1', entries]])
    const r = checkL1([f], entriesBySlug)
    expect(r.status).toBe('fail')
    expect(r.failures[0].iteration).toBe('iter-1')
    expect(r.failures[0].reason).toMatch(/consider archiving/)
  })

  it('pass — active iteration with at least one open issue', () => {
    const f = makeIterationFile('iter-1', false)
    const entries = [
      makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed' })),
      makeEntry('iter-1', '2', 102, makeFacts({ issueState: 'open' }))
    ]
    const entriesBySlug = new Map([['iter-1', entries]])
    passesWithNoFailures(checkL1([f], entriesBySlug))
  })

  it('skip — archived iteration is not an L1 concern', () => {
    const f = makeIterationFile('iter-arch', true)
    const entries = f.iteration.tasks.map((t) =>
      makeEntry('iter-arch', t.id, t.issue, makeFacts({ issueState: 'closed' }), true)
    )
    passesWithNoFailures(checkL1([f], new Map([['iter-arch', entries]])))
  })
})

// ---------- L2: premature-archive --------------------------------------------

describe('L2: premature-archive', () => {
  it('fail — archived iteration with open task issue', () => {
    const f = makeIterationFile('iter-arch', true)
    const entries = [makeEntry('iter-arch', '1', 101, makeFacts({ issueState: 'open' }), true)]
    const entriesBySlug = new Map([['iter-arch', entries]])
    const r = checkL2([f], entriesBySlug)
    expect(r.status).toBe('fail')
    expect(r.failures[0].iteration).toBe('iter-arch')
    expect(r.failures[0].reason).toMatch(/premature archive/)
  })

  it('pass — archived iteration with all issues closed', () => {
    const f = makeIterationFile('iter-arch', true)
    const entries = [makeEntry('iter-arch', '1', 101, makeFacts({ issueState: 'closed' }), true)]
    passesWithNoFailures(checkL2([f], new Map([['iter-arch', entries]])))
  })

  it('skip — active iteration is not an L2 concern', () => {
    const f = makeIterationFile('iter-active', false)
    const entries = [makeEntry('iter-active', '1', 101, makeFacts({ issueState: 'open' }), false)]
    passesWithNoFailures(checkL2([f], new Map([['iter-active', entries]])))
  })
})

// ---------- L3: active-iteration-count (informational) -----------------------

describe('L3: active-iteration-count', () => {
  it('info — lists active iterations by name', () => {
    const files = [
      makeIterationFile('alpha', false),
      makeIterationFile('beta', false),
      makeIterationFile('archived', true)
    ]
    const r = checkL3(files)
    expect(r.status).toBe('info')
    expect(r.note).toMatch(/2 active/)
    expect(r.note).toMatch(/alpha/)
    expect(r.note).toMatch(/beta/)
    expect(r.note).not.toMatch(/archived/)
  })

  it('info — zero active iterations', () => {
    const r = checkL3([makeIterationFile('arch', true)])
    expect(r.status).toBe('info')
    expect(r.note).toMatch(/0 active/)
  })
})
