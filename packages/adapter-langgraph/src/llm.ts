import Anthropic from '@anthropic-ai/sdk'
import type { LlmCallFn, LlmCallResult } from '@atta/engine'
import { ANTHROPIC_TOOL_REGISTRY } from './tools'

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

    // Resolve provider tools from agent.tools names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolvedTools: any[] = (agent.tools ?? [])
      .map((name) => {
        const tool = ANTHROPIC_TOOL_REGISTRY[name]
        if (!tool) {
          console.warn(`[LangGraphAdapter] Agent '${agent.name}' requests unknown tool '${name}' — skipping`)
        }
        return tool
      })
      .filter(Boolean)

    if (agent.outputSchema) {
      // Structured output: force tool_choice to extract typed JSON.
      // Tools from agent.tools are intentionally omitted here — outputSchema
      // agents (ConclusionSynthesizer) produce structured verdicts, not web research.
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
      // Plain text response, optionally with server tools
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        ...(resolvedTools.length > 0 ? { tools: resolvedTools } : {})
      })

      tokensInput = response.usage.input_tokens
      tokensOutput = response.usage.output_tokens

      // Concatenate all text blocks — tool_use blocks are intermediate steps
      content = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
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
