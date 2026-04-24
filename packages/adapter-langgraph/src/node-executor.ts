import Handlebars from 'handlebars'
import {
  deriveTemplateState,
  type Agent,
  type AgentOutput,
  type ExecutionHooks,
  type ExecutionState,
  type LlmCallFn
} from '@atta/engine'
import type { NodeExecutor } from './graph-builder.js'
import type { ToolUseRecord } from './graph-state.js'

/**
 * Creates a NodeExecutor bound to a specific LLM call function and optional hooks.
 *
 * The returned executor:
 *   1. Reconstructs a transient ExecutionState from the graph state
 *   2. Calls deriveTemplateState(state, node) for Handlebars context
 *   3. Compiles and renders the node's inputTemplate
 *   4. Invokes the LLM with systemPrompt + rendered userPrompt
 *   5. Constructs an AgentOutput from the result
 *   6. Calls hooks.onNodeComplete if provided (swallows errors, consistent with other hooks)
 *   7. Returns partial state with the new output and execution order
 */
export function createNodeExecutor(llmCall: LlmCallFn, hooks?: ExecutionHooks): NodeExecutor {
  return async (graphState, context) => {
    const { node, plan } = context

    // Defensive: sentinel shouldn't be called by graph builder
    if (node.id === '__END__') return {}

    const agent = plan.agents[node.agentName]
    if (!agent) {
      throw new Error(`Node '${node.id}' references agent '${node.agentName}' not in plan.agents.`)
    }

    // Reconstruct ExecutionState for deriveTemplateState
    const executionStateView: ExecutionState = {
      question: graphState.question,
      plan,
      customVars: graphState.customVars,
      status: graphState.status,
      outputs: graphState.outputs,
      executionOrder: graphState.executionOrder,
      startedAt: graphState.startedAt,
      error: graphState.error
    }

    // Derive template context using engine's deterministic contract
    const templateState = deriveTemplateState(executionStateView, node)

    // Compile and render Handlebars template
    let renderedPrompt: string
    try {
      const compiled = Handlebars.compile(node.inputTemplate, {
        noEscape: true
      })
      renderedPrompt = compiled(templateState)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      throw new Error(`Template rendering failed for node '${node.id}': ${errMsg}`)
    }

    // Resolve model: agent override > plan default
    const model = agent.model ?? plan.model

    // Apply cognitive router decision: filter tools to those the classifier approved.
    // Falls back to the agent's full tool list if no decision is present.
    const decision = graphState.toolDecisions?.[node.id]
    const filteredAgent: Agent = decision
      ? { ...agent, tools: decision.needs.length > 0 ? decision.needs : undefined }
      : agent

    // Invoke the LLM with (potentially filtered) tool list
    const llmResult = await llmCall({
      model,
      agent: filteredAgent,
      systemPrompt: agent.systemPrompt,
      userPrompt: renderedPrompt
    })

    // Track tool allocation for tool-enabled agents (best-effort — one record per
    // allocated tool since server tools don't emit countable tool_use blocks).
    const enabledTools = decision?.needs ?? agent.tools ?? []
    const toolUseUpdates: ToolUseRecord[] = enabledTools.map((toolName) => ({
      agentNodeId: node.id,
      toolName,
      inputTokens: llmResult.tokensInput,
      outputTokens: llmResult.tokensOutput,
      durationMs: llmResult.elapsedMs
    }))

    // Build AgentOutput
    const agentOutput: AgentOutput = {
      agentName: agent.name,
      content: llmResult.content,
      structured: llmResult.structured,
      tokensInput: llmResult.tokensInput,
      tokensOutput: llmResult.tokensOutput,
      elapsedMs: llmResult.elapsedMs,
      model: llmResult.model,
      roundIndex: node.metadata.roundIndex,
      stepIndex: node.metadata.customStepIndex
    }

    // Fire onNodeComplete hook with state-as-of-this-node. Errors are swallowed and
    // logged, consistent with how onStart/onComplete are handled in adapter.ts.
    if (hooks?.onNodeComplete) {
      const stateAfterNode: ExecutionState = {
        ...executionStateView,
        outputs: { ...executionStateView.outputs, [node.id]: agentOutput },
        executionOrder: [...executionStateView.executionOrder, node.id]
      }
      try {
        await hooks.onNodeComplete({ state: stateAfterNode, node, output: agentOutput })
      } catch (err) {
        console.error(`[LangGraphAdapter] onNodeComplete hook failed for node '${node.id}':`, err)
      }
    }

    // Return partial state update. Reducers handle merging.
    return {
      outputs: { [node.id]: agentOutput },
      executionOrder: [node.id],
      ...(toolUseUpdates.length > 0 ? { toolUseHistory: toolUseUpdates } : {})
    }
  }
}
