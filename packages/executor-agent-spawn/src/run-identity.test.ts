import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import {
  createRunIdentity,
  readRunCheckpoint,
  runIdentityForRunId,
  runIdentityOf,
  runInvokeConfig,
  startRun,
  threadIdForRun
} from './run-identity'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, RunIdentity } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-identity-root-'))

/** Minimal fake process: emits the given NDJSON lines, then closes with `exitCode`. */
function fakeSpawn(stdoutLines: string[], exitCode = 0): SpawnFn {
  return () => {
    const stdoutListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const process: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      for (const line of stdoutLines) for (const listener of stdoutListeners) listener(`${line}\n`)
      for (const listener of closeListeners) listener(exitCode)
    })
    return process
  }
}

function twoStepPlan(): Plan {
  return {
    schemaVersion: '1.0',
    question: 'Ship the feature',
    model: 'n/a',
    agents: {},
    teamName: 'agent-lifecycle-identity-test',
    maxRevisions: 0,
    graph: {
      nodes: {
        implement: {
          id: 'implement',
          role: 'agent-spawn',
          kind: 'agent-spawn',
          promptTemplate: 'Implement: {{question}}',
          agentRole: 'coder',
          permission: 'default',
          workingDirectory: workingDirectoryRoot,
          maxTurns: 10,
          metadata: {}
        },
        review: {
          id: 'review',
          role: 'agent-spawn',
          kind: 'agent-spawn',
          promptTemplate: 'Review it.',
          agentRole: 'reviewer',
          permission: 'default',
          workingDirectory: workingDirectoryRoot,
          maxTurns: 5,
          metadata: {}
        }
      },
      edges: [{ from: 'implement', to: 'review', kind: 'flow' }],
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
      reviewer: { command: 'fake-reviewer', allowedPermissions: ['default'], buildArgs: () => ['-p'] }
    }
  }
}

/** `implement` records a session and succeeds; `review` exits non-zero. */
function implementThenFailingReview(): SpawnFn {
  return (command, args, options) => {
    if (command === 'fake-reviewer') return fakeSpawn([], 1)(command, args, options)
    return fakeSpawn(['{"type":"result","session_id":"session-from-implement"}'])(command, args, options)
  }
}

/** A `MemorySaver` that records the thread each `put` was made under. */
class RecordingSaver extends MemorySaver {
  puts: Array<string | undefined> = []

  // Three parameters — see the same override in `graph-builder.test.ts` for
  // why `MemorySaver`'s own narrowing makes a fourth one wrong here.
  override async put(
    config: Parameters<MemorySaver['put']>[0],
    checkpoint: Parameters<MemorySaver['put']>[1],
    metadata: Parameters<MemorySaver['put']>[2]
  ) {
    this.puts.push(config.configurable?.thread_id as string | undefined)
    return super.put(config, checkpoint, metadata)
  }
}

describe('run identity (engine-halt-resume-v1 task 1, O2)', () => {
  it('derives a thread id from a run id, deterministically and namespaced', () => {
    expect(threadIdForRun('abc')).toBe('agent-spawn-run:abc')
    expect(threadIdForRun('abc')).toBe(threadIdForRun('abc'))
    expect(threadIdForRun('abc')).not.toBe(threadIdForRun('abd'))
  })

  it('refuses an empty or whitespace-only run id rather than collapsing every run onto one thread', () => {
    expect(() => threadIdForRun('')).toThrow(/non-empty/)
    expect(() => threadIdForRun('   ')).toThrow(/non-empty/)
    expect(() => createRunIdentity('')).toThrow(/non-empty/)
  })

  it('mints a distinct run id per run, with the thread id derived from it', () => {
    const a = createRunIdentity()
    const b = createRunIdentity()
    expect(a.runId).not.toBe(b.runId)
    expect(a.threadId).toBe(threadIdForRun(a.runId))
    expect(b.threadId).toBe(threadIdForRun(b.runId))
  })

  it('accepts a caller-owned run id rather than forcing a second identifier to map against', () => {
    const identity = createRunIdentity('issue-1075')
    expect(identity.runId).toBe('issue-1075')
    expect(identity.threadId).toBe('agent-spawn-run:issue-1075')
  })

  it('rebuilds the complete identity from a run id alone — the process-restart path', () => {
    const original = createRunIdentity()
    // Nothing carried across but the run id string, as a restarted process
    // would have it: no object reference, no thread id, no stored mapping.
    const rebuilt = runIdentityForRunId(JSON.parse(JSON.stringify(original.runId)))
    expect(rebuilt).toEqual(original)
  })

  it('writes the thread id into the invocation config and nothing else by default', () => {
    const identity = createRunIdentity('r1')
    expect(runInvokeConfig(identity)).toEqual({ configurable: { thread_id: 'agent-spawn-run:r1' } })
    expect(runInvokeConfig(identity, 150)).toEqual({
      configurable: { thread_id: 'agent-spawn-run:r1' },
      recursionLimit: 150
    })
  })
})

