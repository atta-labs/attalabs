import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import type { LlmCallFn, LlmCallResult } from '@atta/engine'
import { ANTHROPIC_TOOL_REGISTRY } from './tools'

/**
 * API keys for each supported provider.
 * Omit a key to disable that provider (calls to its models will throw).
 */
export type ProviderKeys = {
  anthropic?: string
  google?: string
  openai?: string
  xai?: string
}

/**
 * Resolve which provider a model ID belongs to.
 * Returns null for unrecognized prefixes.
 */
function resolveProvider(model: string): 'anthropic' | 'google' | 'openai' | 'xai' | null {
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gemini-')) return 'google'
  if (model.startsWith('gpt-') || model.startsWith('o4-')) return 'openai'
  if (model.startsWith('grok-')) return 'xai'
  return null
}

// ─── Google handler ───────────────────────────────────────────────────────────

async function callGoogle(params: {
  model: string
  systemPrompt: string
  userPrompt: string
  apiKey: string
}): Promise<Pick<LlmCallResult, 'content' | 'tokensInput' | 'tokensOutput'>> {
  const genAI = new GoogleGenerativeAI(params.apiKey)
  const genModel = genAI.getGenerativeModel({
    model: params.model,
    systemInstruction: params.systemPrompt
  })

  const result = await genModel.generateContent(params.userPrompt)
  const response = result.response

  const content = response.text().trim()
  const usage = response.usageMetadata
  const tokensInput = usage?.promptTokenCount ?? 0
  const tokensOutput = usage?.candidatesTokenCount ?? 0

  return { content, tokensInput, tokensOutput }
}

// ─── OpenAI / xAI handler ────────────────────────────────────────────────────

async function callOpenAICompat(params: {
  model: string
  systemPrompt: string
  userPrompt: string
  apiKey: string
  baseURL?: string
}): Promise<Pick<LlmCallResult, 'content' | 'tokensInput' | 'tokensOutput'>> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    ...(params.baseURL ? { baseURL: params.baseURL } : {})
  })

  const response = await client.chat.completions.create({
    model: params.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt }
    ]
  })

  const content = response.choices[0]?.message?.content?.trim() ?? ''
  const tokensInput = response.usage?.prompt_tokens ?? 0
  const tokensOutput = response.usage?.completion_tokens ?? 0

  return { content, tokensInput, tokensOutput }
}

// ─── Main factory ─────────────────────────────────────────────────────────────

/**
 * Creates a multi-vendor LlmCallFn that dispatches by model prefix:
 *   claude-*         → Anthropic SDK (full feature support: tools, structured output)
 *   gemini-*         → Google Generative AI SDK
 *   gpt-*, o4-*      → OpenAI SDK
 *   grok-*           → xAI via OpenAI-compatible SDK (api.x.ai/v1)
 *
 * Throws a descriptive error when:
 *   - the model prefix is unrecognized
 *   - the matched provider has no configured API key
 */
export function createMultiVendorLlmCall(keys: ProviderKeys): LlmCallFn {
  return async ({ model, agent, systemPrompt, userPrompt }) => {
    const provider = resolveProvider(model)

    if (provider === null) {
      throw new Error(`Unrecognized model prefix: '${model}'. Supported: claude-*, gemini-*, gpt-*, o4-*, grok-*`)
    }

    const startTime = Date.now()

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (provider === 'anthropic') {
      // Preserve the Anthropic path exactly — same logic as the original createDefaultLlmCall
      const key = keys.anthropic ?? process.env.ANTHROPIC_API_KEY
      if (!key) {
        throw new Error(
          `No API key configured for provider 'anthropic' (model: ${model}). Set ANTHROPIC_API_KEY env var.`
        )
      }

      const client = new Anthropic({ apiKey: key })

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
      const result: LlmCallResult = { content, structured, tokensInput, tokensOutput, elapsedMs, model }
      return result
    }

    // ── Google ────────────────────────────────────────────────────────────────
    if (provider === 'google') {
      const key = keys.google ?? process.env.GOOGLE_API_KEY
      if (!key) {
        throw new Error(`No API key configured for provider 'google' (model: ${model}). Set GOOGLE_API_KEY env var.`)
      }

      const { content, tokensInput, tokensOutput } = await callGoogle({
        model,
        systemPrompt,
        userPrompt,
        apiKey: key
      })

      const elapsedMs = Date.now() - startTime
      return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    if (provider === 'openai') {
      const key = keys.openai ?? process.env.OPENAI_API_KEY
      if (!key) {
        throw new Error(`No API key configured for provider 'openai' (model: ${model}). Set OPENAI_API_KEY env var.`)
      }

      const { content, tokensInput, tokensOutput } = await callOpenAICompat({
        model,
        systemPrompt,
        userPrompt,
        apiKey: key
      })

      const elapsedMs = Date.now() - startTime
      return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
    }

    // ── xAI (OpenAI-compatible) ───────────────────────────────────────────────
    if (provider === 'xai') {
      const key = keys.xai ?? process.env.XAI_API_KEY
      if (!key) {
        throw new Error(`No API key configured for provider 'xai' (model: ${model}). Set XAI_API_KEY env var.`)
      }

      const { content, tokensInput, tokensOutput } = await callOpenAICompat({
        model,
        systemPrompt,
        userPrompt,
        apiKey: key,
        baseURL: 'https://api.x.ai/v1'
      })

      const elapsedMs = Date.now() - startTime
      return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
    }

    // TypeScript exhaustiveness guard — should never be reached
    throw new Error(`[createMultiVendorLlmCall] Unhandled provider: ${provider}`)
  }
}

/**
 * Backward-compatible wrapper — creates an Anthropic-only LlmCallFn.
 * Existing code passing a single ANTHROPIC_API_KEY continues to work unchanged.
 */
export function createDefaultLlmCall(apiKey?: string): LlmCallFn {
  return createMultiVendorLlmCall({ anthropic: apiKey })
}
