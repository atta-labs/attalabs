import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import { resumeControlledRun, startControlledRun } from './run-control'
import { createRunControl, runHaltOf, RunHaltedError } from './run-halt'
import { createRunIdentity, readRunCheckpoint, runIdentityForRunId, startRun } from './run-identity'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, RunControl } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-control-root-'))

/** Records every spawn by command, so a test can prove a node did or did not run again. */
interface SpawnLog {
  readonly commands: string[]
  readonly spawnFn: SpawnFn
}

/**
 * A fake spawn that records each command it was asked to run and closes with
 * `exitCode`. The recorded list is the no-replay proof's only instrument: a
 * completed node that ran twice appears twice here, whatever the graph state
 * says afterwards.
 */
function recordingSpawn(exitCodeFor: (command: string) => number = () => 0): SpawnLog {
  const commands: string[] = []
  const spawnFn: SpawnFn = (command) => {
    commands.push(command)
    const stdoutListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const spawned: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      for (const listener of stdoutListeners) {
        listener(`{"type":"result","session_id":"session-from-${command}"}\n`)
      }
      for (const listener of closeListeners) listener(exitCodeFor(command))
    })
    return spawned
  }
  return { commands, spawnFn }
}

/** Three agent-spawn steps in a line: the shape a halt can land between. */
function threeStepPlan(): Plan {
  const step = (id: string, role: string) => ({
    id,
    role: 'agent-spawn' as const,
    kind: 'agent-spawn' as const,
    promptTemplate: `${id}: {{question}}`,
    agentRole: role,
    permission: 'default',
    workingDirectory: workingDirectoryRoot,
    maxTurns: 5,
    metadata: {}
  })
  return {
    schemaVersion: '1.0',
    question: 'Ship the feature',
    model: 'n/a',
    agents: {},
    teamName: 'agent-lifecycle-control-test',
    maxRevisions: 0,
    graph: {
      nodes: {
        implement: step('implement', 'coder'),
        review: step('review', 'reviewer'),
        land: step('land', 'lander')
      },
      edges: [
        { from: 'implement', to: 'review', kind: 'flow' },
        { from: 'review', to: 'land', kind: 'flow' }
      ],
      conditionalEdges: [],
      entryNode: 'implement'
    }
  }
}

function executorConfig(onEvent?: (event: AgentLifecycleEvent) => void): AgentSpawnExecutorConfig {
  return {
    workingDirectoryRoot,
    onEvent,
    roleBinaries: {
      coder: { command: 'fake-coder', allowedPermissions: ['default'], buildArgs: () => ['-p'] },
      reviewer: { command: 'fake-reviewer', allowedPermissions: ['default'], buildArgs: () => ['-p'] },
      lander: { command: 'fake-lander', allowedPermissions: ['default'], buildArgs: () => ['-p'] }
    }
  }
}

/** Halts the run the moment the named node reports completion — a deterministic mid-run halt. */
function haltAfter(nodeId: string, control: RunControl, reason?: string): (event: AgentLifecycleEvent) => void {
  return (event) => {
    if (event.type === 'node:complete' && event.nodeId === nodeId) control.halt(reason)
  }
}

describe('createRunControl — the halt handle', () => {
  it('starts un-halted and reports the reason the first halt carried', () => {
    const control = createRunControl()
    expect(control.halted).toBe(false)
    expect(control.signal.aborted).toBe(false)
    expect(control.haltReason).toBeUndefined()

    control.halt('operator asked for a pause')

    expect(control.halted).toBe(true)
    expect(control.signal.aborted).toBe(true)
    expect(control.haltReason).toBe('operator asked for a pause')
  })

  it('keeps the first reason on a second halt — the reason that actually stopped the run', () => {
    const control = createRunControl()
    control.halt('first')
    control.halt('second')
    expect(control.haltReason).toBe('first')
  })

  it("links an upstream AbortSignal one way: aborting it halts the run, halting the run doesn't abort it", () => {
    const upstream = new AbortController()
    const control = createRunControl(upstream.signal)
    expect(control.halted).toBe(false)

    upstream.abort()
    expect(control.halted).toBe(true)
    expect(control.haltReason).toMatch(/upstream AbortSignal/)

    const other = new AbortController()
    const second = createRunControl(other.signal)
    second.halt('local')
    expect(other.signal.aborted).toBe(false)
  })

  it('halts immediately when handed an already-aborted upstream signal', () => {
    const upstream = new AbortController()
    upstream.abort()
    const control = createRunControl(upstream.signal)
    expect(control.halted).toBe(true)
  })

  it('recognises its own halt error through a wrapping cause chain, and nothing else', () => {
    const halt = new RunHaltedError('review', 'operator')
    expect(runHaltOf(halt)).toBe(halt)
    expect(runHaltOf(new Error('wrapped', { cause: halt }))).toBe(halt)
    expect(runHaltOf(new Error('exited with code 1'))).toBeUndefined()
    expect(runHaltOf('not an error')).toBeUndefined()

    // A self-referential cause must not spin the walk.
    const loop = new Error('loop') as Error & { cause?: unknown }
    loop.cause = loop
    expect(runHaltOf(loop)).toBeUndefined()
  })
})

