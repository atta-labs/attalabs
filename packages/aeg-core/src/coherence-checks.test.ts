import { describe, expect, it } from 'vitest'
import {
  checkA1,
  checkA2,
  checkA3,
  checkClosesN,
  checkD1,
  checkL1,
  checkL2,
  checkL3,
  checkL4,
  checkL5,
  checkR1,
  checkT1,
  checkT2,
  checkT3,
  type CheckResult,
  extractClosesReferences,
  type ForgeIssue,
  type IterationFile,
  scopeT2ToPlanPr,
  type TaskEntry
} from './coherence-checks'
import type { ForgeFacts, Task } from './types'

// ---------- fixture helpers ---------------------------------------------------

function makeTask(id: string, issue: number | null = null, dependsOn: string[] = []): Task {
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

// ---------- closes-N: Closes #N gate ( Layer 1) -------------------------

describe('checkClosesN', () => {
  it('ok — non-task branch bypasses entirely', () => {
    const r = checkClosesN('fix/something', '', [])
    expect(r).toEqual({ ok: true })
  })

  it('ok — task branch with matching Closes #N in body', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('2', 264)]
    const r = checkClosesN('task/aeg-consolidation/2', 'Summary\n\nCloses #264\n', files)
    expect(r.ok).toBe(true)
    expect(r.expectedIssue).toBe(264)
  })

  it('fail — no topology file found for the branch iteration', () => {
    const r = checkClosesN('task/unknown-iter/2', 'Closes #1', [])
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/no topology file found/)
  })

  it('fail — task id not found in topology', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('1', 263)]
    const r = checkClosesN('task/aeg-consolidation/99', 'Closes #1', files)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/not found in aeg-consolidation topology/)
  })

  it('fail — task has no Issue number (#TBD)', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('2', null)]
    const r = checkClosesN('task/aeg-consolidation/2', 'Closes #1', files)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/has no Issue number/)
  })

  it('fail — PR body does not reference the expected issue', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('2', 264)]
    const r = checkClosesN('task/aeg-consolidation/2', 'Summary\n\nCloses #999\n', files)
    expect(r.ok).toBe(false)
    expect(r.expectedIssue).toBe(264)
    expect(r.message).toMatch(/does not contain `Closes #264`/)
  })

  it('ok — accepts fixes/resolves synonyms and is case-insensitive', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('2', 264)]
    for (const phrase of ['Fixes #264', 'RESOLVES #264', 'fix: #264', 'close #264']) {
      const r = checkClosesN('task/aeg-consolidation/2', phrase, files)
      expect(r.ok).toBe(true)
    }
  })

  it('ok — branch with a suffixed task id (e.g. 7a)', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('7a', 300)]
    const r = checkClosesN('task/aeg-consolidation/7a', 'Closes #300', files)
    expect(r.ok).toBe(true)
    expect(r.expectedIssue).toBe(300)
  })

  // ---------- reverse direction: task-closing PR on a mismatched branch ------
  // (the `feat/vinaya-landing-v3` + Issue #509 live gap this brief closes)

  it('fail — non-task branch closes a real task Issue (reverse gate)', () => {
    const taskIssueRefs = new Map([[509, { iterSlug: 'vinaya-pages-v1', taskId: '2' }]])
    const r = checkClosesN('feat/vinaya-landing-v3', 'Closes #509', [], taskIssueRefs)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/^closes-n-reverse:/)
    expect(r.message).toContain('branch "feat/vinaya-landing-v3"')
    expect(r.message).toContain('closes #509')
    expect(r.message).toContain('task 2 of iteration "vinaya-pages-v1"')
    expect(r.message).toContain('not named "task/vinaya-pages-v1/2"')
  })

  it('ok — non-task branch closes an ordinary (non-task) Issue', () => {
    const taskIssueRefs = new Map([[42, null]])
    const r = checkClosesN('fix/some-typo', 'Closes #42', [], taskIssueRefs)
    expect(r).toEqual({ ok: true })
  })

  it('ok — non-task branch closes an Issue absent from the resolved map (unresolved forge lookup)', () => {
    const r = checkClosesN('fix/some-typo', 'Closes #42', [], new Map())
    expect(r).toEqual({ ok: true })
  })

  it('ok — task branch correctly named for the task Issue it closes (reverse passes trivially)', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('2', 264)]
    const taskIssueRefs = new Map([[264, { iterSlug: 'aeg-consolidation', taskId: '2' }]])
    const r = checkClosesN('task/aeg-consolidation/2', 'Closes #264', files, taskIssueRefs)
    expect(r.ok).toBe(true)
    expect(r.expectedIssue).toBe(264)
  })

  it('fail — task branch closes a DIFFERENT task Issue than its own name implies', () => {
    const files = [makeIterationFile('aeg-consolidation', false)]
    files[0]!.iteration.tasks = [makeTask('2', 264), makeTask('3', 265)]
    const taskIssueRefs = new Map([[265, { iterSlug: 'aeg-consolidation', taskId: '3' }]])
    const r = checkClosesN('task/aeg-consolidation/2', 'Closes #265', files, taskIssueRefs)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/^closes-n-reverse:/)
    expect(r.message).toContain('not named "task/aeg-consolidation/3"')
  })
})

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
    expect(r.failures[0]!.issue).toBe(101)
    expect(r.failures[0]!.iteration).toBe('iter-1')
    expect(r.failures[0]!.reason).toMatch(/prState: none/)
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
    expect(r.failures[0]!.grandfathered).toBe(true)
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
    expect(r.failures[0]!.grandfathered).toBe(false)
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
    expect(r.failures[0]!.task).toBe('1')
    expect(r.failures[0]!.reason).toMatch(/AEG provenance/)
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
    expect(r.failures[0]!.grandfathered).toBe(true)
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
    expect(r.failures[0]!.grandfathered).toBe(false)
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
    expect(r.failures[0]!.issue).toBe(101)
    expect(r.failures[0]!.reason).toMatch(/misfire/)
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
    expect(r.failures[0]!.grandfathered).toBe(true)
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
    expect(r.failures[0]!.grandfathered).toBe(false)
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
    expect(r.failures[0]!.issue).toBe(999)
    expect(r.failures[0]!.reason).toMatch(/does not resolve/)
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
    expect(r.failures[0]!.issue).toBe(999)
    expect(r.failures[0]!.iteration).toBe('iter-1')
    expect(r.failures[0]!.reason).toMatch(/does not appear in the topology/)
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
    expect(r.failures[0]!.issue).toBe(101)
  })

  it('backward compat — ciIterationSlug unset reports gaps across every iteration', () => {
    const openIssues = new Map([
      ['iter-1', [101]],
      ['iter-2', [355]]
    ])
    const topology = new Map([
      ['iter-1', new Set([101])],
      ['iter-2', new Set<number>()]
    ])
    const r = checkT2(openIssues, topology)
    expect(r.status).toBe('fail')
    expect(r.failures.map((f) => f.iteration)).toEqual(['iter-2'])
  })

  it('pass — ciIterationSlug scopes check: gap in OTHER iteration is not reported', () => {
    // Reproduces the #358/#359 incident: a PR against aeg-governance-hardening
    // must not fail T2 because herald-hardening-v1 has an unrelated gap.
    const openIssues = new Map([
      ['aeg-governance-hardening', [19]],
      ['herald-hardening-v1', [355, 356]]
    ])
    const topology = new Map([
      ['aeg-governance-hardening', new Set([19])],
      ['herald-hardening-v1', new Set<number>()] // genuine gap — not this PR's concern
    ])
    passesWithNoFailures(checkT2(openIssues, topology, 'aeg-governance-hardening'))
  })

  it('fail — ciIterationSlug scopes check: gap in SAME iteration still fails', () => {
    const openIssues = new Map([
      ['aeg-governance-hardening', [999]],
      ['herald-hardening-v1', [355]]
    ])
    const topology = new Map([
      ['aeg-governance-hardening', new Set<number>()], // genuine gap in the scoped iteration
      ['herald-hardening-v1', new Set<number>()] // also a gap, but out of scope
    ])
    const r = checkT2(openIssues, topology, 'aeg-governance-hardening')
    expect(r.status).toBe('fail')
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0]!.iteration).toBe('aeg-governance-hardening')
    expect(r.failures[0]!.issue).toBe(999)
  })
})