describe('startRun (engine-halt-resume-v1 task 1, O2)', () => {
  it('mints an identity, returns it, and keys every checkpoint write of the run to it', async () => {
    const checkpointer = new RecordingSaver()
    const { identity, state } = await startRun({
      plan: twoStepPlan(),
      config: executorConfig(),
      checkpointer,
      spawnFn: fakeSpawn(['{"type":"result","session_id":"session-from-implement"}'])
    })

    expect(identity.runId).not.toBe('')
    expect(identity.threadId).toBe(threadIdForRun(identity.runId))

    // The identity reached the graph state (so every emitted event carries it)
    // and every single checkpoint write went to its one thread.
    expect(state.runId).toBe(identity.runId)
    expect(checkpointer.puts.length).toBeGreaterThan(0)
    expect(checkpointer.puts.every((threadId) => threadId === identity.threadId)).toBe(true)
  })

  it('runs under a caller-supplied identity instead of minting one', async () => {
    const checkpointer = new RecordingSaver()
    const supplied = createRunIdentity('run-supplied')
    const events: AgentLifecycleEvent[] = []

    const { identity, state } = await startRun({
      plan: twoStepPlan(),
      config: executorConfig((event) => events.push(event)),
      checkpointer,
      identity: supplied,
      spawnFn: fakeSpawn(['{"type":"result"}'])
    })

    expect(identity).toEqual(supplied)
    expect(state.runId).toBe('run-supplied')
    // One identity, used consistently by both halves: the event correlation id
    // and the checkpoint thread key.
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((event) => event.runId === 'run-supplied')).toBe(true)
    expect(checkpointer.puts.every((threadId) => threadId === 'agent-spawn-run:run-supplied')).toBe(true)
  })
})

describe('readRunCheckpoint (engine-halt-resume-v1 task 1, O3)', () => {
  it('reads a completed run state back from the checkpointer and the identity alone', async () => {
    const checkpointer = new MemorySaver()
    const { identity, state } = await startRun({
      plan: twoStepPlan(),
      config: executorConfig(),
      checkpointer,
      spawnFn: fakeSpawn(['{"type":"result","session_id":"session-from-implement"}'])
    })

    const read = await readRunCheckpoint(checkpointer, identity)
    expect(read).toBeDefined()
    expect(read?.identity).toEqual(identity)
    expect(read?.checkpointId).not.toBe('')
    expect(read?.checkpointedAt).not.toBe('')
    expect(read?.sessions).toEqual(state.sessions)
    expect(read?.revisionCounts).toEqual(state.revisionCounts)
    expect(Object.keys(read?.results ?? {}).sort()).toEqual(['implement', 'review'])
  })

  it('reads a suspended run state — the run never completed, and no replay is needed', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('run-suspended')

    // `implement` completes and checkpoints; `review` then fails, so the run
    // stops partway through. Its persisted state is what a caller has to be
    // able to inspect afterwards.
    await expect(
      startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        identity,
        spawnFn: implementThenFailingReview()
      })
    ).rejects.toThrow(/exited with code 1/)

    // Only the checkpointer and the run id survive the failure — the identity
    // is rebuilt from the id, exactly as a separate process would have to.
    const read = await readRunCheckpoint(checkpointer, runIdentityForRunId('run-suspended'))
    expect(read).toBeDefined()
    expect(read?.sessions.implement).toBe('session-from-implement')
    expect(read?.revisionCounts.implement).toBe(1)
    expect(read?.results.implement?.kind).toBe('agent-spawn')
    // The node that never succeeded recorded nothing — a missing result, never
    // a result that could read as a pass.
    expect(read?.results.review).toBeUndefined()
    expect(read?.revisionCounts.review).toBeUndefined()
  })

  it('returns undefined for an identity the checkpointer has never seen', async () => {
    const checkpointer = new MemorySaver()
    expect(await readRunCheckpoint(checkpointer, createRunIdentity('never-run'))).toBeUndefined()
  })

  it('refuses a checkpoint on this thread that records a different run id', async () => {
    // The identity handed in is properly derived — a mismatched pair is refused
    // earlier, by the derivation assert. What this guards is the remaining
    // case: a thread whose checkpoint was written by something else under a
    // colliding key, so the stored runId is not the one being asked for.
    // Simulated by rewriting the stored runId between write and read.
    class ForeignRunIdSaver extends MemorySaver {
      override async getTuple(config: Parameters<MemorySaver['getTuple']>[0]) {
        const tuple = await super.getTuple(config)
        if (tuple) (tuple.checkpoint.channel_values as Record<string, unknown>).runId = 'run-someone-else'
        return tuple
      }
    }

    const checkpointer = new ForeignRunIdSaver()
    const identity = createRunIdentity('run-real')
    await startRun({
      plan: twoStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity,
      spawnFn: fakeSpawn(['{"type":"result"}'])
    })

    await expect(readRunCheckpoint(checkpointer, identity)).rejects.toThrow(
      /records runId 'run-someone-else', not 'run-real'/
    )
  })
  it('keeps two concurrent runs on separate threads, with neither seeing the other state', async () => {
    const checkpointer = new MemorySaver()
    const [first, second] = await Promise.all([
      startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        spawnFn: fakeSpawn(['{"type":"result","session_id":"session-a"}'])
      }),
      startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        spawnFn: fakeSpawn(['{"type":"result","session_id":"session-b"}'])
      })
    ])

    expect(first.identity.runId).not.toBe(second.identity.runId)
    const firstState = await readRunCheckpoint(checkpointer, first.identity)
    const secondState = await readRunCheckpoint(checkpointer, second.identity)
    expect(firstState?.sessions.implement).toBe('session-a')
    expect(secondState?.sessions.implement).toBe('session-b')
  })
})

