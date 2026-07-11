import { unstable_cache } from 'next/cache'

import type { VendorId } from './vendors'
import { FALLBACK_CATALOG } from './fallback'
import { fetchModelsDev } from './sources/models-dev'
import { OLLAMA_DEFAULT_CATALOG } from './sources/ollama-defaults'
import { transformModelsDev } from './transform'

export interface ModelEntry {
  id: string
  modelId: string
  /** Brand used for icon rendering (@lobehub/icons). Independent of vendorId. */
  displayProvider: string
  vendorId: VendorId
  /** @deprecated Use vendorId — kept for backward compat while consumers migrate */
  route: VendorId
  label: string
  description?: string
  tier: 'frontier' | 'balanced' | 'fast' | 'reasoning'
  cost: 'free' | 'paid'
}

const REVALIDATE_SECONDS = 60 * 60 * 24 // 24h

// Wrap the fetch + transform together. The raw models.dev response is ~2.3MB
// (above Next's 2MB per-item fetch-cache cap), but the transformed entry array
// is small, so we cache that instead.
const getCatalogCached = unstable_cache(
  async (): Promise<ModelEntry[]> => {
    const raw = await fetchModelsDev()
    return transformModelsDev(raw)
  },
  ['atta-models-catalog-v2'],
  { revalidate: REVALIDATE_SECONDS, tags: ['atta-models-catalog'] }
)

// Fetches the canonical catalog from models.dev. Cached 24h via Next.js.
// On fetch or parse failure, returns FALLBACK_CATALOG so the app keeps working.
// Always appends OLLAMA_DEFAULT_CATALOG since Ollama models aren't indexed on
// models.dev (they're locally-pulled, not hosted).
export async function getCatalog(): Promise<ModelEntry[]> {
  try {
    const entries = await getCatalogCached()
    if (entries.length === 0) return [...FALLBACK_CATALOG, ...OLLAMA_DEFAULT_CATALOG]
    return [...entries, ...OLLAMA_DEFAULT_CATALOG]
  } catch {
    return [...FALLBACK_CATALOG, ...OLLAMA_DEFAULT_CATALOG]
  }
}

export function findModelEntry(catalog: ModelEntry[], vendorId: VendorId, modelId: string): ModelEntry | undefined {
  return catalog.find((e) => e.vendorId === vendorId && e.modelId === modelId)
}

export function findModelEntryByModelId(catalog: ModelEntry[], modelId: string): ModelEntry | undefined {
  return catalog.find((e) => e.modelId === modelId)
}