describe('startControlledRun — a typed outcome instead of resolve-or-throw', () => {
  it('reports a completed run with the state its own checkpointer holds', async () => {
    const checkpointer = new MemorySaver()
    const log = recordingSpawn()
    const outcome = await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity: createRunIdentity('completed-run'),
      spawnFn: log.spawnFn
    })

    expect(outcome.reason).toBe('completed')
    if (outcome.reason !== 'completed') throw new Error('narrowing guard')
    expect(Object.keys(outcome.checkpoint.results).sort()).toEqual(['implement', 'land', 'review'])
    expect(outcome.resumedFrom).toBeUndefined()
    expect(log.commands).toEqual(['fake-coder', 'fake-reviewer', 'fake-lander'])
  })

  it('reports a halt before the entry node as paused, with nothing spawned at all', async () => {
    const checkpointer = new MemorySaver()
    const log = recordingSpawn()
    const control = createRunControl()
    control.halt('halted before it began')

    const outcome = await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity: createRunIdentity('halted-at-entry'),
      control,
      spawnFn: log.spawnFn
    })

    expect(outcome.reason).toBe('paused')
    if (outcome.reason !== 'paused') throw new Error('narrowing guard')
    expect(outcome.pendingNodes).toEqual(['implement'])
    expect(outcome.haltReason).toBe('halted before it began')
    expect(log.commands).toEqual([])
  })

  it('reports a mid-run halt as paused at the next node, keeping the completed node recorded', async () => {
    const checkpointer = new MemorySaver()
    const log = recordingSpawn()
    const control = createRunControl()
    const identity = createRunIdentity('halted-mid-run')

    const outcome = await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(haltAfter('implement', control, 'operator paused after implement')),
      checkpointer,
      identity,
      control,
      spawnFn: log.spawnFn
    })

    expect(outcome.reason).toBe('paused')
    if (outcome.reason !== 'paused') throw new Error('narrowing guard')
    expect(outcome.pendingNodes).toEqual(['review'])
    expect(outcome.haltReason).toBe('operator paused after implement')
    // The halted node never started; the completed one is durable.
    expect(log.commands).toEqual(['fake-coder'])
    expect(Object.keys(outcome.checkpoint?.results ?? {})).toEqual(['implement'])
    expect(outcome.checkpoint?.sessions.implement).toBe('session-from-fake-coder')
  })

  it('never emits a lifecycle event for the node a halt stopped — it did not start', async () => {
    const checkpointer = new MemorySaver()
    const log = recordingSpawn()
    const control = createRunControl()
    const events: AgentLifecycleEvent[] = []

    await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig((event) => {
        events.push(event)
        if (event.type === 'node:complete' && event.nodeId === 'implement') control.halt()
      }),
      checkpointer,
      identity: createRunIdentity('halt-emits-nothing'),
      control,
      spawnFn: log.spawnFn
    })

    expect(events.some((event) => event.nodeId === 'review')).toBe(false)
  })

  it('reports a broken node as failed, distinct from a halt, with its own message', async () => {
    const checkpointer = new MemorySaver()
    const log = recordingSpawn((command) => (command === 'fake-reviewer' ? 1 : 0))

    const outcome = await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity: createRunIdentity('failed-run'),
      spawnFn: log.spawnFn
    })

    expect(outcome.reason).toBe('failed')
    if (outcome.reason !== 'failed') throw new Error('narrowing guard')
    expect(outcome.error).toMatch(/exited with code 1/)
    expect(outcome.pendingNodes).toEqual(['review'])
    expect(Object.keys(outcome.checkpoint?.results ?? {})).toEqual(['implement'])
  })

  it('surfaces the minted identity before anything runs, even for a leg that pauses', async () => {
    const checkpointer = new MemorySaver()
    const control = createRunControl()
    control.halt()
    const seen: string[] = []

    const outcome = await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      control,
      onIdentity: (identity) => seen.push(identity.runId),
      spawnFn: recordingSpawn().spawnFn
    })

    expect(seen).toHaveLength(1)
    expect(outcome.identity.runId).toBe(seen[0])
  })

  it('refuses a thread that already holds a checkpoint rather than restarting it', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('already-started')
    await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    await expect(
      startControlledRun({
        plan: threeStepPlan(),
        config: executorConfig(),
        checkpointer,
        identity,
        spawnFn: recordingSpawn().spawnFn
      })
    ).rejects.toThrow(/already has a checkpoint/)
  })

  it('refuses a hand-assembled identity whose thread is not the one its run id derives', async () => {
    const checkpointer = new MemorySaver()
    await expect(
      startControlledRun({
        plan: threeStepPlan(),
        config: executorConfig(),
        checkpointer,
        identity: { runId: 'mismatched', threadId: 'agent-spawn-run:something-else' },
        spawnFn: recordingSpawn().spawnFn
      })
    ).rejects.toThrow(/identity is inconsistent/)
  })
})

