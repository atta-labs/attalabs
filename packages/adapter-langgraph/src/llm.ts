import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import type { LlmCallFn, LlmCallResult } from '@atta/engine'
import { getVendor, resolveVendorByPrefix, type VendorId } from '@atta/models'
import { ANTHROPIC_TOOL_REGISTRY, GOOGLE_TOOL_REGISTRY, OPENAI_COMPAT_TOOL_REGISTRY } from './tools'
import {
  customToolSpecToAnthropicTool,
  customToolSpecToOpenAITool,
  resolveRegisteredCustomTools,
  runAnthropicCustomToolLoop,
  runOpenAICompatCustomToolLoop,
  type CustomToolHandlerMap,
  type OpenAICompatMessagesCreate
} from './custom-tool-loop'

/**
 * API keys keyed by VendorId. Omit a key to disable that vendor (calls throw).
 * Falls back to the vendor's envVar (e.g. ANTHROPIC_API_KEY) when not supplied.
 */
export type ProviderKeys = Partial<Record<VendorId, string>>

// ─── Google handler ───────────────────────────────────────────────────────────

async function callGoogle(params: {
  model: string
  systemPrompt: string
  userPrompt: string
  apiKey: string
  /** Google Tool[] configs resolved from GOOGLE_TOOL_REGISTRY (e.g. [{ googleSearch: {} }]). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[]
}): Promise<Pick<LlmCallResult, 'content' | 'tokensInput' | 'tokensOutput'>> {
  const genAI = new GoogleGenerativeAI(params.apiKey)
  const genModel = genAI.getGenerativeModel({
    model: params.model,
    systemInstruction: params.systemPrompt
  })

  // When tools are declared (e.g. googleSearch grounding), use the structured
  // request form. Otherwise keep the simple string form for backward compat.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request: any =
    params.tools && params.tools.length > 0
      ? {
          contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
          tools: params.tools
        }
      : params.userPrompt

  const result = await genModel.generateContent(request)
  const response = result.response

  const content = response.text().trim()
  const usage = response.usageMetadata
  const tokensInput = usage?.promptTokenCount ?? 0
  const tokensOutput = usage?.candidatesTokenCount ?? 0

  return { content, tokensInput, tokensOutput }
}

// ─── OpenAI-compat handler ────────────────────────────────────────────────────

async function callOpenAICompat(params: {
  model: string
  systemPrompt: string
  userPrompt: string
  apiKey: string
  baseURL?: string
  /**
   * Vendor-specific extra body params merged into the request (e.g. OpenRouter
   * plugin params: { plugins: [...] }). No YAML schema field — configured at
   * adapter construction via vendorExtraBody.
   */
  extraBody?: Record<string, unknown>
}): Promise<Pick<LlmCallResult, 'content' | 'tokensInput' | 'tokensOutput'>> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    ...(params.baseURL ? { baseURL: params.baseURL } : {})
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createParams: any = {
    model: params.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt }
    ],
    ...(params.extraBody ?? {})
  }

  const response = await client.chat.completions.create(createParams)

  const content = response.choices[0]?.message?.content?.trim() ?? ''
  const tokensInput = response.usage?.prompt_tokens ?? 0
  const tokensOutput = response.usage?.completion_tokens ?? 0

  return { content, tokensInput, tokensOutput }
}

// ─── Main factory ─────────────────────────────────────────────────────────────

/**
 * Creates a multi-vendor LlmCallFn. Vendor is resolved per-call by:
 *   1. agentVendorOverrides[agent.name]  — catalog-resolved (handles cross-vendor models like
 *      deepseek-r1-distill-llama-70b served by Groq)
 *   2. resolveVendorByPrefix(model)      — prefix-based fallback
 *
 * Dispatch is sdkShape-based (not per-provider hardcoded):
 *   anthropic    → Anthropic SDK (tools + structured output)
 *   google-genai → Google Generative AI SDK (grounding tools via GOOGLE_TOOL_REGISTRY)
 *   openai-compat → OpenAI SDK + vendor's registered baseURL (covers openai, groq, xai,
 *                   deepseek, cerebras, mistral, together, fireworks, openrouter, ollama)
 *                   with tool loop for custom_tools and server tools via OPENAI_COMPAT_TOOL_REGISTRY
 *
 * vendorExtraBody: per-vendor extra body params merged into every request for that vendor.
 * No YAML schema field — used for adapter-level configuration (e.g. OpenRouter plugin params).
 */