describe('run identity hardening (round 2 review)', () => {
  it('refuses a run id whose characters or length could reshape the checkpoint key', () => {
    expect(() => threadIdForRun('../escape')).toThrow(/only letters, digits/)
    expect(() => threadIdForRun('with space')).toThrow(/only letters, digits/)
    expect(() => threadIdForRun('has:colon')).toThrow(/only letters, digits/)
    expect(() => threadIdForRun('line\nbreak')).toThrow(/only letters, digits/)
    expect(() => threadIdForRun('a'.repeat(129))).toThrow(/at most/)
    // The ids real callers use stay accepted.
    expect(threadIdForRun('a'.repeat(128))).toBe(`agent-spawn-run:${'a'.repeat(128)}`)
    expect(() => createRunIdentity('issue-1075')).not.toThrow()
    expect(() => createRunIdentity('dispatch_42.3')).not.toThrow()
  })

  it('refuses a hand-assembled identity whose thread id is not derived from its run id', async () => {
    const checkpointer = new MemorySaver()
    const mismatched = { runId: 'run-a', threadId: threadIdForRun('run-b') }

    await expect(
      startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        identity: mismatched,
        spawnFn: fakeSpawn(['{"type":"result"}'])
      })
    ).rejects.toThrow(/identity is inconsistent/)
    await expect(readRunCheckpoint(checkpointer, mismatched)).rejects.toThrow(/identity is inconsistent/)

    // Nothing was written: a mismatched identity never reaches a thread at all,
    // so the run whose thread it named is untouched.
    expect(await readRunCheckpoint(checkpointer, runIdentityForRunId('run-b'))).toBeUndefined()
  })

  it('re-derivation also closes the bypass of the run-id guards themselves', async () => {
    const checkpointer = new MemorySaver()
    // Never passed through threadIdForRun, so the empty-id refusal would not
    // otherwise apply to it.
    const smuggled = { runId: '', threadId: 'agent-spawn-run:' }
    await expect(readRunCheckpoint(checkpointer, smuggled)).rejects.toThrow(/non-empty/)
  })
})

