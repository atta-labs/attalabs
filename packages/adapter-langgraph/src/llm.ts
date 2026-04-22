import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { LlmCallFn, LlmCallResult } from '@atta/engine'

/**
 * Default LLM caller using @langchain/anthropic. Returns
 * LlmCallResult with tokens, elapsed time, and parsed structured
 * output (when agent has outputSchema).
 *
 * Callers can override this per-execute by passing a custom
 * llmCall via ExecuteParams.
 *
 * @param apiKey - Anthropic API key (falls back to env.ANTHROPIC_API_KEY)
 */
export function createDefaultLlmCall(apiKey?: string): LlmCallFn {
  return async ({ model, agent, systemPrompt, userPrompt }) => {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error('Anthropic API key required. Pass LangGraphAdapterConfig.apiKey or set ANTHROPIC_API_KEY')
    }

    const startTime = Date.now()

    const llm = new ChatAnthropic({
      apiKey: key,
      model,
      maxTokens: 4096
    })

    const modelToCall = agent.outputSchema
      ? llm.withStructuredOutput(agent.outputSchema, {
          name: agent.name
        })
      : llm

    const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)]

    let content: string
    let structured: Record<string, unknown> | undefined
    let tokensInput = 0
    let tokensOutput = 0

    if (agent.outputSchema) {
      // Structured output path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (modelToCall as any).invoke(messages)
      structured = response as Record<string, unknown>
      content = JSON.stringify(response)
      // Token counts may not be exposed for structured output in this LangChain version
      // Task 6 or follow-up can handle manual parsing if needed
    } else {
      // Plain text path
      const response = await llm.invoke(messages)
      content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      const usage = response.usage_metadata
      if (usage) {
        tokensInput = usage.input_tokens ?? 0
        tokensOutput = usage.output_tokens ?? 0
      }
    }

    const elapsedMs = Date.now() - startTime

    const result: LlmCallResult = {
      content,
      structured,
      tokensInput,
      tokensOutput,
      elapsedMs,
      model
    }

    return result
  }
}
