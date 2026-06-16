/**
 * Multi-turn Anthropic tool execution loop for client-side custom tools.
 *
 * Activated only when an agent declares `customTools` AND the adapter has a
 * registered handler for at least one of them. Agents without custom tools
 * (every Vāda agent today) never enter this code path — the single-shot
 * Anthropic call in llm.ts handles them as before.
 *
 * Loop shape:
 *   1. Send the conversation (initially just the user prompt) to the model
 *      with the merged tool list (server tools + registered custom tools).
 *   2. If the response has stop_reason !== 'tool_use', or contains no
 *      tool_use blocks for registered custom tools, return the accumulated
 *      text + token totals.
 *   3. Otherwise, run each registered handler concurrently, append the
 *      assistant turn + a user turn containing tool_result blocks, and loop.
 *
 * Bounded by MAX_CUSTOM_TOOL_ITERATIONS to prevent runaway tool calls.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { CustomToolSpec } from '@atta/agents'

/** Async handler the adapter runs server-side when the model emits tool_use. */
export type CustomToolHandler = (args: Record<string, unknown>) => Promise<unknown>

/** Map keyed by tool name → registered handler. App-supplied at adapter construction. */
export type CustomToolHandlerMap = Record<string, CustomToolHandler>

/** Hard upper bound on tool/turn iterations per LLM call. */
export const MAX_CUSTOM_TOOL_ITERATIONS = 10

/**
 * Subset of an Agent shape this module reads — kept structural so callers
 * don't need to import @atta/agents just to type-check the gate.
 */
export interface CustomToolGateAgent {
  customTools?: CustomToolSpec[]
  outputSchema?: Record<string, unknown>
}

/**
 * Pure gate predicate: returns the subset of an agent's customTools that
 * have a matching handler registered. The Anthropic branch enters the loop
 * only when this returns a non-empty list AND the agent has no outputSchema
 * (structured-output mode is incompatible with multi-turn tool use today).
 *
 * Used in llm.ts as the SINGLE source of truth for whether the loop runs —
 * keeping the additivity invariant testable in isolation.
 */
export function resolveRegisteredCustomTools(
  agent: CustomToolGateAgent,
  handlers: CustomToolHandlerMap | undefined
): CustomToolSpec[] {
  if (agent.outputSchema) return []
  if (!handlers) return []
  return (agent.customTools ?? []).filter((spec) => handlers[spec.name] !== undefined)
}

/**
 * Minimal callable signature for `client.messages.create` so the loop is
 * testable without an Anthropic SDK instance.
 */
export type AnthropicMessagesCreate = (
  params: Anthropic.Messages.MessageCreateParamsNonStreaming
) => Promise<Anthropic.Message>

export interface RunCustomToolLoopParams {
  messagesCreate: AnthropicMessagesCreate
  model: string
  systemPrompt: string
  userPrompt: string
  /** Full tool list sent to the model — server tools + custom tool specs merged. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[]
  /** Map of registered handlers keyed by tool name. */
  handlers: CustomToolHandlerMap
  /** Override the iteration cap for tests. Defaults to MAX_CUSTOM_TOOL_ITERATIONS. */
  maxIterations?: number
  /**
   * Per-turn Anthropic `max_tokens`. Defaults to 4096 to preserve historical
   * behavior for callers (and tests) that don't pass it. Flow-driven values
   * arrive via llm.ts after compileFlow propagates them from the YAML.
   */
  maxTokens?: number
}

export interface RunCustomToolLoopResult {
  content: string
  tokensInput: number
  tokensOutput: number
}

/**
 * Build an Anthropic tool spec from a CustomToolSpec. Exposed so the
 * Anthropic branch in llm.ts can merge custom and server tools before
 * either single-shot or loop paths.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function customToolSpecToAnthropicTool(spec: CustomToolSpec): any {
  return {
    name: spec.name,
    description: spec.description,
    input_schema: spec.parameters
  }
}

/**
 * Run the multi-turn loop. Returns the final assistant text after the model
 * stops emitting tool_use for registered handlers.
 */
export async function runAnthropicCustomToolLoop(params: RunCustomToolLoopParams): Promise<RunCustomToolLoopResult> {
  const { messagesCreate, model, systemPrompt, userPrompt, tools, handlers } = params
  const maxIterations = params.maxIterations ?? MAX_CUSTOM_TOOL_ITERATIONS
  const maxTokens = params.maxTokens ?? 4096

  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: userPrompt }]
  let totalTokensInput = 0
  let totalTokensOutput = 0

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await messagesCreate({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      ...(tools.length > 0 ? { tools } : {})
    })

    totalTokensInput += response.usage.input_tokens
    totalTokensOutput += response.usage.output_tokens

    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const handledToolUses = toolUseBlocks.filter((b) => handlers[b.name] !== undefined)

    // Stop conditions: (1) model is done, (2) no registered custom-tool calls to run.
    // Either way, surface the assistant text and return.
    if (response.stop_reason !== 'tool_use' || handledToolUses.length === 0) {
      const content = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      return { content, tokensInput: totalTokensInput, tokensOutput: totalTokensOutput }
    }

    // Append assistant turn verbatim — Anthropic requires the original tool_use blocks
    // back so it can match them to tool_result by tool_use_id.
    messages.push({ role: 'assistant', content: response.content })

    // Run handlers concurrently; map results (or errors) to tool_result blocks.
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      handledToolUses.map(async (block) => {
        const handler = handlers[block.name]!
        const input = (block.input ?? {}) as Record<string, unknown>
        try {
          const result = await handler(input)
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool '${block.name}' failed: ${message}`,
            is_error: true
          }
        }
      })
    )

    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error(
    `[runAnthropicCustomToolLoop] Exceeded MAX_CUSTOM_TOOL_ITERATIONS (${maxIterations}) for model '${model}'`
  )
}