// ---------- T2 point-of-power relocation --------------------

describe('scopeT2ToPlanPr — T2 relocation (aeg-governance-hardening task 24)', () => {
  it('reproduces the #363 incident, then shows the fix: a failing T2 is demoted to info for a non-plan (task) PR', () => {
    const openIssues = new Map([['aeg-governance-hardening', [364, 365]]])
    const topology = new Map([['aeg-governance-hardening', new Set([19])]]) // #364/#365 not yet in topology
    const raw = checkT2(openIssues, topology, 'aeg-governance-hardening')
    expect(raw.status).toBe('fail') // checkT2 itself is untouched — still detects the gap

    const scoped = scopeT2ToPlanPr(raw, false) // task PR — cannot cause or cure this gap
    expect(scoped.status).toBe('info')
    expect(scoped.failures).toEqual(raw.failures) // findings stay visible, never omitted
    expect(scoped.note).toMatch(/non-blocking outside plan PRs/)
  })

  it('leaves a failing T2 blocking for a plan PR (the only PR kind that can fix the gap)', () => {
    const openIssues = new Map([['aeg-governance-hardening', [364]]])
    const topology = new Map([['aeg-governance-hardening', new Set<number>()]])
    const raw = checkT2(openIssues, topology, 'aeg-governance-hardening')
    expect(raw.status).toBe('fail')

    const scoped = scopeT2ToPlanPr(raw, true)
    expect(scoped).toEqual(raw)
  })

  it('leaves a passing T2 untouched regardless of PR kind', () => {
    const openIssues = new Map([['aeg-governance-hardening', [19]]])
    const topology = new Map([['aeg-governance-hardening', new Set([19])]])
    const raw = checkT2(openIssues, topology, 'aeg-governance-hardening')
    expect(raw.status).toBe('pass')

    expect(scopeT2ToPlanPr(raw, false)).toEqual(raw)
    expect(scopeT2ToPlanPr(raw, true)).toEqual(raw)
  })
})

