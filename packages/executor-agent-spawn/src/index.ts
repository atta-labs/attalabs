/**
 * @atta/executor-agent-spawn
 *
 * Runs an agent-lifecycle Plan (compiled by `@atta/engine` from a
 * steps-shaped Flow) by spawning external agent processes. A sibling to
 * `packages/adapter-langgraph`, not an extension of it — see
 * `.claude/skills/atta-adapter-langgraph/SKILL.md` for the executor split.
 */

export { AgentSpawnGraphState } from './graph-state'
export type { AgentSpawnGraphStateValue } from './graph-state'
export { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
export type { AgentLifecycleNodeExecutor, NodeExecutionContext } from './graph-builder'
export { executeAgentSpawnNode } from './node-executor'
export type { ExecuteAgentSpawnNodeParams, SpawnedProcessLike, SpawnFn } from './node-executor'
export { renderStepPrompt } from './template'
export type { StepTemplateContext } from './template'
export type { AgentSpawnExecutorConfig, AgentSpawnNodeResult, RoleBinaryArgsParams, RoleBinaryConfig } from './types'
