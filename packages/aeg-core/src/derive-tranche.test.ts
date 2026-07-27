import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deriveTranche } from './derive-tranche'
import { parseTranche } from './parse-tranche'
import type { DerivedStatus, ForgeFacts, Tranche, Task } from './types'

function task(id: string, dependsOn: string[] = [], conflictsWith: string[] = []): Task {
  return {
    id,
    title: `task ${id}`,
    issue: null,
    projects: ['x'],
    dependsOn,
    conflictsWith,
    rationaleMarkdown: ''
  }
}

function tranche(tasks: Task[]): Tranche {
  return {
    name: 'test',
    lifecycle: 'active',
    goal: '',
    tasks,
    backlog: []
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

describe('deriveTranche: §3 status table (each status)', () => {
  // One synthetic task; vary its forge facts to hit every status row.
  const oneTask = tranche([task('1')])

  it('todo: issue open, unassigned (no backlog inside tranches)', () => {
    const d = deriveTranche(oneTask, new Map([['1', facts()]]))
    expect(d.tasks[0]?.status).toBe('todo')
  })

  it('todo: issue open, assigned, no branch yet', () => {
    const d = deriveTranche(oneTask, new Map([['1', facts({ assigned: true })]]))
    expect(d.tasks[0]?.status).toBe('todo')
  })

  it('in-flight: branch exists, no PR', () => {
    const d = deriveTranche(oneTask, new Map([['1', facts({ assigned: true, branchExists: true })]]))
    expect(d.tasks[0]?.status).toBe('in-flight')
  })

  it('in-review: PR open', () => {
    const d = deriveTranche(oneTask, new Map([['1', facts({ assigned: true, branchExists: true, prState: 'open' })]]))
    expect(d.tasks[0]?.status).toBe('in-review')
  })

  it('changes-requested: PR open with reviewDecision changes_requested', () => {
    const d = deriveTranche(
      oneTask,
      new Map([
        [
          '1',
          facts({
            assigned: true,
            branchExists: true,
            prState: 'open',
            reviewDecision: 'changes_requested'
          })
        ]
      ])
    )
    expect(d.tasks[0]?.status).toBe('changes-requested')
  })

  it('merged: PR merged', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'closed', branchExists: true, prState: 'merged' })]])
    )
    expect(d.tasks[0]?.status).toBe('merged')
  })

  it('todo: issue reopened after its original closing PR merged (stale prState override)', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'open', branchExists: false, prState: 'merged' })]])
    )
    expect(d.tasks[0]?.status).toBe('todo')
  })

  it('in-flight: issue reopened after merge, and a new task branch already exists', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'open', branchExists: true, prState: 'merged' })]])
    )
    expect(d.tasks[0]?.status).toBe('in-flight')
  })

  it('dropped: issue closed NOT_PLANNED, no merged PR', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'closed', prState: 'none', stateReason: 'not_planned' })]])
    )
    expect(d.tasks[0]?.status).toBe('dropped')
  })

  it('incoherent: issue closed COMPLETED but no merged PR link', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'closed', prState: 'none', stateReason: 'completed' })]])
    )
    expect(d.tasks[0]?.status).toBe('incoherent')
  })

  it('merged wins over stateReason: closed COMPLETED with merged PR → merged (regression)', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'closed', branchExists: true, prState: 'merged', stateReason: 'completed' })]])
    )
    expect(d.tasks[0]?.status).toBe('merged')
  })

  it('incoherent: issue closed with no recorded stateReason and no merged PR', () => {
    const d = deriveTranche(
      oneTask,
      new Map([['1', facts({ issueState: 'closed', prState: 'none', stateReason: null })]])
    )
    expect(d.tasks[0]?.status).toBe('incoherent')
  })

  it('blocked: vinaya/blocked label wins over every other status', () => {
    const d = deriveTranche(
      oneTask,
      new Map([
        [
          '1',
          facts({
            assigned: true,
            branchExists: true,
            prState: 'open',
            reviewDecision: 'changes_requested',
            blockedLabel: true
          })
        ]
      ])
    )
    expect(d.tasks[0]?.status).toBe('blocked')
  })
})

