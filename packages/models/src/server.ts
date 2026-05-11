import 'server-only'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { getVendor, OLLAMA_BASE_URL } from './vendors'
import type { VendorId } from './vendors'

export function resolveModel(vendorId: VendorId, modelId: string, apiKey?: string): LanguageModel {
  const vendor = getVendor(vendorId)

  switch (vendor.sdkShape) {
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId)
    case 'google-genai':
      return createGoogleGenerativeAI({ apiKey })(modelId)
    case 'openai-compat': {
      if (vendorId === 'ollama') {
        const client = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
        return client(modelId) as LanguageModel
      }
      if (vendorId === 'openrouter') {
        return createOpenRouter({ apiKey })(modelId)
      }
      // All other openai-compat vendors (openai, groq, xai, deepseek, cerebras, mistral, together, fireworks)
      return createOpenAI({ apiKey, baseURL: vendor.baseURL })(modelId)
    }
  }
}