// ---------- R1: missing-rationale-field ( planner→brief gate) -----------

const FULL_RATIONALE_BODY = `
**Boundary** — test boundary
**Sizing** — test sizing
**Project(s) + blast radius** — aeg
**Dependency rationale** — none
**Traps to avoid** — none
**Suggested agent-class** — high
**Stop-and-escalate** — none
**Docs to keep coherent** — none
`

const MISSING_TRAPS_BODY = `
**Boundary** — test boundary
**Sizing** — test sizing
**Project(s) + blast radius** — aeg
**Dependency rationale** — none
**Suggested agent-class** — high
**Stop-and-escalate** — none
**Docs to keep coherent** — none
`

function makeForgeIssue(number: number, body: string, labels: string[] = ['vinaya/iteration:iter-1']): ForgeIssue {
  return { number, body, labels }
}

describe('R1: missing-rationale-field', () => {
  it('pass — complete rationale Issue passes', () => {
    const issuesBySlug = new Map([['iter-1', [makeForgeIssue(101, FULL_RATIONALE_BODY)]]])
    passesWithNoFailures(checkR1(issuesBySlug, new Set()))
  })

  it('fail — Issue missing a field is named in the message', () => {
    const issuesBySlug = new Map([['iter-1', [makeForgeIssue(102, MISSING_TRAPS_BODY)]]])
    const r = checkR1(issuesBySlug, new Set())
    expect(r.status).toBe('fail')
    expect(r.failures[0]!.issue).toBe(102)
    expect(r.failures[0]!.iteration).toBe('iter-1')
    expect(r.failures[0]!.reason).toMatch(/Traps to avoid/)
  })

  it('grandfathered failure → info note, not a blocking fail', () => {
    const issuesBySlug = new Map([['iter-1', [makeForgeIssue(103, MISSING_TRAPS_BODY)]]])
    const r = checkR1(issuesBySlug, new Set([103]))
    expect(r.status).toBe('info')
    expect(r.failures[0]!.grandfathered).toBe(true)
    expect(r.note).toMatch(/grandfathered/)
  })

  it('non-task Issue (no vinaya/iteration: label) is ignored', () => {
    const issuesBySlug = new Map([['iter-1', [makeForgeIssue(104, MISSING_TRAPS_BODY, ['bug'])]]])
    passesWithNoFailures(checkR1(issuesBySlug, new Set()))
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
    expect(r.failures[0]!.task).toBe('1')
    expect(r.failures[0]!.reason).toMatch(/TBD/)
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
    expect(r.failures[0]!.task).toBe('99')
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
    expect(r.failures[0]!.grandfathered).toBe(true)
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
    expect(r.failures[0]!.grandfathered).toBe(false)
  })

  it('info (never fail) — #TBD in an iteration whose forge snapshot fetch failed entirely', () => {
    // Simulates total forge failure: every entry in the iteration has facts: undefined,
    // and the iteration's slug is in forgeUnavailableSlugs (snapshotsBySlug never had it).
    const tbdEntry = makeEntry('down-iter', '1', null, undefined, false)
    const otherEntry = makeEntry('down-iter', '2', 500, undefined, false)
    const forgeUnavailableSlugs = new Set(['down-iter'])
    const r = checkT3([tbdEntry], null, [tbdEntry, otherEntry], forgeUnavailableSlugs)
    expect(r.status).toBe('info')
    expect(r.failures[0]!.grandfathered).toBe(true)
    expect(r.failures[0]!.reason).toMatch(/forge data.*unavailable/)
  })

  it('fail — #TBD in an iteration whose forge WAS available, with no pre-cutoff activity (regression guard)', () => {
    // Same undefined-facts shape as the case above, but the iteration is NOT in
    // forgeUnavailableSlugs (forge was available; there just happened to be no
    // pre-cutoff activity). Must still fail — the carve-out must not leak here.
    const tbdEntry = makeEntry('up-iter', '1', null, undefined, false)
    const otherEntry = makeEntry('up-iter', '2', 500, undefined, false)
    const forgeUnavailableSlugs = new Set<string>()
    const r = checkT3([tbdEntry], null, [tbdEntry, otherEntry], forgeUnavailableSlugs)
    expect(r.status).toBe('fail')
    expect(r.failures[0]!.grandfathered).toBe(false)
  })

  it("BUG (preserved, not fixed): T3 grandfather proxy uses ANY task in the iteration, not the specific #TBD task's own history", () => {
    // A #TBD task in an iteration is grandfathered as long as *some other task*
    // in the same iteration has a pre-cutoff date — even if the #TBD task
    // itself was added long after COHERENCE_ENFORCED_FROM. This is the
    // "branch-scoping proxy" the brief calls out as a known bug to preserve,
    // not fix (that's Task 3 / #220's job).
    const freshTbd = makeEntry('mixed-iter', 'new-task', null, undefined, false)
    const oldResolved = makeEntry(
      'mixed-iter',
      'old-task',
      50,
      makeFacts({ issueState: 'closed', closedAt: '2026-01-01T00:00:00Z' }),
      false
    )
    const r = checkT3([freshTbd], null, [freshTbd, oldResolved])
    expect(r.status).toBe('info')
    expect(r.failures[0]!.grandfathered).toBe(true)
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
    expect(r.failures[0]!.task).toBe('2')
    expect(r.failures[0]!.reason).toMatch(/open/)
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

describe('L1: stale-active-iteration (advisory — info, never fail)', () => {
  it('info + finding — active iteration with all issues closed', () => {
    const f = makeIterationFile('iter-1', false)
    const entries = f.iteration.tasks.map((t) =>
      makeEntry('iter-1', t.id, t.issue, makeFacts({ issueState: 'closed' }), false)
    )
    const entriesBySlug = new Map([['iter-1', entries]])
    const r = checkL1([f], entriesBySlug)
    expect(r.status).toBe('info')
    expect(r.failures[0]!.iteration).toBe('iter-1')
    expect(r.failures[0]!.reason).toMatch(/consider archiving/)
  })

  it('info + no findings — active iteration with at least one open issue', () => {
    const f = makeIterationFile('iter-1', false)
    const entries = [
      makeEntry('iter-1', '1', 101, makeFacts({ issueState: 'closed' })),
      makeEntry('iter-1', '2', 102, makeFacts({ issueState: 'open' }))
    ]
    const entriesBySlug = new Map([['iter-1', entries]])
    const r = checkL1([f], entriesBySlug)
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })

  it('info + no findings — archived iteration is not an L1 concern', () => {
    const f = makeIterationFile('iter-arch', true)
    const entries = f.iteration.tasks.map((t) =>
      makeEntry('iter-arch', t.id, t.issue, makeFacts({ issueState: 'closed' }), true)
    )
    const r = checkL1([f], new Map([['iter-arch', entries]]))
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })
})

// ---------- L2: premature-archive --------------------------------------------

describe('L2: premature-archive (advisory — info, never fail)', () => {
  it('info + finding — archived iteration with open task issue', () => {
    const f = makeIterationFile('iter-arch', true)
    const entries = [makeEntry('iter-arch', '1', 101, makeFacts({ issueState: 'open' }), true)]
    const entriesBySlug = new Map([['iter-arch', entries]])
    const r = checkL2([f], entriesBySlug)
    expect(r.status).toBe('info')
    expect(r.failures[0]!.iteration).toBe('iter-arch')
    expect(r.failures[0]!.reason).toMatch(/premature archive/)
  })

  it('info + no findings — archived iteration with all issues closed', () => {
    const f = makeIterationFile('iter-arch', true)
    const entries = [makeEntry('iter-arch', '1', 101, makeFacts({ issueState: 'closed' }), true)]
    const r = checkL2([f], new Map([['iter-arch', entries]]))
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })

  it('info + no findings — active iteration is not an L2 concern', () => {
    const f = makeIterationFile('iter-active', false)
    const entries = [makeEntry('iter-active', '1', 101, makeFacts({ issueState: 'open' }), false)]
    const r = checkL2([f], new Map([['iter-active', entries]]))
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
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

// ---------- L4: Issue-level Milestone-attachment drift (advisory) ------------

describe('L4: Issue-level Milestone-attachment drift', () => {
  it('info, clean — every open Issue in an active iteration is attached to the matching Milestone', () => {
    const r = checkL4(
      ['aeg-review-gate-v1'],
      [{ iteration: 'aeg-review-gate-v1', issue: 1, milestoneTitle: 'aeg-review-gate-v1' }]
    )
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
    expect(r.note).toBeUndefined()
  })

  it('flags an Issue in an active iteration with no milestone attached at all', () => {
    const r = checkL4(
      ['vinaya-studio-v1'],
      [
        { iteration: 'vinaya-studio-v1', issue: 10, milestoneTitle: null },
        { iteration: 'vinaya-studio-v1', issue: 11, milestoneTitle: null },
        { iteration: 'vinaya-studio-v1', issue: 12, milestoneTitle: null }
      ]
    )
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(3)
    expect(r.failures[0]?.reason).toMatch(/no GitHub-native milestone attached/)
    expect(r.note).toMatch(/3 open task-Issue/)
  })

  it('flags an Issue attached to the WRONG Milestone, naming which one', () => {
    const r = checkL4(
      ['aeg-review-gate-v1'],
      [{ iteration: 'aeg-review-gate-v1', issue: 5, milestoneTitle: 'some-other-iteration' }]
    )
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0]?.reason).toMatch(/attached to Milestone "some-other-iteration" instead/)
  })

  it('never flags an Issue in a NON-active iteration (no open Milestone) — closed/archived iterations are out of scope', () => {
    const r = checkL4(
      ['aeg-review-gate-v1'], // only this one is active
      [{ iteration: 'aeg-forge-state-v1', issue: 99, milestoneTitle: null }]
    )
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })

  it('status is always info — never fails CI, matching L1/L2 advisory framing', () => {
    const r = checkL4(['x'], [{ iteration: 'x', issue: 1, milestoneTitle: null }])
    expect(r.status).toBe('info')
  })
})

// ---------- L5: open Milestone, all Issues closed (forge-native L1) -----------

describe('L5: open-Milestone-all-closed (advisory — info, never fail)', () => {
  it('info + finding — open Milestone whose every task Issue is closed', () => {
    const entries = [
      makeEntry('iter-5', '1', 101, makeFacts({ issueState: 'closed' })),
      makeEntry('iter-5', '2', 102, makeFacts({ issueState: 'closed' }))
    ]
    const r = checkL5(['iter-5'], new Map([['iter-5', entries]]))
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0]?.iteration).toBe('iter-5')
    expect(r.failures[0]?.reason).toMatch(/Milestone still open but every task Issue is closed/)
  })

  it('info + no findings — at least one task Issue still open', () => {
    const entries = [
      makeEntry('iter-5', '1', 101, makeFacts({ issueState: 'closed' })),
      makeEntry('iter-5', '2', 102, makeFacts({ issueState: 'open' }))
    ]
    const r = checkL5(['iter-5'], new Map([['iter-5', entries]]))
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })

  it('skips a slug whose facts are all unavailable — a forge outage is not a finding', () => {
    const entries = [makeEntry('iter-5', '1', 101, undefined)]
    const r = checkL5(['iter-5'], new Map([['iter-5', entries]]))
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })

  it('skips a slug with no entries at all (no tasks with issues)', () => {
    const r = checkL5(['iter-5'], new Map())
    expect(r.status).toBe('info')
    expect(r.failures).toHaveLength(0)
  })
})

describe('extractClosesReferences', () => {
  it('picks up a bare Closes #N', () => {
    expect([...extractClosesReferences('Ships it. Closes #5')]).toEqual([5])
  })
  it('ignores a Closes #N inside an inline code span — GitHub would too', () => {
    expect(extractClosesReferences('The bug: `Closes #5` was backticked.').size).toBe(0)
  })
  it('ignores a Closes #N inside a fenced block but keeps a real bare one', () => {
    expect([...extractClosesReferences('Closes #5\n\n```\nExample: Closes #99\n```\n')]).toEqual([5])
  })
  it('reads only the AEG:CLOSES anchor and strips code within it', () => {
    const body = '<!-- AEG:CLOSES:START -->\nCloses #5\n<!-- AEG:CLOSES:END -->\n\nProse: Closes #99'
    expect([...extractClosesReferences(body)]).toEqual([5])
  })
  it('ignores a double-backtick code span but keeps a real bare ref (PR #617 review)', () => {
    expect([...extractClosesReferences('See ``Closes #99`` — real: Closes #5')]).toEqual([5])
  })
  it('does not over-strip a bare ref sitting between two inline code spans', () => {
    expect([...extractClosesReferences('Use `a` then Closes #5 and `b`.')]).toEqual([5])
  })
  it('accepts past-tense closed/fixed/resolved keywords', () => {
    expect([...extractClosesReferences('Fixed #5')]).toEqual([5])
  })
  it('ignores a Closes #N inside a CRLF fenced block (PR #617 security re-pass)', () => {
    expect(extractClosesReferences('```\r\nCloses #5\r\n```\r\n').size).toBe(0)
  })
  it('keeps a bare Closes #N in a CRLF body', () => {
    expect([...extractClosesReferences('Ships it. Closes #5\r\n')]).toEqual([5])
  })
  // Separator bound — must stay identical to `checkClosesN`'s; the two gates
  // disagreeing about what counts as a reference is the bug class this PR closes.
  it('accepts separators up to the bound and rejects past it', () => {
    expect([...extractClosesReferences(`Closes${' '.repeat(8)}#5`)]).toEqual([5])
    expect(extractClosesReferences(`Closes${' '.repeat(40)}#5`).size).toBe(0)
  })
})