describe('resumeControlledRun — continuing a halted run', () => {
  /** Halts a fresh run after `implement`, returning the identity and the spawn log. */
  async function haltedAfterImplement(checkpointer: MemorySaver, runId: string) {
    const control = createRunControl()
    const log = recordingSpawn()
    const outcome = await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(haltAfter('implement', control)),
      checkpointer,
      identity: createRunIdentity(runId),
      control,
      spawnFn: log.spawnFn
    })
    if (outcome.reason !== 'paused') throw new Error(`expected a paused run, got '${outcome.reason}'`)
    return { identity: outcome.identity, firstLeg: log }
  }

  it('continues to completion and reports the checkpoint it continued from', async () => {
    const checkpointer = new MemorySaver()
    const { identity } = await haltedAfterImplement(checkpointer, 'resume-to-completion')
    const before = await readRunCheckpoint(checkpointer, identity)
    const resumed = recordingSpawn()

    const outcome = await resumeControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity,
      spawnFn: resumed.spawnFn
    })

    expect(outcome.reason).toBe('completed')
    if (outcome.reason !== 'completed') throw new Error('narrowing guard')
    expect(outcome.resumedFrom).toBe(before?.checkpointId)
    expect(Object.keys(outcome.checkpoint.results).sort()).toEqual(['implement', 'land', 'review'])
  })

  it('can be halted again, pausing at the node after the one it just ran', async () => {
    const checkpointer = new MemorySaver()
    const { identity } = await haltedAfterImplement(checkpointer, 'resume-then-halt-again')
    const control = createRunControl()

    const outcome = await resumeControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(haltAfter('review', control, 'paused again')),
      checkpointer,
      identity,
      control,
      spawnFn: recordingSpawn().spawnFn
    })

    expect(outcome.reason).toBe('paused')
    if (outcome.reason !== 'paused') throw new Error('narrowing guard')
    expect(outcome.pendingNodes).toEqual(['land'])
    expect(outcome.haltReason).toBe('paused again')
    expect(outcome.resumedFrom).toBeDefined()
  })

  it('refuses an identity the checkpointer has never seen — a resume never starts a run', async () => {
    await expect(
      resumeControlledRun({
        plan: threeStepPlan(),
        config: executorConfig(),
        checkpointer: new MemorySaver(),
        identity: runIdentityForRunId('never-started'),
        spawnFn: recordingSpawn().spawnFn
      })
    ).rejects.toThrow(/no checkpoint on thread/)
  })

  it('refuses a run that already reached a terminal node — there is nothing pending', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('already-finished')
    await startControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    await expect(
      resumeControlledRun({
        plan: threeStepPlan(),
        config: executorConfig(),
        checkpointer,
        identity,
        spawnFn: recordingSpawn().spawnFn
      })
    ).rejects.toThrow(/no pending nodes/)
  })

  it('refuses a Plan that cannot be the one this run recorded its results under', async () => {
    const checkpointer = new MemorySaver()
    const { identity } = await haltedAfterImplement(checkpointer, 'substituted-plan')

    const substituted = threeStepPlan()
    delete substituted.graph.nodes.implement
    substituted.graph.entryNode = 'review'

    await expect(
      resumeControlledRun({
        plan: substituted,
        config: executorConfig(),
        checkpointer,
        identity,
        spawnFn: recordingSpawn().spawnFn
      })
    ).rejects.toThrow(/does not contain/)
  })

  it('also resumes a run that startRun itself halted — the substrate and the surface agree', async () => {
    const checkpointer = new MemorySaver()
    const control = createRunControl()
    const identity = createRunIdentity('halted-through-startrun')
    const log = recordingSpawn()

    // `startRun` throws on a halt rather than reporting it; the thread it leaves
    // behind is the same one `resumeControlledRun` continues.
    await expect(
      startRun({
        plan: threeStepPlan(),
        config: executorConfig(haltAfter('implement', control)),
        checkpointer,
        identity,
        control,
        spawnFn: log.spawnFn
      })
    ).rejects.toThrow(/Run halted before node 'review'/)

    const outcome = await resumeControlledRun({
      plan: threeStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity,
      spawnFn: recordingSpawn().spawnFn
    })

    expect(outcome.reason).toBe('completed')
  })
})
