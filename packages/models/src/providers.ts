// Backward-compatibility shim — do not use in new code.
// Import from @atta/models using VendorId / VENDORS / VENDOR_ORDER instead.
import type { VendorId, Vendor } from './vendors'
import { VENDORS, VENDOR_ORDER, OLLAMA_BASE_URL as _OLLAMA_BASE_URL } from './vendors'

/** @deprecated Use VendorId from vendors.ts */
export type RouteProvider = VendorId
/** @deprecated displayProvider on ModelEntry is now just string */
export type DisplayProvider = string

export interface ProviderMeta {
  id: RouteProvider
  label: string
  keyPrefix: string
  keyPlaceholder: string
  envVar: string
}

export const PROVIDERS: Record<RouteProvider, ProviderMeta> = Object.fromEntries(
  Object.entries(VENDORS).map(([id, v]) => {
    const vendor = v as Vendor
    return [
      id as RouteProvider,
      {
        id: id as RouteProvider,
        label: vendor.label,
        keyPrefix: vendor.keyPrefix ?? '',
        keyPlaceholder: vendor.localOnly
          ? 'no key needed — press Save to enable'
          : vendor.keyPrefix
            ? `${vendor.keyPrefix}…`
            : 'Your API key',
        envVar: vendor.envVar ?? ''
      } satisfies ProviderMeta
    ]
  })
) as Record<RouteProvider, ProviderMeta>

export const ROUTE_PROVIDER_ORDER: RouteProvider[] = VENDOR_ORDER

export const OLLAMA_BASE_URL = _OLLAMA_BASE_URL