describe('deriveTranche: missing forge facts', () => {
  it('treats a task absent from the forge map as todo (tranche tasks are minimum todo)', () => {
    const d = deriveTranche(tranche([task('1')]), new Map())
    expect(d.tasks[0]?.status).toBe('todo')
  })
})

describe('deriveTranche: §8 dispatch gates', () => {
  const tasks = [task('1'), task('2', ['1']), task('3', [], ['2'])]
  const iter = tranche(tasks)

  it('depends-on merged → dispatchable', () => {
    const forge = new Map<string, ForgeFacts>([
      ['1', facts({ issueState: 'closed', prState: 'merged' })],
      ['2', facts({ assigned: true })]
    ])
    const d = deriveTranche(iter, forge)
    const t2 = d.tasks.find((t) => t.task.id === '2')
    expect(t2?.dispatchable).toBe(true)
    expect(t2?.blockers.dependsOnNotMerged).toEqual([])
  })

  it('depends-on NOT merged → blocked, dispatchBlockers names it', () => {
    const forge = new Map<string, ForgeFacts>([
      ['1', facts({ assigned: true, branchExists: true, prState: 'open' })],
      ['2', facts({ assigned: true })]
    ])
    const d = deriveTranche(iter, forge)
    const t2 = d.tasks.find((t) => t.task.id === '2')
    expect(t2?.dispatchable).toBe(false)
    expect(t2?.blockers.dependsOnNotMerged).toEqual(['1'])
  })

  it('conflicts-with sibling in-flight → not dispatchable', () => {
    const forge = new Map<string, ForgeFacts>([
      ['2', facts({ assigned: true, branchExists: true })], // in-flight
      ['3', facts({ assigned: true })]
    ])
    const d = deriveTranche(iter, forge)
    const t3 = d.tasks.find((t) => t.task.id === '3')
    expect(t3?.dispatchable).toBe(false)
    expect(t3?.blockers.conflictsWithOpenOrInFlight).toEqual(['2'])
  })

  it('conflicts-with sibling in-review (PR open) → not dispatchable', () => {
    const forge = new Map<string, ForgeFacts>([
      ['2', facts({ assigned: true, branchExists: true, prState: 'open' })],
      ['3', facts({ assigned: true })]
    ])
    const d = deriveTranche(iter, forge)
    const t3 = d.tasks.find((t) => t.task.id === '3')
    expect(t3?.dispatchable).toBe(false)
    expect(t3?.blockers.conflictsWithOpenOrInFlight).toEqual(['2'])
  })

  it('conflicts-with sibling merged → dispatchable (gate clears on merge)', () => {
    const forge = new Map<string, ForgeFacts>([
      ['2', facts({ issueState: 'closed', prState: 'merged' })],
      ['3', facts({ assigned: true })]
    ])
    const d = deriveTranche(iter, forge)
    const t3 = d.tasks.find((t) => t.task.id === '3')
    expect(t3?.dispatchable).toBe(true)
    expect(t3?.blockers.conflictsWithOpenOrInFlight).toEqual([])
  })

  it('conflicts-with sibling todo → dispatchable (not occupying collision domain yet)', () => {
    const forge = new Map<string, ForgeFacts>([
      ['2', facts({ assigned: true })], // todo
      ['3', facts({ assigned: true })]
    ])
    const d = deriveTranche(iter, forge)
    const t3 = d.tasks.find((t) => t.task.id === '3')
    expect(t3?.dispatchable).toBe(true)
  })
})

