import type { ModelEntry } from './catalog'
import { isDecommissioned } from './deprecations'
import { OVERLAY } from './overlay'
import type { VendorId } from './vendors'
import type { ModelsDevModel, ModelsDevResponse } from './sources/models-dev'

// models.dev provider ID → VendorId (for vendors with a native SDK entry in the registry)
const MODELSDEV_TO_VENDOR_ID: Record<string, VendorId> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  groq: 'groq',
  xai: 'xai',
  deepseek: 'deepseek',
  cerebras: 'cerebras',
  mistral: 'mistral',
  together: 'together',
  fireworks: 'fireworks'
}

// Providers where only overlay-listed models are shown. Prevents deprecated
// aliases (e.g. claude-3-5-haiku-latest) from models.dev leaking into the picker.
const OVERLAY_ONLY_PROVIDERS: Set<string> = new Set(['anthropic'])

// models.dev provider IDs with no native registry entry — proxied via OpenRouter.
const OPENROUTER_PROXY_PROVIDERS: Set<string> = new Set(['meta', 'qwen', 'alibaba', 'google-vertex-anthropic'])

// models.dev provider ID → displayProvider string (what ModelIcon/ProviderIcon renders)
const DISPLAY_PROVIDER_BY_MODELS_DEV_ID: Record<string, string> = {
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

function resolveVendorId(providerId: string): VendorId | null {
  const native = MODELSDEV_TO_VENDOR_ID[providerId]
  if (native) return native
  if (OPENROUTER_PROXY_PROVIDERS.has(providerId)) return 'openrouter'
  return null
}

function resolveModelIdForVendor(vendorId: VendorId, providerId: string, rawModelId: string): string {
  if (vendorId === 'openrouter') {
    // OpenRouter expects vendor-prefixed IDs.
    return `${providerId}/${rawModelId}`
  }
  return rawModelId
}

function deriveCost(model: ModelsDevModel): 'free' | 'paid' {
  if (!model.cost) return 'paid'
  const { input, output } = model.cost
  return input === 0 && output === 0 ? 'free' : 'paid'
}

function buildEntry(providerId: string, modelKey: string, model: ModelsDevModel): ModelEntry | null {
  const vendorId = resolveVendorId(providerId)
  if (!vendorId) return null

  const displayProvider = DISPLAY_PROVIDER_BY_MODELS_DEV_ID[providerId]
  if (!displayProvider) return null

  const rawId = model.id ?? modelKey
  const overlayEntry = OVERLAY[rawId]

  // For overlay-only providers, skip models not explicitly curated.
  if (OVERLAY_ONLY_PROVIDERS.has(providerId) && !overlayEntry) return null

  const modelId = resolveModelIdForVendor(vendorId, providerId, rawId)

  return {
    id: `${providerId}/${rawId}`,
    modelId,
    displayProvider,
    vendorId,
    route: vendorId,
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
  return entries.filter((entry) => !isDecommissioned(entry.modelId))
}
