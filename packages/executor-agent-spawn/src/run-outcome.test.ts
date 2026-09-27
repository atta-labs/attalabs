import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanMechanicalNode, PlanStepDecision } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import { readRunOutcome, resumeControlledRun, startControlledRun } from './run-control'
import { createRunControl } from './run-halt'
import { createRunIdentity, runIdentityForRunId, runInvokeConfig } from './run-identity'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, RunControl } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-outcome-root-'))

/** A fake spawn closing with `exitCodeFor(command)`, recording every command. */
function recordingSpawn(exitCodeFor: (command: string) => number = () => 0): {
  commands: string[]
  spawnFn: SpawnFn
} {
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
      for (const listener of closeListeners) listener(exitCodeFor(command))
    })
    return spawned
  }
  return { commands, spawnFn }
}

function mechanicalNode(id: string, action: string, decision?: PlanStepDecision): PlanMechanicalNode {
  return { id, role: 'mechanical', kind: 'mechanical', action, ...(decision ? { decision } : {}), metadata: {} }
}

const actions = {
  'attempt-action': { command: 'attempt-cmd' },
  'check-action': { command: 'check-cmd' },
  'finish-action': { command: 'finish-cmd' }
}

/**
 * `attempt` → `check`, with `check` carrying the decision. `attempt` has
 * genuinely run once by the time `check` first evaluates, which is what makes
 * the recorded `revisions` count meaningful rather than an artifact.
 */
function loopPlan(decision: PlanStepDecision): Plan {
  return {
    schemaVersion: '1.0',
    question: 'Converge on a change',
    model: 'n/a',
    agents: {},
    teamName: 'agent-lifecycle-outcome-test',
    maxRevisions: 0,
    graph: {
      nodes: {
        attempt: mechanicalNode('attempt', 'attempt-action'),
        check: mechanicalNode('check', 'check-action', decision),
        finish: mechanicalNode('finish', 'finish-action')
      },
      edges: [{ from: 'attempt', to: 'check', kind: 'flow' }],
      conditionalEdges: [],
      entryNode: 'attempt'
    }
  }
}

/** Three mechanical steps in a line — no decisions, so no ceiling to exhaust. */
function straightPlan(): Plan {
  return {
    ...loopPlan({ examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 1 }),
    graph: {
      nodes: {
        attempt: mechanicalNode('attempt', 'attempt-action'),
        check: mechanicalNode('check', 'check-action'),
        finish: mechanicalNode('finish', 'finish-action')
      },
      edges: [
        { from: 'attempt', to: 'check', kind: 'flow' },
        { from: 'check', to: 'finish', kind: 'flow' }
      ],
      conditionalEdges: [],
      entryNode: 'attempt'
    }
  }
}

function config(
  overrides: Partial<AgentSpawnExecutorConfig> = {},
  onEvent?: (event: AgentLifecycleEvent) => void
): AgentSpawnExecutorConfig {
  return {
    workingDirectoryRoot,
    roleBinaries: {},
    mechanicalActions: actions,
    ...(onEvent ? { onEvent } : {}),
    ...overrides
  }
}

function haltAfter(nodeId: string, control: RunControl, reason?: string): (event: AgentLifecycleEvent) => void {
  return (event) => {
    if (event.type === 'node:complete' && event.nodeId === nodeId) control.halt(reason)
  }
}

