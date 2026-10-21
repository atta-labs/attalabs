/**
 * @file review-loop.test.ts
 * @description The fourteen-step review loop (`scripts/external-consumer/review-loop.flow.yaml`)
 * run end to end with a caller-injected executor that returns only `results` —
 * no `revisionCounts`, no `sessions` — and no caller-supplied `recursionLimit`.
 *
 * The two guarantees this shape once broke with an injected executor are the
 * point: the `max_revisions` ceiling ends a run that never converges as
 * `exhausted`, and a run that loops legally is not failed by LangGraph's default
 * recursion limit of 25. Both are the runtime's job, so a minimal executor must
 * get them for free.
 */

import { readFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { compileFlow, loadStepsFlow, type Plan, validateStepsFlow } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import type { AgentLifecycleNodeExecutor } from './graph-builder'
import { planRecursionLimit, resumeControlledRun, startControlledRun } from './run-control'
import { createRunControl, RunHaltedError } from './run-halt'
import { createRunIdentity } from './run-identity'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, StepNodeResult } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-review-loop-root-'))

function reviewLoopPlan(): Plan {
  const yaml = readFileSync(
    join(import.meta.dir, '..', 'scripts', 'external-consumer', 'review-loop.flow.yaml'),
    'utf-8'
  ).replaceAll('__WORKING_DIRECTORY__', workingDirectoryRoot)
  const flow = loadStepsFlow(yaml)
  validateStepsFlow(flow)
  return compileFlow(flow, 'Converge on a reviewed change')
}

/** The order a single green pass runs the Plan's nodes in; the two reviews share one superstep. */
const GREEN_PASS = [
  'prepare-1',
  'prepare-2',
  'prepare-3',
  'work',
  'gate-run',
  'gate',
  'review-setup',
  'review-a',
  'review-b',
  'join-reviews',
  'assess',
  'assess-decision',
  'finalize',
  'final'
]

/**
 * A caller's own executor that returns only `results`. `outputs` scripts what a
 * node reports on each successive visit — `fail` from `gate-run` or `revise` from
 * `assess` sends the run back to `work`; anything else, or no script, is `ok`.
 * `onRun` lets a test act from inside a node.
 */
function resultsOnlyFake(
  outputs: Record<string, string[]> = {},
  onRun?: (nodeId: string, signal: AbortSignal | undefined) => Promise<void> | void
): { readonly calls: string[]; readonly executor: AgentLifecycleNodeExecutor } {
  const calls: string[] = []
  const executor: AgentLifecycleNodeExecutor = async (_state, { node, signal }) => {
    const visit = calls.filter((call) => call === node.id).length
    calls.push(node.id)
    await onRun?.(node.id, signal)
    return {
      results: {
        [node.id]: {
          nodeId: node.id,
          kind: 'mechanical',
          action: 'caller-injected',
          command: 'none',
          exitCode: 0,
          stdout: outputs[node.id]?.[visit] ?? 'ok',
          stderr: '',
          durationMs: 0
        }
      }
    }
  }
  return { calls, executor }
}

const stdoutOf = (result: StepNodeResult): string => (result.kind === 'mechanical' ? result.stdout : '')

function config(onEvent?: (event: AgentLifecycleEvent) => void): AgentSpawnExecutorConfig {
  return {
    workingDirectoryRoot,
    roleBinaries: {},
    mechanicalActions: {},
    decisionPredicates: {
      gate: (result) => stdoutOf(result) === 'fail',
      'assess-decision': (result) => stdoutOf(result) === 'revise'
    },
    ...(onEvent ? { onEvent } : {})
  }
}

const countOf = (calls: readonly string[], nodeId: string) => calls.filter((call) => call === nodeId).length

