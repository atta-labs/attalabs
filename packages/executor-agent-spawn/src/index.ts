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
export type { AgentLifecycleNodeExecutor, NodeExecutionContext } from './graph-builder'
export { executeMechanicalNode } from './mechanical-executor'
export type { ExecuteMechanicalNodeParams } from './mechanical-executor'
export { executeAgentSpawnNode } from './node-executor'
export type { ExecuteAgentSpawnNodeParams, SpawnedProcessLike, SpawnFn } from './node-executor'
export { renderStepPrompt } from './template'
export type { StepTemplateContext } from './template'
export type {
  AgentSpawnExecutorConfig,
  AgentSpawnNodeResult,
  MechanicalActionConfig,
  MechanicalNodeResult,
  RoleBinaryArgsParams,
  RoleBinaryConfig,
  StepNodeResult
} from './types'
