export type { DisplayProvider, ProviderMeta, RouteProvider } from './providers'
export { PROVIDERS, ROUTE_PROVIDER_ORDER } from './providers'

export type { ModelEntry } from './catalog'
export { getCatalog, findModelEntry, findModelEntryByModelId } from './catalog'

export { FALLBACK_CATALOG } from './fallback'

export { getStoredApiKey, removeStoredApiKey, storeApiKey } from './storage'

// ModelConfig — the shape passed to the Vada engine's resolveModel.
// Historically lived at apps/vada-ai/web/src/lib/models.ts (to be deleted in Task 14).
export interface ModelConfig {
  provider: import('./providers').RouteProvider
  modelId: string
  apiKey?: string
}
