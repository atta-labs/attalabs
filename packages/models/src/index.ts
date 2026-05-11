import type { VendorId } from './vendors'

// Vendor registry — single source of truth for SDK shapes, base URLs, key conventions
export type { VendorId, Vendor, SdkShape, KeyConvention } from './vendors'
export { VENDORS, VENDOR_ORDER, OLLAMA_BASE_URL, getVendor, isLocalOnly, resolveVendorByPrefix } from './vendors'

// Backward-compat shim (RouteProvider = VendorId alias; PROVIDERS; ROUTE_PROVIDER_ORDER)
export type { RouteProvider, DisplayProvider, ProviderMeta } from './providers'
export { PROVIDERS, ROUTE_PROVIDER_ORDER } from './providers'

// Catalog
export type { ModelEntry } from './catalog'
export { getCatalog, findModelEntry, findModelEntryByModelId } from './catalog'

export { FALLBACK_CATALOG } from './fallback'

export { OVERLAY } from './overlay'

export { CatalogProvider, useCatalog, type CatalogProviderProps } from './provider'

// ModelConfig — shape used by GlobalModelSelector and form validation.
// 'provider' maps to vendorId; retained for UI backward compat.
export interface ModelConfig {
  provider: VendorId
  modelId: string
  apiKey?: string
}