describe('the fourteen-step review loop — an injected executor returning only results', () => {
  it('compiles to fourteen nodes, two of them decisions looping back to the agent step', () => {
    const plan = reviewLoopPlan()

    expect(Object.keys(plan.graph.nodes).sort()).toEqual([...GREEN_PASS].sort())
    expect(plan.graph.entryNode).toBe('prepare-1')
    const kinds = Object.values(plan.graph.nodes).map((node) => node.kind)
    expect(kinds.filter((kind) => kind === 'agent-spawn')).toHaveLength(4)
    expect(kinds.filter((kind) => kind === 'mechanical')).toHaveLength(10)
    const gate = plan.graph.nodes.gate
    const assessDecision = plan.graph.nodes['assess-decision']
    expect(gate?.kind === 'mechanical' ? gate.decision?.ifTrue : undefined).toBe('work')
    expect(assessDecision?.kind === 'mechanical' ? assessDecision.decision?.ifTrue : undefined).toBe('work')
  })

  it('runs the green path once through and completes', async () => {
    const fake = resultsOnlyFake()
    const outcome = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer: new MemorySaver(),
      executor: fake.executor
    })

    expect(outcome.reason).toBe('completed')
    expect([...fake.calls].sort()).toEqual([...GREEN_PASS].sort())
    expect(fake.calls.indexOf('join-reviews')).toBeGreaterThan(fake.calls.indexOf('review-a'))
    expect(fake.calls.indexOf('join-reviews')).toBeGreaterThan(fake.calls.indexOf('review-b'))
  })

  it('loops back from the gate twice, then completes', async () => {
    const fake = resultsOnlyFake({ 'gate-run': ['fail', 'fail', 'pass'] })
    const outcome = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer: new MemorySaver(),
      executor: fake.executor
    })

    expect(outcome.reason).toBe('completed')
    expect(countOf(fake.calls, 'work')).toBe(3)
    expect(countOf(fake.calls, 'gate')).toBe(3)
    expect(countOf(fake.calls, 'review-a')).toBe(1)
    expect(outcome.checkpoint?.revisionCounts.work).toBe(3)
  })

  it('loops back from the assessment twice, then completes — past the default recursion limit of 25', async () => {
    const fake = resultsOnlyFake({ assess: ['revise', 'revise', 'ok'] })
    const outcome = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer: new MemorySaver(),
      executor: fake.executor
    })

    expect(outcome.reason).toBe('completed')
    expect(countOf(fake.calls, 'work')).toBe(3)
    expect(countOf(fake.calls, 'review-a')).toBe(3)
    expect(countOf(fake.calls, 'join-reviews')).toBe(3)
    expect(countOf(fake.calls, 'final')).toBe(1)
    expect(outcome.checkpoint?.revisionCounts.work).toBe(3)
  })

  it('halts after the agent step and resumes without running any node twice', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity()
    const control = createRunControl()
    const fake = resultsOnlyFake()

    const first = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config((event) => {
        if (event.type === 'node:complete' && event.nodeId === 'work') control.halt('pause after work')
      }),
      checkpointer,
      identity,
      control,
      executor: fake.executor
    })

    expect(first.reason).toBe('paused')
    if (first.reason !== 'paused') throw new Error('narrowing guard')
    expect(first.pendingNodes).toEqual(['gate-run'])
    expect(fake.calls).toEqual(['prepare-1', 'prepare-2', 'prepare-3', 'work'])

    const second = await resumeControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer,
      identity,
      executor: fake.executor
    })

    expect(second.reason).toBe('completed')
    for (const nodeId of GREEN_PASS) expect(countOf(fake.calls, nodeId)).toBe(1)
  })

  it('pauses a run cancelled while a review step runs, and resumes it to completion', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity()
    const control = createRunControl()
    const fake = resultsOnlyFake({}, async (nodeId, signal) => {
      if (nodeId !== 'review-a' || control.halted) return
      if (!signal) throw new Error('the injected executor was given no signal')
      const aborted = new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve()))
      control.halt('cancelled during review')
      await aborted
      throw new RunHaltedError(nodeId, 'cancelled during review', { terminatedProcess: true })
    })

    const first = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer,
      identity,
      control,
      executor: fake.executor
    })

    expect(first.reason).toBe('paused')
    if (first.reason !== 'paused') throw new Error('narrowing guard')
    expect(first.pendingNodes).toContain('review-a')
    expect(fake.calls).not.toContain('join-reviews')

    const second = await resumeControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer,
      identity,
      executor: fake.executor
    })

    expect(second.reason).toBe('completed')
    expect(countOf(fake.calls, 'work')).toBe(1)
    expect(countOf(fake.calls, 'join-reviews')).toBe(1)
    expect(countOf(fake.calls, 'final')).toBe(1)
  })

  it('ends exhausted after max_revisions loop-backs when the gate never passes', async () => {
    const fake = resultsOnlyFake({ 'gate-run': Array.from({ length: 50 }, () => 'fail') })
    const outcome = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer: new MemorySaver(),
      executor: fake.executor
    })

    expect(outcome.reason).toBe('exhausted')
    if (outcome.reason !== 'exhausted') throw new Error('narrowing guard')
    expect(outcome.exhaustion).toEqual({ nodeId: 'gate', target: 'work', maxRevisions: 2, revisions: 3 })
    // The original attempt plus two loop-backs, and never a review.
    expect(countOf(fake.calls, 'work')).toBe(3)
    expect(fake.calls).not.toContain('review-setup')
  })
})

describe('planRecursionLimit — the limit a leg runs under when its caller passed none', () => {
  it('derives nodes × (largest max_revisions + 1) + nodes from the Plan', () => {
    expect(planRecursionLimit(reviewLoopPlan())).toBe(14 * (2 + 1) + 14)
  })

  it('never goes below LangGraph’s default of 25', () => {
    const plan = reviewLoopPlan()
    const small: Plan = {
      ...plan,
      graph: {
        ...plan.graph,
        nodes: { 'prepare-1': plan.graph.nodes['prepare-1'] as Plan['graph']['nodes'][string] },
        edges: [],
        entryNode: 'prepare-1'
      }
    }
    expect(planRecursionLimit(small)).toBe(25)
  })

  it('yields to a caller-supplied recursionLimit — the default 25 fails the same legal loop', async () => {
    const fake = resultsOnlyFake({ assess: ['revise', 'revise', 'ok'] })
    const outcome = await startControlledRun({
      plan: reviewLoopPlan(),
      config: config(),
      checkpointer: new MemorySaver(),
      executor: fake.executor,
      recursionLimit: 25
    })

    expect(outcome.reason).toBe('failed')
    expect(countOf(fake.calls, 'final')).toBe(0)
  })
})
