import { Annotation } from '@langchain/langgraph'
import type { AgentOutput, ExecutionState } from '@atta/engine'

/**
 * Classifier decision for a single tool-enabled agent turn.
 * Produced by the Intent Classifier node before each tool-enabled agent.
 */
export interface ToolDecision {
  /** Subset of the agent's declared tools that this turn actually needs. */
  needs: string[]
  /** Max tool invocations allowed for this turn (best-effort; server tools can't be counted). */
  budget: number
  /** Optional one-line reason from the classifier. */
  reason?: string
}

/**
 * Record of tool allocation for a single agent turn.
 * One record per tool per tool-enabled agent turn (best-effort — server tools
 * don't emit tool_use blocks, so actual invocation counts are unavailable).
 */
export interface ToolUseRecord {
  agentNodeId: string
  toolName: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

/**
 * LangGraph state for Vāda executions.
 *
 * Mirrors Vāda's ExecutionState but expressed in LangGraph's Annotation
 * format so LangGraph can manage state propagation and merging across
 * nodes. The adapter synchronizes between LangGraph state and our
 * own ExecutionState at node boundaries.
 *
 * The reducer patterns:
 * - outputs: merged (new entries overlay existing, keyed by node id)
 * - executionOrder: concatenated (new ids appended in order)
 * - toolDecisions: merged (classifier decisions overlay existing, keyed by agent node id)
 * - toolUseHistory: concatenated (new records appended in order)
 * - status: replaced (latest value wins)
 * - error: replaced
 *
 * Immutable fields (question, customVars, startedAt) use default
 * replace reducers — they're set once at graph start and don't change.
 */
export const VadaGraphState = Annotation.Root({
  question: Annotation<string>(),
  customVars: Annotation<Record<string, unknown>>(),
  outputs: Annotation<Record<string, AgentOutput>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  executionOrder: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  }),
  toolDecisions: Annotation<Record<string, ToolDecision>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  toolUseHistory: Annotation<ToolUseRecord[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  }),
  status: Annotation<ExecutionState['status']>({
    reducer: (_current, update) => update,
    default: () => 'RUNNING' as const
  }),
  error: Annotation<ExecutionState['error'] | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined
  }),
  startedAt: Annotation<number>()
})

/**
 * Runtime type of the state object passed between LangGraph nodes.
 * Derived from the Annotation.Root shape.
 */
export type VadaGraphStateValue = typeof VadaGraphState.State
