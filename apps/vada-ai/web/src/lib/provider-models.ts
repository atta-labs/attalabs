// Shared — safe to import in both client and server code (no runtime deps)

import type { Provider } from '@/lib/models'

export interface ModelDef {
  modelId: string
  label: string
  isDefault?: boolean
}

export interface ProviderDef {
  id: Provider
  label: string
  keyPrefix: string // shown as input placeholder
  models: ModelDef[]
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    keyPrefix: 'sk-ant-',
    models: [
      { modelId: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', isDefault: true },
      { modelId: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
    ]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPrefix: 'sk-or-',
    models: [
      {
        modelId: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'Llama 3.3 70B (Free)',
        isDefault: true
      }
    ]
  },
  {
    id: 'groq',
    label: 'Groq',
    keyPrefix: 'gsk_',
    models: [{ modelId: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', isDefault: true }]
  },
  {
    id: 'google',
    label: 'Google Gemini',
    keyPrefix: 'AIza',
    models: [
      { modelId: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', isDefault: true },
      { modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
    ]
  }
]

export const PROVIDER_MAP: Record<Provider, ProviderDef> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p])
) as Record<Provider, ProviderDef>

export function getDefaultModel(providerId: Provider): ModelDef | undefined {
  return PROVIDER_MAP[providerId]?.models.find((m) => m.isDefault)
}
