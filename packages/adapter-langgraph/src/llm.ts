import Anthropic from '@anthropic-ai/sdk'
import type { LlmCallFn, LlmCallResult } from '@atta/engine'

export function createDefaultLlmCall(apiKey?: string): LlmCallFn {
  return async ({ model, agent, systemPrompt, userPrompt }) => {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error('Anthropic API key required. Pass LangGraphAdapterConfig.apiKey or set ANTHROPIC_API_KEY')
    }

    const client = new Anthropic({ apiKey: key })
    const startTime = Date.now()

    let content: string
    let structured: Record<string, unknown> | undefined
    let tokensInput = 0
    let tokensOutput = 0

    if (agent.outputSchema) {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [
          {
            name: agent.name,
            description: agent.description ?? 'Structured output',
            input_schema: agent.outputSchema as Anthropic.Tool['input_schema']
          }
        ],
        tool_choice: { type: 'tool', name: agent.name }
      })

      tokensInput = response.usage.input_tokens
      tokensOutput = response.usage.output_tokens

      const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      structured = (toolUse?.input ?? {}) as Record<string, unknown>
      content = JSON.stringify(structured)
    } else {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })

      tokensInput = response.usage.input_tokens
      tokensOutput = response.usage.output_tokens

      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      content = textBlock?.text ?? ''
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
