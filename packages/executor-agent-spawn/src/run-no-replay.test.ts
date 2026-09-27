/**
 * @file run-no-replay.test.ts
 * @description The proof that resuming a run never re-executes a completed
 * node.
 *
 * **Why this needs its own suite, and why it counts spawns.** Every other
 * property of the control surface can be asserted against a return value. This
 * one cannot: a resume that re-ran a completed step would still produce a
 * correct-looking final state, because the keyed-merge reducers would simply
 * overwrite that node's entry with an identical-shaped second result. The
 * observable difference is entirely in what the world outside the graph saw —
 * how many times a process was spawned — so the instrument here is a spawn log
 * per leg, never the state the run ended with.
 *
 * That distinction is not academic in this package. An `agent-spawn` node starts
 * a real agent CLI and a `mechanical` node runs a real `git`-shaped command; both
 * change a working tree. A replayed step is a second commit, a second push, a
 * second comment — effects no amount of state reconciliation afterwards can take
 * back. `revisionCounts` is the second instrument, and the sharper one: it is
 * incremented per execution from the checkpointed value, so a node that ran
 * twice reads `2` no matter how identical its two results were.
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanMechanicalNode, PlanStepDecision } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import { resumeControlledRun, startControlledRun } from './run-control'
import { createRunControl } from './run-halt'
import { createRunIdentity, readRunCheckpoint, runIdentityForRunId } from './run-identity'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, RunControl } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-no-replay-root-'))

/** A spawn log scoped to one leg — the only instrument that can see a replay. */
function legSpawnLog(): { commands: string[]; spawnFn: SpawnFn } {
  const commands: string[] = []
  const spawnFn: SpawnFn = (command) => {
    commands.push(command)
    const closeListeners: Array<(code: number | null) => void> = []
    const spawned: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      for (const listener of closeListeners) listener(0)
    })
    return spawned
  }
  return { commands, spawnFn }
}

function mechanicalNode(id: string, action: string, decision?: PlanStepDecision): PlanMechanicalNode {
  return { id, role: 'mechanical', kind: 'mechanical', action, ...(decision ? { decision } : {}), metadata: {} }
}

/**
 * Four mechanical steps in a line. Mechanical rather than agent-spawn on purpose:
 * this is the node kind whose replay the stop condition names, because its whole
 * definition is "performs an external action".
 */
const irreversibleActions = {
  'clone-action': { command: 'clone-cmd' },
  'commit-action': { command: 'commit-cmd' },
  'push-action': { command: 'push-cmd' },
  'comment-action': { command: 'comment-cmd' }
}

function fourStepPlan(): Plan {
  return {
    schemaVersion: '1.0',
    question: 'Land the change',
    model: 'n/a',
    agents: {},
    teamName: 'agent-lifecycle-no-replay-test',
    maxRevisions: 0,
    graph: {
      nodes: {
        clone: mechanicalNode('clone', 'clone-action'),
        commit: mechanicalNode('commit', 'commit-action'),
        push: mechanicalNode('push', 'push-action'),
        comment: mechanicalNode('comment', 'comment-action')
      },
      edges: [
        { from: 'clone', to: 'commit', kind: 'flow' },
        { from: 'commit', to: 'push', kind: 'flow' },
        { from: 'push', to: 'comment', kind: 'flow' }
      ],
      conditionalEdges: [],
      entryNode: 'clone'
    }
  }
}

function config(
  onEvent?: (event: AgentLifecycleEvent) => void,
  overrides: Partial<AgentSpawnExecutorConfig> = {}
): AgentSpawnExecutorConfig {
  return {
    workingDirectoryRoot,
    roleBinaries: {},
    mechanicalActions: irreversibleActions,
    ...(onEvent ? { onEvent } : {}),
    ...overrides
  }
}

function haltAfter(nodeId: string, control: RunControl): (event: AgentLifecycleEvent) => void {
  return (event) => {
    if (event.type === 'node:complete' && event.nodeId === nodeId) control.halt()
  }
}

