/**
 * @file run-conformance.test.ts
 * @description One assertion per normative statement this run-control surface
 * claims to follow, each naming the source it comes from.
 *
 * **Why this file is separate from the suites that already cover the same code.**
 * `run-control.test.ts`, `run-outcome.test.ts` and `run-no-replay.test.ts` test
 * behaviour: does a halt pause, does a resume continue, does a ceiling stop a
 * loop. This file tests *provenance* — that each of those behaviours exists
 * because an external contract says so, and not because this repository invented
 * an orchestration convention and then wrote a test agreeing with it. The two
 * kinds of test fail for different reasons and are worth keeping apart: a
 * behavioural test fails when the code breaks, a conformance assertion fails when
 * the code drifts away from the contract it was modelled on.
 *
 * The sources, quoted in each test rather than summarised:
 *
 * - https://openai.github.io/openai-agents-js/guides/running-agents/ — the
 *   bounded runner: its loop and turn ceiling, its cancellation input, its
 *   resumable run state, its error handlers, and its exception hierarchy.
 * - https://openai.github.io/openai-agents-js/guides/sessions/ — continuing an
 *   interrupted run under the same persistent identity without re-preparing what
 *   already happened.
 * - https://www.anthropic.com/engineering/building-effective-agents — explicit
 *   stopping conditions, pausing at checkpoints, and transparency about what an
 *   agent is doing.
 *
 * Neither source describes a LangGraph executor, so nothing here is a claim of
 * API equivalence. What each assertion pins is the *property* the source makes
 * normative, implemented in this package's own terms.
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanMechanicalNode, PlanStepDecision } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import { readRunOutcome, resumeControlledRun, startControlledRun } from './run-control'
import { createRunControl, RunHaltedError } from './run-halt'
import { createRunIdentity, runIdentityForRunId, runIdentityOf, startRun } from './run-identity'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, RunControl, RunOutcomeReason } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-conformance-root-'))

function spawnLog(exitCodeFor: (command: string) => number = () => 0): { commands: string[]; spawnFn: SpawnFn } {
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

function step(id: string, action: string, decision?: PlanStepDecision): PlanMechanicalNode {
  return { id, role: 'mechanical', kind: 'mechanical', action, ...(decision ? { decision } : {}), metadata: {} }
}

const actions = { 'one-action': { command: 'one' }, 'two-action': { command: 'two' }, 'end-action': { command: 'end' } }

/** `one` → `two` → `end`: enough boundaries for a halt to land between. */
function linePlan(): Plan {
  return {
    schemaVersion: '1.0',
    question: 'Do the work',
    model: 'n/a',
    agents: {},
    teamName: 'agent-lifecycle-conformance',
    maxRevisions: 0,
    graph: {
      nodes: { one: step('one', 'one-action'), two: step('two', 'two-action'), end: step('end', 'end-action') },
      edges: [
        { from: 'one', to: 'two', kind: 'flow' },
        { from: 'two', to: 'end', kind: 'flow' }
      ],
      conditionalEdges: [],
      entryNode: 'one'
    }
  }
}

