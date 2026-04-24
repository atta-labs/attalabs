import 'server-only'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'
import type { LanguageModel } from 'ai'
import { OLLAMA_BASE_URL } from './providers'
import type { RouteProvider } from './providers'

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
      const client = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
      return client(modelId) as LanguageModel
    }
  }
}
