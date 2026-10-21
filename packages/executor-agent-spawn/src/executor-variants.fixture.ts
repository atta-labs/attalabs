/**
 * @file executor-variants.fixture.ts
 * @description The two executors every run-guarantee suite runs under: the
 * built-in one, and a caller-injected one that returns only `results`.
 *
 * The run guarantees — halt, resume with no replay, cancellation, decision
 * routing, the revision ceiling, fan-out and join, a failure read as `failed` —
 * are promised whichever executor does a node's work, because they live in the
 * leg wrapper and the graph rather than in the executor. A suite run only with
 * the built-in executor cannot tell a guarantee the wrapper holds from one the
 * built-in executor happens to hold on its own, and that gap is how an injected
 * executor's revision ceiling once never fired. So each suite runs once per
 * variant, with the same assertions.
 *
 * The injected variant is a caller's executor as a caller would write it: it
 * does the node's work through the package's exported node functions, forwards
 * the leg's `signal`, and returns `results` and nothing else — no
 * `revisionCounts`, no `sessions`, no `outcome`. Doing the work through the same
 * `spawnFn` the built-in executor gets is deliberate: every suite's instrument is
 * that spawn log, so the injected variant is measured by exactly the same one.
 * Its results are narrowed the way the built-in executor's are, so a suite's
 * assertions on recorded results read the same under both.
 */

import { startControlledRun as builtInStart, resumeControlledRun as builtInResume } from './run-control'
import type { ResumeControlledRunParams, StartControlledRunParams } from './run-control'
import type { AgentLifecycleNodeExecutor } from './graph-builder'
import { executeMechanicalNode } from './mechanical-executor'
import { executeAgentSpawnNode, type SpawnFn } from './node-executor'
import { narrowPersistedResult } from './reason-text'
import { renderStepPrompt } from './template'
import type { AgentSpawnExecutorConfig, RunOutcome } from './types'

/**
 * A caller's own executor that returns only `results` — the shape that exposed
 * the missing revision count. Agent-spawn steps that `resume` an earlier session
 * are out of its reach on purpose: it records no `sessions`, as a minimal
 * caller's executor would not.
 */
export function resultsOnlyExecutor(config: AgentSpawnExecutorConfig, spawnFn?: SpawnFn): AgentLifecycleNodeExecutor {
  return async (state, { node, plan, signal }) => {
    if (node.kind === 'mechanical') {
      const result = await executeMechanicalNode({ node, config, spawnFn, signal })
      return { results: { [node.id]: narrowPersistedResult(result) } }
    }
    if (node.kind !== 'agent-spawn') throw new Error(`Unsupported node kind '${node.kind}' for node '${node.id}'.`)
    const prompt = renderStepPrompt(node, { question: plan.question, results: state.results })
    const result = await executeAgentSpawnNode({ node, prompt, config, spawnFn, signal })
    return { results: { [node.id]: narrowPersistedResult(result) } }
  }
}

/** One executor a suite runs under: the two control operations, bound to it. */
export interface ExecutorVariant {
  readonly name: string
  /**
   * Whether this executor records `sessions`. A session id is the executor's own
   * output, not a run guarantee — the runtime cannot know one exists — so an
   * assertion about it holds only for an executor that writes one.
   */
  readonly recordsSessions: boolean
  readonly startControlledRun: (params: StartControlledRunParams) => Promise<RunOutcome>
  readonly resumeControlledRun: (params: ResumeControlledRunParams) => Promise<RunOutcome>
}

export const BUILT_IN_EXECUTOR: ExecutorVariant = {
  name: 'built-in executor',
  recordsSessions: true,
  startControlledRun: builtInStart,
  resumeControlledRun: builtInResume
}

export const INJECTED_EXECUTOR: ExecutorVariant = {
  name: 'injected executor returning only results',
  recordsSessions: false,
  startControlledRun: (params) =>
    builtInStart({ ...params, executor: resultsOnlyExecutor(params.config, params.spawnFn) }),
  resumeControlledRun: (params) =>
    builtInResume({ ...params, executor: resultsOnlyExecutor(params.config, params.spawnFn) })
}

/** Every variant a run-guarantee suite runs under, built-in first. */
export const EXECUTOR_VARIANTS: readonly ExecutorVariant[] = [BUILT_IN_EXECUTOR, INJECTED_EXECUTOR]