describe('deriveTranche: unknown edge references', () => {
  it('reports edges to ids not in the table without throwing', () => {
    const iter = tranche([task('1', ['ghost'], ['phantom'])])
    const d = deriveTranche(iter, new Map())
    expect(d.unknownEdges).toEqual([
      { from: '1', to: 'ghost', kind: 'depends-on' },
      { from: '1', to: 'phantom', kind: 'conflicts-with' }
    ])
    // The task is still derived; unknown edges are diagnostic only.
    expect(d.tasks[0]?.status).toBe('todo')
    // Unknown edges do not contribute to blockers either.
    expect(d.tasks[0]?.blockers.dependsOnNotMerged).toEqual([])
    expect(d.tasks[0]?.blockers.conflictsWithOpenOrInFlight).toEqual([])
  })
})

// Integration test required by the brief: parse the real herald-onto-engine.md
// + apply a forge snapshot reflecting today's truth — task 1 merged via PR
// #104 (see the recent commit log), all other tasks still backlog (open,
// unassigned). This exercises the whole pipeline end-to-end on the live
// artifact that proved the string-id + missing-Lifecycle edge cases.
const FIXTURES = join(__dirname, 'fixtures')
const heraldMd = readFileSync(join(FIXTURES, 'herald-onto-engine.md'), 'utf8')

describe('deriveTranche: live herald-onto-engine.md + today’s forge snapshot', () => {
  const iter = parseTranche(heraldMd)

  // Today's snapshot: task 1 merged (#104), nothing else started.
  const snapshot = new Map<string, ForgeFacts>([
    [
      '1',
      {
        issueState: 'closed',
        assigned: true,
        branchExists: true,
        prState: 'merged',
        reviewDecision: 'approved',
        blockedLabel: false,
        stateReason: 'completed',
        closedAt: null,
        mergedAt: null
      }
    ]
    // Tasks 2, 3b, 4, 5, 6, 7a, 7b absent → todo (no forge facts = minimum todo).
  ])

  const derived = deriveTranche(iter, snapshot)
  const statusOf = (id: string): DerivedStatus | undefined => derived.tasks.find((t) => t.task.id === id)?.status
  const dispatchableOf = (id: string) => derived.tasks.find((t) => t.task.id === id)?.dispatchable

  it('task 1 derives merged from the live snapshot', () => {
    expect(statusOf('1')).toBe('merged')
  })

  it('all other tasks derive todo (absent from snapshot — minimum todo)', () => {
    expect(statusOf('2')).toBe('todo')
    expect(statusOf('3b')).toBe('todo')
    expect(statusOf('4')).toBe('todo')
    expect(statusOf('5')).toBe('todo')
    expect(statusOf('6')).toBe('todo')
    expect(statusOf('7a')).toBe('todo')
    expect(statusOf('7b')).toBe('todo')
  })

  it('task 2 becomes dispatchable now that its depends-on (1) is merged', () => {
    expect(dispatchableOf('2')).toBe(true)
  })

  it('task 7b is NOT dispatchable: depends on both 1 (merged) and 7a (not merged)', () => {
    const t7b = derived.tasks.find((t) => t.task.id === '7b')
    expect(t7b?.dispatchable).toBe(false)
    expect(t7b?.blockers.dependsOnNotMerged).toEqual(['7a'])
  })

  it('task 7a is dispatchable: no depends-on, no conflicts-with', () => {
    // Per the wave plan, 7a is independently dispatchable.
    expect(dispatchableOf('7a')).toBe(true)
  })

  it('task 4 is NOT dispatchable: depends-on (2) is not yet merged', () => {
    const t4 = derived.tasks.find((t) => t.task.id === '4')
    expect(t4?.dispatchable).toBe(false)
    expect(t4?.blockers.dependsOnNotMerged).toEqual(['2'])
  })

  it('all 8 topology rows survived parsing into derivation', () => {
    expect(derived.tasks.map((t) => t.task.id)).toEqual(['1', '2', '3b', '4', '5', '6', '7a', '7b'])
  })
})