describe('exhaustion is its own outcome, never a completed run', () => {
  /** The predicate is always true, so only the ceiling can stop the loop. */
  const alwaysRevise = { decisionPredicates: { check: () => true } }

  it('reports exhausted, naming the ceiling that was refused and the count that refused it', async () => {
    const checkpointer = new MemorySaver()
    const outcome = await startControlledRun({
      plan: loopPlan({ examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 1 }),
      config: config(alwaysRevise),
      checkpointer,
      identity: createRunIdentity('exhausted-run'),
      spawnFn: recordingSpawn().spawnFn
    })

    expect(outcome.reason).toBe('exhausted')
    if (outcome.reason !== 'exhausted') throw new Error('narrowing guard')
    expect(outcome.exhaustion).toEqual({ nodeId: 'check', target: 'attempt', maxRevisions: 1, revisions: 2 })
    // The loop never reached `finish` — an exhausted run has not answered.
    expect(outcome.checkpoint.results.finish).toBeUndefined()
  })

  it('bounds a backward-pointing ifFalse the same way, and names that branch as the target', async () => {
    const checkpointer = new MemorySaver()
    const outcome = await startControlledRun({
      plan: loopPlan({ examine: 'attempt', ifTrue: 'finish', ifFalse: 'attempt', maxRevisions: 1 }),
      config: config({ decisionPredicates: { check: () => false } }),
      checkpointer,
      identity: createRunIdentity('exhausted-iffalse'),
      spawnFn: recordingSpawn().spawnFn
    })

    expect(outcome.reason).toBe('exhausted')
    if (outcome.reason !== 'exhausted') throw new Error('narrowing guard')
    expect(outcome.exhaustion.target).toBe('attempt')
  })

  it('persists the exhaustion, readable from the store and the run id alone', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('exhausted-persisted')
    await startControlledRun({
      plan: loopPlan({ examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 2 }),
      config: config(alwaysRevise),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    // A fresh process would hold nothing but the run id string.
    const record = await readRunOutcome(checkpointer, runIdentityForRunId('exhausted-persisted'))
    expect(record?.reason).toBe('exhausted')
    if (record?.reason !== 'exhausted') throw new Error('narrowing guard')
    expect(record.exhaustion).toEqual({ nodeId: 'check', target: 'attempt', maxRevisions: 2, revisions: 3 })
  })

  it('refuses a Plan step whose id collides with the synthetic recorder names', () => {
    const plan = loopPlan({ examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 1 })
    const reserved = 'agent-spawn.revisions-exhausted.smuggled'
    plan.graph.nodes[reserved] = mechanicalNode(reserved, 'finish-action')

    const executor = createAgentLifecycleNodeExecutor(config(alwaysRevise))
    expect(() => buildAgentSpawnStateGraph(plan, executor, config(alwaysRevise))).toThrow(/reserves/)
  })
})

describe('readRunOutcome — the vocabulary, read from the store alone', () => {
  it('returns undefined for a run the store has never seen', async () => {
    expect(await readRunOutcome(new MemorySaver(), runIdentityForRunId('unknown'))).toBeUndefined()
  })

  it('records completed for a run that reached a terminal step', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('completed-record')
    await startControlledRun({
      plan: straightPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    const record = await readRunOutcome(checkpointer, identity)
    expect(record?.reason).toBe('completed')
    expect(typeof record?.at).toBe('string')
  })

  it('records paused for a halted run, carrying the halt message verbatim', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('paused-record')
    const control = createRunControl()

    await startControlledRun({
      plan: straightPlan(),
      config: config({}, haltAfter('attempt', control, 'operator paused')),
      checkpointer,
      identity,
      control,
      spawnFn: recordingSpawn().spawnFn
    })

    const record = await readRunOutcome(checkpointer, identity)
    expect(record?.reason).toBe('paused')
    if (record?.reason !== 'paused') throw new Error('narrowing guard')
    expect(record.detail).toMatch(/halted before node 'check'/)
    expect(record.detail).toMatch(/operator paused/)
  })

  it('records failed for a broken run, distinct from paused, carrying its own message', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('failed-record')

    await startControlledRun({
      plan: straightPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn((command) => (command === 'check-cmd' ? 1 : 0)).spawnFn
    })

    const record = await readRunOutcome(checkpointer, identity)
    expect(record?.reason).toBe('failed')
    if (record?.reason !== 'failed') throw new Error('narrowing guard')
    expect(record.error).toMatch(/exited with code 1/)
  })

  it('lets a failed task supersede a stored resumed record — the most recent thing wins', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('resumed-record')
    const firstHalt = createRunControl()

    await startControlledRun({
      plan: straightPlan(),
      config: config({}, haltAfter('attempt', firstHalt)),
      checkpointer,
      identity,
      control: firstHalt,
      spawnFn: recordingSpawn().spawnFn
    })
    expect((await readRunOutcome(checkpointer, identity))?.reason).toBe('paused')

    // Halt the resumed leg again, one step later, and read the record while the
    // run is stopped mid-continuation: the store has to distinguish a run that
    // was continued from one nobody ever came back to.
    const secondHalt = createRunControl()
    const midLeg: string[] = []
    await resumeControlledRun({
      plan: straightPlan(),
      config: config({}, (event) => {
        if (event.type === 'node:complete' && event.nodeId === 'check') {
          midLeg.push('check-done')
          secondHalt.halt()
        }
      }),
      checkpointer,
      identity,
      control: secondHalt,
      spawnFn: recordingSpawn().spawnFn
    })
    expect(midLeg).toEqual(['check-done'])

    // The second halt supersedes the `resumed` record — a failed task is the
    // most recent thing that happened to the run.
    expect((await readRunOutcome(checkpointer, identity))?.reason).toBe('paused')

    const finished = await resumeControlledRun({
      plan: straightPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })
    expect(finished.reason).toBe('completed')
    expect((await readRunOutcome(checkpointer, identity))?.reason).toBe('completed')
  })

  it('writes the resumed record from inside the resumed leg, naming the checkpoint it continued from', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('resumed-marker')
    const control = createRunControl()

    await startControlledRun({
      plan: straightPlan(),
      config: config({}, haltAfter('attempt', control)),
      checkpointer,
      identity,
      control,
      spawnFn: recordingSpawn().spawnFn
    })

    const pausedAt = (await checkpointer.getTuple(runInvokeConfig(identity)))?.checkpoint.id

    // Resume, and halt the moment the first resumed node finishes — so the
    // newest *channel* value is the resumed record this leg wrote, even though
    // the halt that follows is what readRunOutcome reports.
    const halt = createRunControl()
    const outcome = await resumeControlledRun({
      plan: straightPlan(),
      config: config({}, haltAfter('check', halt)),
      checkpointer,
      identity,
      control: halt,
      spawnFn: recordingSpawn().spawnFn
    })

    expect(outcome.resumedFrom).toBe(pausedAt)
    const channelValue = (await checkpointer.getTuple(runInvokeConfig(identity)))?.checkpoint.channel_values.outcome
    expect(channelValue).toMatchObject({ reason: 'resumed', fromCheckpointId: pausedAt })
  })

  it('reads resumed for a continuation with no failed task — the mid-flight answer', async () => {
    // A run is observably `resumed` exactly while its continuation is under way:
    // the record written, no task failed yet, no terminal record replacing it.
    // Reproduced by putting that state into the store, because a leg that is
    // genuinely still running cannot be read from outside its own await.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('resumed-midflight')
    await startControlledRun({
      plan: straightPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    const tuple = await checkpointer.getTuple(runInvokeConfig(identity))
    if (!tuple) throw new Error('expected a checkpoint')
    tuple.checkpoint.channel_values.outcome = {
      reason: 'resumed',
      at: new Date().toISOString(),
      fromCheckpointId: 'earlier-checkpoint'
    }
    await checkpointer.put(runInvokeConfig(identity), tuple.checkpoint, tuple.metadata ?? {}, {})

    const record = await readRunOutcome(checkpointer, identity)
    expect(record?.reason).toBe('resumed')
    if (record?.reason !== 'resumed') throw new Error('narrowing guard')
    expect(record.fromCheckpointId).toBe('earlier-checkpoint')
  })

  it('refuses an outcome value this executor could not have written', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('tampered-outcome')
    await startControlledRun({
      plan: straightPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    const tuple = await checkpointer.getTuple(runInvokeConfig(identity))
    if (!tuple) throw new Error('expected a checkpoint')
    tuple.checkpoint.channel_values.outcome = { reason: 'completed', at: 42 }
    await checkpointer.put(runInvokeConfig(identity), tuple.checkpoint, tuple.metadata ?? {}, {})

    await expect(readRunOutcome(checkpointer, identity)).rejects.toThrow(/could not have written/)
  })
})