/** `one` → `two`, with `two` carrying the ceiling that can loop back to `one`. */
function ceilingPlan(maxRevisions: number): Plan {
  const decision: PlanStepDecision = { examine: 'one', ifTrue: 'one', ifFalse: 'end', maxRevisions }
  return {
    ...linePlan(),
    graph: {
      nodes: {
        one: step('one', 'one-action'),
        two: step('two', 'two-action', decision),
        end: step('end', 'end-action')
      },
      edges: [{ from: 'one', to: 'two', kind: 'flow' }],
      conditionalEdges: [],
      entryNode: 'one'
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

describe('conformance: the bounded runner contract (OpenAI Agents SDK, running-agents)', () => {
  it('takes cancellation as an AbortSignal — "signal – AbortSignal for cancellation"', async () => {
    // The source lists `signal` among `run()`'s options with exactly that
    // description, so cancellation here is the same shape rather than a bespoke
    // flag: a caller's existing AbortController drives the halt directly.
    const upstream = new AbortController()
    const control = createRunControl(upstream.signal)
    expect(control.signal).toBeInstanceOf(AbortSignal)

    const log = spawnLog()
    upstream.abort()
    const outcome = await startControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer: new MemorySaver(),
      identity: createRunIdentity('conformance-abort-signal'),
      control,
      spawnFn: log.spawnFn
    })

    expect(outcome.reason).toBe('paused')
    expect(log.commands).toEqual([])
  })

  it('raises an explicit typed non-success on a limit — "Throw MaxTurnsExceededError once maxTurns is reached"', async () => {
    // The source's own loop terminates a ceiling-bound run by throwing, never by
    // returning a final output. The equivalent invariant here is that `exhausted`
    // is its own reason: nothing a caller can read says "it worked", and the two
    // reasons share no field that could be mistaken for one.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('conformance-limit')
    const outcome = await startControlledRun({
      plan: ceilingPlan(1),
      config: config(undefined, { decisionPredicates: { two: () => true } }),
      checkpointer,
      identity,
      spawnFn: spawnLog().spawnFn
    })

    expect(outcome.reason).toBe('exhausted')
    expect(outcome.reason as RunOutcomeReason).not.toBe('completed')
    if (outcome.reason !== 'exhausted') throw new Error('narrowing guard')
    // The ceiling that stopped it is named, not merely signalled.
    expect(outcome.exhaustion.maxRevisions).toBe(1)
    expect(outcome.exhaustion.nodeId).toBe('two')
    // And the step past the loop never ran, so this is not a finished answer.
    expect(outcome.checkpoint.results.end).toBeUndefined()
  })

  it('can return a bounded non-success as a value — "convert supported runtime errors into a final output instead of throwing"', async () => {
    // The source's `errorHandlers` option exists so a caller can branch on a
    // bounded failure rather than catch it. These operations take that shape by
    // default: the leg resolves to a typed outcome, and a caller writes a switch.
    const control = createRunControl()
    const settled = await startControlledRun({
      plan: linePlan(),
      config: config(haltAfter('one', control)),
      checkpointer: new MemorySaver(),
      identity: createRunIdentity('conformance-value-not-throw'),
      control,
      spawnFn: spawnLog().spawnFn
    })
    expect(settled.reason).toBe('paused')

    // The raw substrate entry point still throws, which is what makes the typed
    // surface a deliberate choice rather than the only behaviour available.
    const rawControl = createRunControl()
    rawControl.halt()
    await expect(
      startRun({
        plan: linePlan(),
        config: config(),
        checkpointer: new MemorySaver(),
        identity: createRunIdentity('conformance-raw-throws'),
        control: rawControl,
        spawnFn: spawnLog().spawnFn
      })
    ).rejects.toBeInstanceOf(RunHaltedError)
  })

  it('takes saved run state as the input to a continued run — "or a RunState object in case you are building a human-in-the-loop agent"', async () => {
    // The source makes resumable state an *input* to the run rather than
    // something reconstructed from a transcript. Here the saved state is the
    // thread itself: resuming passes `null` as input and continues the pending
    // tasks, so the input a resumed leg carries is the checkpoint, not a prompt
    // history rebuilt from `results`.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('conformance-run-state-input')
    const control = createRunControl()

    const paused = await startControlledRun({
      plan: linePlan(),
      config: config(haltAfter('one', control)),
      checkpointer,
      identity,
      control,
      spawnFn: spawnLog().spawnFn
    })
    if (paused.reason !== 'paused') throw new Error('expected a paused run')

    const resumedLeg = spawnLog()
    const resumed = await resumeControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: resumedLeg.spawnFn
    })

    expect(resumed.reason).toBe('completed')
    expect(resumed.resumedFrom).toBeDefined()
    // Continued from the pending node, not re-entered at the Plan's entry node.
    expect(resumedLeg.commands[0]).toBe('two')
  })

  it('keeps a non-success reachable to the run it came from — "All extend the base AgentsError class, which could provide the state property"', async () => {
    // The source's exceptions carry a handle back to the run's own state. Two
    // equivalents hold here: the thrown error carries the identity, and the typed
    // outcome carries the recorded state — so a run that did not succeed is never
    // a dead end.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('conformance-error-state')

    let thrown: unknown
    try {
      await startRun({
        plan: linePlan(),
        config: config(),
        checkpointer,
        identity,
        spawnFn: spawnLog((command) => (command === 'two' ? 1 : 0)).spawnFn
      })
    } catch (error) {
      thrown = error
    }
    expect(runIdentityOf(thrown)).toEqual(identity)

    const outcome = await startControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer,
      identity: createRunIdentity('conformance-error-state-typed'),
      spawnFn: spawnLog((command) => (command === 'two' ? 1 : 0)).spawnFn
    })
    expect(outcome.reason).toBe('failed')
    if (outcome.reason !== 'failed') throw new Error('narrowing guard')
    expect(Object.keys(outcome.checkpoint?.results ?? {})).toEqual(['one'])
  })
})