export function createMultiVendorLlmCall(
  keys: ProviderKeys,
  agentVendorOverrides?: Record<string, VendorId>,
  customToolHandlers?: CustomToolHandlerMap,
  vendorExtraBody?: Partial<Record<VendorId, Record<string, unknown>>>
): LlmCallFn {
  return async ({ model, agent, systemPrompt, userPrompt }) => {
    const vendorId = agentVendorOverrides?.[agent.name] ?? resolveVendorByPrefix(model)

    if (vendorId === null) {
      throw new Error(
        `Unrecognized model '${model}' for agent '${agent.name}'. Add it to agentVendorOverrides or register its prefix in the vendor registry.`
      )
    }

    const vendor = getVendor(vendorId)
    const key = keys[vendorId] ?? (vendor.envVar ? process.env[vendor.envVar] : undefined)

    const startTime = Date.now()

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (vendor.sdkShape === 'anthropic') {
      if (!key) {
        throw new Error(
          `No API key configured for vendor '${vendorId}' (model: ${model}). Set ${vendor.envVar ?? 'an API key'}.`
        )
      }

      const client = new Anthropic({ apiKey: key })

      let content: string
      let structured: Record<string, unknown> | undefined
      let tokensInput = 0
      let tokensOutput = 0

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

      // Per-agent output cap. The compiled Plan propagates maxTokens from
      // flow.defaults.max_tokens / agent.max_tokens (engine compileFlow), so
      // YAMLs control truncation. Falls back to 4096 for agents that don't set
      // it — preserves byte-identical behavior for every existing Vāda agent.
      const anthropicMaxTokens = agent.maxTokens ?? 4096

      // Custom-tool loop activation: agent declares customTools AND at least one
      // matches a registered handler. Gating with handlers ensures the additive
      // branch is unreachable when no app registers custom tools — preserving
      // byte-identical behavior for every agent without declared customTools
      // (i.e. every Vāda agent today). resolveRegisteredCustomTools is the
      // single source of truth for this decision and is unit-tested.
      const registeredCustomToolSpecs = resolveRegisteredCustomTools(agent, customToolHandlers)
      if (registeredCustomToolSpecs.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mergedTools: any[] = [...resolvedTools, ...registeredCustomToolSpecs.map(customToolSpecToAnthropicTool)]
        const { content, tokensInput, tokensOutput } = await runAnthropicCustomToolLoop({
          messagesCreate: (p) => client.messages.create(p) as Promise<Anthropic.Message>,
          model,
          systemPrompt,
          userPrompt,
          tools: mergedTools,
          handlers: customToolHandlers!,
          maxTokens: anthropicMaxTokens
        })
        const elapsedMs = Date.now() - startTime
        return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
      }

      if (agent.outputSchema) {
        const response = await client.messages.create({
          model,
          max_tokens: anthropicMaxTokens,
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
          max_tokens: anthropicMaxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          ...(resolvedTools.length > 0 ? { tools: resolvedTools } : {})
        })

        tokensInput = response.usage.input_tokens
        tokensOutput = response.usage.output_tokens

        content = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
      }

      const elapsedMs = Date.now() - startTime
      return { content, structured, tokensInput, tokensOutput, elapsedMs, model }
    }

    // ── Google ────────────────────────────────────────────────────────────────
    if (vendor.sdkShape === 'google-genai') {
      if (!key) {
        throw new Error(
          `No API key configured for vendor '${vendorId}' (model: ${model}). Set ${vendor.envVar ?? 'an API key'}.`
        )
      }

      // Resolve Google-native tools (e.g. googleSearch grounding) from GOOGLE_TOOL_REGISTRY.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const googleTools: any[] = (agent.tools ?? []).flatMap((name) => {
        const tool = GOOGLE_TOOL_REGISTRY[name]
        if (!tool) {
          console.warn(
            `[LangGraphAdapter] Agent '${agent.name}' requests unknown tool '${name}' for google-genai — skipping`
          )
        }
        return tool ? [tool] : []
      })

      const { content, tokensInput, tokensOutput } = await callGoogle({
        model,
        systemPrompt,
        userPrompt,
        apiKey: key,
        ...(googleTools.length > 0 ? { tools: googleTools } : {})
      })

      const elapsedMs = Date.now() - startTime
      return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
    }

    // ── OpenAI-compat (openai, groq, xai, deepseek, cerebras, mistral, together, fireworks, openrouter, ollama) ──
    if (vendor.sdkShape === 'openai-compat') {
      if (!vendor.localOnly && !key) {
        throw new Error(
          `No API key configured for vendor '${vendorId}' (model: ${model}). Set ${vendor.envVar ?? 'an API key'}.`
        )
      }

      const extraBodyForVendor = vendorExtraBody?.[vendorId] ?? {}

      // Resolve server-tool function specs from OPENAI_COMPAT_TOOL_REGISTRY.
      // Unlike Anthropic (server-side execution) these are function calling specs —
      // the model emits tool_calls and the loop executes handlers client-side.
      // Gate on outputSchema: tool loop is incompatible with structured-output mode.
      const resolvedServerTools: OpenAI.Chat.ChatCompletionTool[] = agent.outputSchema
        ? []
        : (agent.tools ?? []).flatMap((name) => {
            const tool = OPENAI_COMPAT_TOOL_REGISTRY[name]
            if (!tool) {
              console.warn(
                `[LangGraphAdapter] Agent '${agent.name}' requests unknown tool '${name}' for openai-compat — skipping`
              )
            }
            return tool ? [tool as OpenAI.Chat.ChatCompletionTool] : []
          })

      const registeredCustomToolSpecs = resolveRegisteredCustomTools(agent, customToolHandlers)
      const allTools: OpenAI.Chat.ChatCompletionTool[] = [
        ...resolvedServerTools,
        ...registeredCustomToolSpecs.map(customToolSpecToOpenAITool)
      ]

      if (allTools.length > 0) {
        const client = new OpenAI({
          apiKey: key ?? '',
          ...(vendor.baseURL ? { baseURL: vendor.baseURL } : {})
        })

        // Capture extraBody in closure so every messagesCreate call includes it.
        const messagesCreate: OpenAICompatMessagesCreate = (p) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const merged: any = Object.keys(extraBodyForVendor).length > 0 ? { ...p, ...extraBodyForVendor } : p
          return client.chat.completions.create(merged) as Promise<OpenAI.Chat.ChatCompletion>
        }

        const { content, tokensInput, tokensOutput } = await runOpenAICompatCustomToolLoop({
          messagesCreate,
          model,
          systemPrompt,
          userPrompt,
          tools: allTools,
          handlers: customToolHandlers ?? {},
          maxTokens: agent.maxTokens ?? 4096
        })

        const elapsedMs = Date.now() - startTime
        return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
      }

      // Single-shot: no tools declared. Pass extraBody for OpenRouter plugin params, etc.
      const { content, tokensInput, tokensOutput } = await callOpenAICompat({
        model,
        systemPrompt,
        userPrompt,
        apiKey: key ?? '',
        baseURL: vendor.baseURL,
        ...(Object.keys(extraBodyForVendor).length > 0 ? { extraBody: extraBodyForVendor } : {})
      })

      const elapsedMs = Date.now() - startTime
      return { content, structured: undefined, tokensInput, tokensOutput, elapsedMs, model }
    }

    // TypeScript exhaustiveness guard — should never be reached
    throw new Error(`[createMultiVendorLlmCall] Unhandled sdkShape for vendor '${vendorId}'`)
  }
}

/**
 * Backward-compatible wrapper — Anthropic-only LlmCallFn.
 */
export function createDefaultLlmCall(apiKey?: string): LlmCallFn {
  return createMultiVendorLlmCall({ anthropic: apiKey })
}
