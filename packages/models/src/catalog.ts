import type { DisplayProvider, RouteProvider } from './providers'
import { FALLBACK_CATALOG } from './fallback'
import { fetchModelsDev } from './sources/models-dev'
import { transformModelsDev } from './transform'

export interface ModelEntry {
  id: string
  modelId: string
  displayProvider: DisplayProvider
  route: RouteProvider
  label: string
  description?: string
  tier: 'frontier' | 'balanced' | 'fast' | 'reasoning'
  cost: 'free' | 'paid'
}

// Fetches the canonical catalog from models.dev (24h revalidate via Next.js data cache).
// On fetch or parse failure, returns FALLBACK_CATALOG so the app keeps working.
export async function getCatalog(): Promise<ModelEntry[]> {
  try {
    const raw = await fetchModelsDev()
    const entries = transformModelsDev(raw)
    if (entries.length === 0) return FALLBACK_CATALOG
    return entries
  } catch {
    return FALLBACK_CATALOG
  }
}

export function findModelEntry(catalog: ModelEntry[], route: RouteProvider, modelId: string): ModelEntry | undefined {
  return catalog.find((e) => e.route === route && e.modelId === modelId)
}

export function findModelEntryByModelId(catalog: ModelEntry[], modelId: string): ModelEntry | undefined {
  return catalog.find((e) => e.modelId === modelId)
}
