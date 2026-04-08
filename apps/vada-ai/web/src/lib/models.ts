// Shared between client components and server engine — no runtime deps.

export type Provider = 'groq' | 'google' | 'anthropic' | 'openrouter'

export interface ModelConfig {
  provider: Provider
  modelId: string
  apiKey?: string
}

export const DEFAULT_MODEL_IDS: Record<Provider, string> = {
  groq: 'llama-3.3-70b-versatile',
  google: 'gemini-2.0-flash',
  anthropic: 'claude-sonnet-4-5',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free'
}
