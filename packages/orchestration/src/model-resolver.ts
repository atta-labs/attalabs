import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'
import { OLLAMA_BASE_URL } from '@atta/models'
import type { RouteProvider } from '@atta/models'
import type { LanguageModel } from 'ai'

// Internal — not exported from index.ts. Callers pass provider/modelId/apiKey
// via DeliberationContext; this is the adapter's concern, not the app's.
export function resolveModel(provider: RouteProvider, modelId: string, apiKey?: string): LanguageModel {
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
      // Native Ollama provider — uses /api/chat, not the OpenAI-compat /v1 endpoint.
      // This lets num_ctx and other Ollama-specific options flow through correctly.
      const client = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
      return client(modelId) as LanguageModel
    }
  }
}
