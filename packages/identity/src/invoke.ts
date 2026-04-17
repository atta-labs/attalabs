// Browser-side agent invocation. This is the only place in the codebase that calls
// provider APIs with a user key. Keys are passed in here — never persisted,
// never transmitted to the Vāda server. See /trust for the full BYOK architecture
// guarantee.
//
// `dangerouslyAllowBrowser: true` on each client: this flag exists because
// embedding a developer's own server key in browser JS would leak it to every
// visitor. BYOK inverts that: the key belongs to the user, is in the user's own
// browser, entered by the user themselves. This is the canonical BYOK pattern,
// not the foot-gun.

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import { streamText } from 'ai'
import type { RouteProvider } from '@atta/models'

export interface InvokeParams {
  provider: RouteProvider
  modelId: string
  apiKey: string
  systemPrompt: string
  userPrompt: string
  signal?: AbortSignal
}

export interface InvokeResult {
  textStream: AsyncIterable<string>
  fullText: () => Promise<string>
}

function resolveModel(provider: RouteProvider, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId)
    case 'openai':
      return createOpenAI({ apiKey })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId)
    case 'groq':
      return createGroq({ apiKey })(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey })(modelId)
  }
}

export async function invokeAgent(params: InvokeParams): Promise<InvokeResult> {
  const model = resolveModel(params.provider, params.modelId, params.apiKey)
  const result = streamText({
    model,
    system: params.systemPrompt,
    prompt: params.userPrompt,
    abortSignal: params.signal
  })
  return {
    textStream: result.textStream,
    fullText: async () => await result.text
  }
}