describe('resuming never re-executes a completed node', () => {
  it('spawns each step exactly once across the halt/resume seam', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('no-replay-once')

    const firstLeg = legSpawnLog()
    const control = createRunControl()
    const paused = await startControlledRun({
      plan: fourStepPlan(),
      config: config(haltAfter('commit', control)),
      checkpointer,
      identity,
      control,
      spawnFn: firstLeg.spawnFn
    })
    expect(paused.reason).toBe('paused')
    expect(firstLeg.commands).toEqual(['clone-cmd', 'commit-cmd'])

    const secondLeg = legSpawnLog()
    const finished = await resumeControlledRun({
      plan: fourStepPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: secondLeg.spawnFn
    })
    expect(finished.reason).toBe('completed')

    // The resumed leg ran only what was still owed. `clone-cmd` and `commit-cmd`
    // are absent, not merely "not duplicated overall" — the completed commit was
    // never made a second time.
    expect(secondLeg.commands).toEqual(['push-cmd', 'comment-cmd'])
    expect([...firstLeg.commands, ...secondLeg.commands].sort()).toEqual([
      'clone-cmd',
      'comment-cmd',
      'commit-cmd',
      'push-cmd'
    ])
  })

  it('leaves every revision count at one — the count a re-executed node would double', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('no-replay-counts')
    const control = createRunControl()

    await startControlledRun({
      plan: fourStepPlan(),
      config: config(haltAfter('clone', control)),
      checkpointer,
      identity,
      control,
      spawnFn: legSpawnLog().spawnFn
    })
    await resumeControlledRun({
      plan: fourStepPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: legSpawnLog().spawnFn
    })

    const state = await readRunCheckpoint(checkpointer, identity)
    expect(state?.revisionCounts).toEqual({ clone: 1, commit: 1, push: 1, comment: 1 })
  })

  it('holds across several halt/resume cycles, not just one', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('no-replay-many-legs')
    const spawned: string[] = []

    for (const haltAt of ['clone', 'commit', 'push']) {
      const leg = legSpawnLog()
      const control = createRunControl()
      const outcome =
        haltAt === 'clone'
          ? await startControlledRun({
              plan: fourStepPlan(),
              config: config(haltAfter(haltAt, control)),
              checkpointer,
              identity,
              control,
              spawnFn: leg.spawnFn
            })
          : await resumeControlledRun({
              plan: fourStepPlan(),
              config: config(haltAfter(haltAt, control)),
              checkpointer,
              identity,
              control,
              spawnFn: leg.spawnFn
            })
      expect(outcome.reason).toBe('paused')
      // Each leg advances by exactly one step, and repeats none.
      expect(leg.commands).toHaveLength(1)
      spawned.push(...leg.commands)
    }

    const last = legSpawnLog()
    const finished = await resumeControlledRun({
      plan: fourStepPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: last.spawnFn
    })
    expect(finished.reason).toBe('completed')
    spawned.push(...last.commands)

    expect(spawned).toEqual(['clone-cmd', 'commit-cmd', 'push-cmd', 'comment-cmd'])
    const state = await readRunCheckpoint(checkpointer, identity)
    expect(state?.revisionCounts).toEqual({ clone: 1, commit: 1, push: 1, comment: 1 })
  })

  it('resumes from the run id alone, with a freshly built graph and executor', async () => {
    // The process-restart path: nothing is carried over in memory between the
    // two legs but the `runId` string, so a resume that depended on any live
    // handle would fail here rather than quietly replaying.
    const checkpointer = new MemorySaver()
    const control = createRunControl()
    const firstLeg = legSpawnLog()

    await startControlledRun({
      plan: fourStepPlan(),
      config: config(haltAfter('commit', control)),
      checkpointer,
      identity: createRunIdentity('no-replay-restart'),
      control,
      spawnFn: firstLeg.spawnFn
    })

    const secondLeg = legSpawnLog()
    const finished = await resumeControlledRun({
      plan: fourStepPlan(),
      config: config(),
      checkpointer,
      identity: runIdentityForRunId('no-replay-restart'),
      spawnFn: secondLeg.spawnFn
    })

    expect(finished.reason).toBe('completed')
    expect(secondLeg.commands).toEqual(['push-cmd', 'comment-cmd'])
  })

  it('continues a revision loop from its checkpointed count rather than restarting it', async () => {
    // A resume that replayed would reset the loop's own accounting, and a
    // ceiling that restarts is a ceiling that never binds. The predicate is
    // always true, so only the ceiling can end this run.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('no-replay-revisions')
    const decision: PlanStepDecision = { examine: 'clone', ifTrue: 'clone', ifFalse: 'comment', maxRevisions: 3 }
    const plan: Plan = {
      ...fourStepPlan(),
      graph: {
        nodes: {
          clone: mechanicalNode('clone', 'clone-action'),
          commit: mechanicalNode('commit', 'commit-action', decision),
          comment: mechanicalNode('comment', 'comment-action')
        },
        edges: [{ from: 'clone', to: 'commit', kind: 'flow' }],
        conditionalEdges: [],
        entryNode: 'clone'
      }
    }
    const loopConfig = (onEvent?: (event: AgentLifecycleEvent) => void) =>
      config(onEvent, { decisionPredicates: { commit: () => true } })

    // Halt as soon as `clone` has looped back once, then resume to the ceiling.
    const control = createRunControl()
    let cloneCompletions = 0
    const paused = await startControlledRun({
      plan,
      config: loopConfig((event) => {
        if (event.type === 'node:complete' && event.nodeId === 'clone') {
          cloneCompletions += 1
          if (cloneCompletions === 2) control.halt()
        }
      }),
      checkpointer,
      identity,
      control,
      spawnFn: legSpawnLog().spawnFn
    })
    expect(paused.reason).toBe('paused')
    const atHalt = await readRunCheckpoint(checkpointer, identity)
    expect(atHalt?.revisionCounts.clone).toBe(2)

    const resumed = await resumeControlledRun({
      plan,
      config: loopConfig(),
      checkpointer,
      identity,
      spawnFn: legSpawnLog().spawnFn
    })

    // The ceiling is reached from where the halted leg left it: `clone` runs
    // twice more (to 4), and the fifth evaluation refuses. A resume that had
    // replayed from the entry node would have restarted the count at 1 and let
    // the loop run three further revisions.
    expect(resumed.reason).toBe('exhausted')
    if (resumed.reason !== 'exhausted') throw new Error('narrowing guard')
    expect(resumed.exhaustion).toEqual({ nodeId: 'commit', target: 'clone', maxRevisions: 3, revisions: 4 })
    expect(resumed.checkpoint.results.comment).toBeUndefined()
  })

  it('does not re-run a completed branch when a fan-out is halted mid-flight', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('no-replay-fanout')
    const plan: Plan = {
      ...fourStepPlan(),
      graph: {
        nodes: {
          clone: mechanicalNode('clone', 'clone-action'),
          commit: mechanicalNode('commit', 'commit-action'),
          push: mechanicalNode('push', 'push-action'),
          comment: mechanicalNode('comment', 'comment-action')
        },
        // `clone` fans out to `commit` and `push`; `comment` joins both.
        edges: [
          { from: 'clone', to: 'commit', kind: 'flow' },
          { from: 'clone', to: 'push', kind: 'flow' },
          { from: 'commit', to: 'comment', kind: 'flow' },
          { from: 'push', to: 'comment', kind: 'flow' }
        ],
        conditionalEdges: [],
        entryNode: 'clone'
      }
    }

    const control = createRunControl()
    const firstLeg = legSpawnLog()
    const paused = await startControlledRun({
      plan,
      config: config(haltAfter('clone', control)),
      checkpointer,
      identity,
      control,
      spawnFn: firstLeg.spawnFn
    })

    expect(paused.reason).toBe('paused')
    if (paused.reason !== 'paused') throw new Error('narrowing guard')
    expect(firstLeg.commands).toEqual(['clone-cmd'])
    expect(paused.pendingNodes.sort()).toEqual(['commit', 'push'])

    const secondLeg = legSpawnLog()
    const finished = await resumeControlledRun({
      plan,
      config: config(),
      checkpointer,
      identity,
      spawnFn: secondLeg.spawnFn
    })

    expect(finished.reason).toBe('completed')
    expect(secondLeg.commands).not.toContain('clone-cmd')
    expect(secondLeg.commands.sort()).toEqual(['comment-cmd', 'commit-cmd', 'push-cmd'])
    const state = await readRunCheckpoint(checkpointer, identity)
    expect(state?.revisionCounts).toEqual({ clone: 1, commit: 1, push: 1, comment: 1 })
  })
})