describe('startRun identity recovery and re-entry (round 2 review)', () => {
  it('reports the minted identity before invoking, so a failing run is still reachable', async () => {
    const checkpointer = new MemorySaver()
    const reported: RunIdentity[] = []

    await expect(
      startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        onIdentity: (identity) => reported.push(identity),
        spawnFn: implementThenFailingReview()
      })
    ).rejects.toThrow(/exited with code 1/)

    // The identity was never returned — the call rejected — but the callback
    // holds it, and the checkpoints written before the failure are readable.
    expect(reported).toHaveLength(1)
    const identity = reported[0]
    if (!identity) throw new Error('unreachable')
    const read = await readRunCheckpoint(checkpointer, identity)
    expect(read?.sessions.implement).toBe('session-from-implement')
  })

  it('attaches the identity to the thrown error, recoverable with runIdentityOf', async () => {
    const checkpointer = new MemorySaver()
    let caught: unknown
    try {
      await startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        spawnFn: implementThenFailingReview()
      })
    } catch (err) {
      caught = err
    }

    const identity = runIdentityOf(caught)
    expect(identity).toBeDefined()
    if (!identity) throw new Error('unreachable')
    expect(identity.threadId).toBe(threadIdForRun(identity.runId))
    const read = await readRunCheckpoint(checkpointer, identity)
    expect(read?.results.implement?.kind).toBe('agent-spawn')
    expect(runIdentityOf(new Error('not ours'))).toBeUndefined()
    expect(runIdentityOf('not even an error')).toBeUndefined()
  })

  it('refuses a second run on a thread that already holds a checkpoint, spawning nothing', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('run-reused')
    const first = await startRun({
      plan: twoStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity,
      spawnFn: fakeSpawn(['{"type":"result","session_id":"session-first"}'])
    })

    let secondAttemptSpawns = 0
    const countingSpawn: SpawnFn = (command, args, options) => {
      secondAttemptSpawns += 1
      return fakeSpawn(['{"type":"result","session_id":"session-second"}'])(command, args, options)
    }

    await expect(
      startRun({
        plan: twoStepPlan(),
        config: executorConfig(),
        checkpointer,
        identity,
        spawnFn: countingSpawn
      })
    ).rejects.toThrow(/already has a checkpoint/)

    // No subprocess was launched, and the first attempt's state is intact —
    // not blended with a partial second one.
    expect(secondAttemptSpawns).toBe(0)
    const read = await readRunCheckpoint(checkpointer, identity)
    expect(read?.sessions.implement).toBe('session-first')
    expect(read?.revisionCounts.implement).toBe(1)
    expect(read?.revisionCounts).toEqual(first.state.revisionCounts)
  })
})

describe('readRunCheckpoint entry validation (round 2 review)', () => {
  /** A saver whose stored channel values can be corrupted between write and read. */
  class TamperableSaver extends MemorySaver {
    tamper?: (values: Record<string, unknown>) => void

    override async getTuple(config: Parameters<MemorySaver['getTuple']>[0]) {
      const tuple = await super.getTuple(config)
      if (tuple && this.tamper) this.tamper(tuple.checkpoint.channel_values as Record<string, unknown>)
      return tuple
    }
  }

  async function checkpointedRun(checkpointer: TamperableSaver): Promise<RunIdentity> {
    const { identity } = await startRun({
      plan: twoStepPlan(),
      config: executorConfig(),
      checkpointer,
      identity: createRunIdentity('run-tamper'),
      spawnFn: fakeSpawn(['{"type":"result","session_id":"session-from-implement"}'])
    })
    return identity
  }

  it('refuses a fabricated results entry rather than narrowing it into this run state', async () => {
    const checkpointer = new TamperableSaver()
    const identity = await checkpointedRun(checkpointer)

    checkpointer.tamper = (values) => {
      const results = values.results as Record<string, unknown>
      results.injected = { kind: 'agent-spawn', exitCode: 0 }
    }
    await expect(readRunCheckpoint(checkpointer, identity)).rejects.toThrow(
      /Checkpointed 'results' entry 'injected' is not a valid results value/
    )
  })

  it('refuses a non-string session id and a non-integer revision count', async () => {
    const checkpointer = new TamperableSaver()
    const identity = await checkpointedRun(checkpointer)

    checkpointer.tamper = (values) => {
      const sessions = values.sessions as Record<string, unknown>
      sessions.implement = { notASessionId: true }
    }
    await expect(readRunCheckpoint(checkpointer, identity)).rejects.toThrow(/'sessions' entry 'implement'/)

    checkpointer.tamper = (values) => {
      const counts = values.revisionCounts as Record<string, unknown>
      counts.implement = -1
    }
    await expect(readRunCheckpoint(checkpointer, identity)).rejects.toThrow(/'revisionCounts' entry 'implement'/)
  })

  it('still reads an untampered checkpoint, so validation is not refusing real state', async () => {
    const checkpointer = new TamperableSaver()
    const identity = await checkpointedRun(checkpointer)
    const read = await readRunCheckpoint(checkpointer, identity)
    expect(read?.sessions.implement).toBe('session-from-implement')
    expect(read?.results.implement?.kind).toBe('agent-spawn')
  })
})