describe('conformance: continuing interrupted state (OpenAI Agents SDK, sessions)', () => {
  it('resumes under the same identity — "keep passing the same session"', async () => {
    // The source's rule for a resumed run is that the persistent memory it runs
    // against is the same instance, not a new one seeded from history. The
    // equivalent invariant here is the identity contract: a resume runs on the
    // thread the `runId` derives, and an identity built from the bare `runId` in
    // a fresh process resolves that same thread.
    const checkpointer = new MemorySaver()
    const control = createRunControl()

    const paused = await startControlledRun({
      plan: linePlan(),
      config: config(haltAfter('one', control)),
      checkpointer,
      identity: createRunIdentity('conformance-same-session'),
      control,
      spawnFn: spawnLog().spawnFn
    })
    if (paused.reason !== 'paused') throw new Error('expected a paused run')

    const rebuilt = runIdentityForRunId('conformance-same-session')
    expect(rebuilt).toEqual(paused.identity)

    const resumed = await resumeControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer,
      identity: rebuilt,
      spawnFn: spawnLog().spawnFn
    })
    expect(resumed.identity).toEqual(paused.identity)
    expect(resumed.reason).toBe('completed')
  })

  it('adds the resumed turn without re-preparing the input — "without re-preparing the input"', async () => {
    // The sharpest reading of the source's sentence, in this package's terms: a
    // resumed leg performs the work still owed and nothing that was already
    // done. Spawns per leg are the only instrument that can see the difference.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('conformance-no-reprepare')
    const control = createRunControl()

    const firstLeg = spawnLog()
    await startControlledRun({
      plan: linePlan(),
      config: config(haltAfter('two', control)),
      checkpointer,
      identity,
      control,
      spawnFn: firstLeg.spawnFn
    })
    expect(firstLeg.commands).toEqual(['one', 'two'])

    const secondLeg = spawnLog()
    await resumeControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: secondLeg.spawnFn
    })

    expect(secondLeg.commands).toEqual(['end'])
    expect(secondLeg.commands).not.toContain('one')
    expect(secondLeg.commands).not.toContain('two')
  })
})

