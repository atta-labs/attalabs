/**
 * @atta/executor-agent-spawn
 *
 * Runs an agent-lifecycle Plan (compiled by `@atta/engine` from a
 * steps-shaped Flow): its agent steps by spawning external agent processes,
 * its mechanical steps by running a configured command with no model turn. A sibling to
 * `packages/adapter-langgraph`, not an extension of it — see
 * `.claude/skills/atta-adapter-langgraph/SKILL.md` for the executor split.
 */

export { AgentSpawnGraphState } from './graph-state'
export type { AgentSpawnGraphStateValue } from './graph-state'
export { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
export type {
  AgentLifecycleLegOptions,
  AgentLifecycleNodeExecutor,
  AgentSpawnGraphCompileOptions,
  NodeExecutionContext
} from './graph-builder'
export { executeMechanicalNode } from './mechanical-executor'
export type { ExecuteMechanicalNodeParams } from './mechanical-executor'
export { executeAgentSpawnNode } from './node-executor'
export type { ExecuteAgentSpawnNodeParams, SpawnedProcessLike, SpawnFn } from './node-executor'
export {
  DEFAULT_GRACEFUL_TERMINATION_MS,
  FORCED_TERMINATION_SIGNAL,
  GRACEFUL_TERMINATION_SIGNAL,
  PROCESS_CANCELLED_ERROR_NAME,
  PROCESS_TIMED_OUT_ERROR_NAME,
  ProcessCancelledError,
  ProcessTerminatedError,
  ProcessTimedOutError
} from './process-lifecycle'
export type { ProcessTerminationReason } from './process-lifecycle'
export { readRunOutcome, resumeControlledRun, startControlledRun } from './run-control'
export type { ResumeControlledRunParams, StartControlledRunParams } from './run-control'
export { createRunControl, RunHaltedError, runHaltOf } from './run-halt'
export {
  createRunIdentity,
  // The starting value of every graph channel. Exported for the same reason
  // `buildAgentSpawnStateGraph` takes an injected executor: a caller driving
  // the compiled graph itself, rather than through `startRun`, has no other
  // supported way to build the state that graph expects.
  initialRunState,
  readRunCheckpoint,
  runIdentityForRunId,
  runIdentityOf,
  runInvokeConfig,
  startRun,
  threadIdForRun
} from './run-identity'
export type { RunFailure, RunInvokeConfig, StartRunParams, StartRunResult } from './run-identity'
export { renderStepPrompt } from './template'
export type { StepTemplateContext } from './template'
export type {
  AgentLifecycleEvent,
  AgentSpawnExecutorConfig,
  AgentSpawnNodeResult,
  MechanicalActionConfig,
  MechanicalNodeResult,
  ResultNarrowing,
  RoleBinaryArgsParams,
  RoleBinaryConfig,
  RunCheckpointState,
  RunCompletedOutcome,
  RunControl,
  RunExhaustedOutcome,
  RunExhaustion,
  RunFailedOutcome,
  RunIdentity,
  RunOutcome,
  RunOutcomeBase,
  RunOutcomeReason,
  RunOutcomeRecord,
  RunPausedOutcome,
  StepNodeResult
} from './types'
