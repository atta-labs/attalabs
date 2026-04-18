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
import { OLLAMA_BASE_URL, type RouteProvider } from '@atta/models'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import { streamText } from 'ai'
import { createOllama } from 'ollama-ai-provider-v2'

// Ollama optimization defaults for Vāda's workload:
// - num_ctx: 8192 is plenty for 3 rounds of 4 agents (~5-7k tokens worst case).
//   The model default of 32768 wastes ~6GB of KV cache and slows prompt eval.
// - keep_alive: 30m keeps the model warm between agent turns so we don't pay
//   reload cost during a single deliberation. Ollama default is 5m.
// - num_batch: 512 is the typical sweet spot for Apple Silicon prompt eval.
const OLLAMA_OPTIONS = {
  numCtx: 8192,
  numBatch: 512,
  keepAlive: '30m'
} as const

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
    case 'ollama': {
      // Native Ollama provider instead of OpenAI-compat — lets us pass Ollama
      // options (num_ctx, keep_alive, num_batch) that the /v1 endpoint strips.
      // These defaults cut prompt-eval time on long-transcript rounds and keep
      // the model loaded between agent turns during a deliberation.
      const ollama = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
      return ollama(modelId) as LanguageModel
    }
  }
}

export async function invokeAgent(params: InvokeParams): Promise<InvokeResult> {
  const model = resolveModel(params.provider, params.modelId, params.apiKey)

  // Ollama-specific options get passed through via providerOptions so the
  // underlying /api/chat request includes them. Ignored for other providers.
  const providerOptions =
    params.provider === 'ollama'
      ? {
          ollama: {
            options: {
              num_ctx: OLLAMA_OPTIONS.numCtx,
              num_batch: OLLAMA_OPTIONS.numBatch
            },
            keep_alive: OLLAMA_OPTIONS.keepAlive
          }
        }
      : undefined

  const result = streamText({
    model,
    system: params.systemPrompt,
    prompt: params.userPrompt,
    abortSignal: params.signal,
    ...(providerOptions ? { providerOptions } : {})
  })
  return {
    textStream: result.textStream,
    fullText: async () => await result.text
  }
}