describe('conformance: stopping conditions and transparency (Anthropic, building effective agents)', () => {
  it('bounds the loop with an explicit stopping condition — "a maximum number of iterations to maintain control"', async () => {
    // The source names a maximum iteration count as the ordinary way to keep an
    // agentic loop under control. Here that is the decision's `maxRevisions`,
    // and the property worth pinning is that it binds on *whichever* branch
    // routing resolves to: the Plan validator only requires `ifTrue` to point
    // backwards, so an unbounded `ifFalse` would leave a real loop uncontrolled.
    const checkpointer = new MemorySaver()
    const backward: PlanStepDecision = { examine: 'one', ifTrue: 'end', ifFalse: 'one', maxRevisions: 2 }
    const plan: Plan = {
      ...ceilingPlan(2),
      graph: {
        ...ceilingPlan(2).graph,
        nodes: { ...ceilingPlan(2).graph.nodes, two: step('two', 'two-action', backward) }
      }
    }

    const outcome = await startControlledRun({
      plan,
      config: config(undefined, { decisionPredicates: { two: () => false } }),
      checkpointer,
      identity: createRunIdentity('conformance-stopping-condition'),
      spawnFn: spawnLog().spawnFn
    })

    expect(outcome.reason).toBe('exhausted')
    if (outcome.reason !== 'exhausted') throw new Error('narrowing guard')
    expect(outcome.exhaustion.target).toBe('one')
    expect(outcome.exhaustion.revisions).toBe(3)
  })

  it('pauses at a checkpoint rather than mid-action — "pause for human feedback at checkpoints or when encountering blockers"', async () => {
    // The source's pause is a place the agent stops to let a human weigh in, so
    // it has to be a point the run can be picked up from. Here the checkpoint is
    // literal: the halt lands on a node boundary, the completed node's result is
    // durable, and the node that did not start is what a resume runs first.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('conformance-checkpoint-pause')
    const control = createRunControl()
    const events: AgentLifecycleEvent[] = []

    const outcome = await startControlledRun({
      plan: linePlan(),
      config: config((event) => {
        events.push(event)
        if (event.type === 'node:complete' && event.nodeId === 'one') control.halt('waiting on a human')
      }),
      checkpointer,
      identity,
      control,
      spawnFn: spawnLog().spawnFn
    })

    expect(outcome.reason).toBe('paused')
    if (outcome.reason !== 'paused') throw new Error('narrowing guard')
    expect(outcome.pendingNodes).toEqual(['two'])
    expect(outcome.haltReason).toBe('waiting on a human')
    // The paused node truly did not start: no event of any kind mentions it.
    expect(events.some((event) => event.nodeId === 'two')).toBe(false)
    // And the completed one is durable, so the pause cost no work.
    expect(Object.keys(outcome.checkpoint?.results ?? {})).toEqual(['one'])
  })

  it('makes each reason observable rather than internal — "prioritize transparency by explicitly showing the agent\'s planning steps"', async () => {
    // The source's transparency is about what an outside reader can see. The
    // equivalent invariant here is that every reason in the vocabulary is
    // readable from the store and the run id alone — not only by whoever
    // happened to hold the operation's return value.
    const identity = (runId: string) => createRunIdentity(runId)
    const observed: Partial<Record<RunOutcomeReason, boolean>> = {}

    const completedStore = new MemorySaver()
    const completedId = identity('conformance-observable-completed')
    await startControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer: completedStore,
      identity: completedId,
      spawnFn: spawnLog().spawnFn
    })
    observed.completed =
      (await readRunOutcome(completedStore, runIdentityForRunId(completedId.runId)))?.reason === 'completed'

    const pausedStore = new MemorySaver()
    const pausedId = identity('conformance-observable-paused')
    const control = createRunControl()
    await startControlledRun({
      plan: linePlan(),
      config: config(haltAfter('one', control)),
      checkpointer: pausedStore,
      identity: pausedId,
      control,
      spawnFn: spawnLog().spawnFn
    })
    observed.paused = (await readRunOutcome(pausedStore, runIdentityForRunId(pausedId.runId)))?.reason === 'paused'

    const failedStore = new MemorySaver()
    const failedId = identity('conformance-observable-failed')
    await startControlledRun({
      plan: linePlan(),
      config: config(),
      checkpointer: failedStore,
      identity: failedId,
      spawnFn: spawnLog((command) => (command === 'two' ? 1 : 0)).spawnFn
    })
    observed.failed = (await readRunOutcome(failedStore, runIdentityForRunId(failedId.runId)))?.reason === 'failed'

    const exhaustedStore = new MemorySaver()
    const exhaustedId = identity('conformance-observable-exhausted')
    await startControlledRun({
      plan: ceilingPlan(1),
      config: config(undefined, { decisionPredicates: { two: () => true } }),
      checkpointer: exhaustedStore,
      identity: exhaustedId,
      spawnFn: spawnLog().spawnFn
    })
    observed.exhausted =
      (await readRunOutcome(exhaustedStore, runIdentityForRunId(exhaustedId.runId)))?.reason === 'exhausted'

    expect(observed).toEqual({ completed: true, paused: true, failed: true, exhausted: true })
  })

  it('records a resumed continuation too, so the fifth reason is observable as well', async () => {
    // `resumed` completes the vocabulary: without it, a run someone has already
    // come back to is indistinguishable in the store from one nobody did.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('conformance-observable-resumed')
    const control = createRunControl()

    await startControlledRun({
      plan: linePlan(),
      config: config(haltAfter('one', control)),
      checkpointer,
      identity,
      control,
      spawnFn: spawnLog().spawnFn
    })

    const second = createRunControl()
    await resumeControlledRun({
      plan: linePlan(),
      config: config(haltAfter('two', second)),
      checkpointer,
      identity,
      control: second,
      spawnFn: spawnLog().spawnFn
    })

    // The leg wrote its own `resumed` marker from inside the graph, naming the
    // checkpoint it continued from.
    const tuple = await checkpointer.getTuple({ configurable: { thread_id: identity.threadId } })
    expect(tuple?.checkpoint.channel_values.outcome).toMatchObject({ reason: 'resumed' })
  })
})
