import type { ModelEntry } from './catalog'
import { OVERLAY } from './overlay'
import type { DisplayProvider, RouteProvider } from './providers'
import type { ModelsDevModel, ModelsDevResponse } from './sources/models-dev'

// models.dev provider ID → our native RouteProvider (when we ship a native adapter)
const NATIVE_ROUTE_BY_MODELS_DEV_ID: Record<string, RouteProvider> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  groq: 'groq'
}

// models.dev provider IDs we route via OpenRouter
const OPENROUTER_ALLOWED_PROVIDERS: Set<string> = new Set([
  'xai',
  'deepseek',
  'mistral',
  'cerebras',
  'meta',
  'qwen',
  'alibaba',
  'google-vertex-anthropic'
])

// models.dev provider ID → DisplayProvider (what ModelIcon renders)
const DISPLAY_PROVIDER_BY_MODELS_DEV_ID: Record<string, DisplayProvider> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  groq: 'groq',
  xai: 'xai',
  deepseek: 'deepseek',
  mistral: 'mistral',
  cerebras: 'cerebras',
  meta: 'meta',
  alibaba: 'meta',
  qwen: 'meta'
}

function resolveRoute(providerId: string): RouteProvider | null {
  if (NATIVE_ROUTE_BY_MODELS_DEV_ID[providerId]) return NATIVE_ROUTE_BY_MODELS_DEV_ID[providerId]
  if (OPENROUTER_ALLOWED_PROVIDERS.has(providerId)) return 'openrouter'
  return null
}

function resolveModelIdForRoute(route: RouteProvider, providerId: string, rawModelId: string): string {
  if (route === 'openrouter') {
    // OpenRouter expects vendor-prefixed IDs. models.dev's 'xai' maps to OR's 'x-ai'.
    const orVendor = providerId === 'xai' ? 'x-ai' : providerId
    return `${orVendor}/${rawModelId}`
  }
  return rawModelId
}

function deriveCost(model: ModelsDevModel): 'free' | 'paid' {
  if (!model.cost) return 'paid'
  const { input, output } = model.cost
  return input === 0 && output === 0 ? 'free' : 'paid'
}

function buildEntry(providerId: string, modelKey: string, model: ModelsDevModel): ModelEntry | null {
  const route = resolveRoute(providerId)
  if (!route) return null

  const displayProvider = DISPLAY_PROVIDER_BY_MODELS_DEV_ID[providerId]
  if (!displayProvider) return null

  const rawId = model.id ?? modelKey
  const modelId = resolveModelIdForRoute(route, providerId, rawId)
  const overlayEntry = OVERLAY[rawId]

  return {
    id: `${providerId}/${rawId}`,
    modelId,
    displayProvider,
    route,
    label: model.name ?? rawId,
    description: overlayEntry?.description,
    tier: overlayEntry?.tier ?? 'balanced',
    cost: deriveCost(model)
  }
}

export function transformModelsDev(data: ModelsDevResponse): ModelEntry[] {
  const entries: ModelEntry[] = []
  for (const [providerId, provider] of Object.entries(data)) {
    if (!provider.models) continue
    for (const [modelKey, model] of Object.entries(provider.models)) {
      try {
        const built = buildEntry(providerId, modelKey, model)
        if (built) entries.push(built)
      } catch {
        // Skip malformed entries
      }
    }
  }
  return entries
}
