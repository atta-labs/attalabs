import type { RouteProvider } from '@atta/models'

export type ApiKeyMap = Partial<Record<RouteProvider, string>>

export interface ModelRef {
  provider: RouteProvider
  modelId: string
}

export function collectRequiredProviders(configs: ModelRef[]): Set<RouteProvider> {
  const set = new Set<RouteProvider>()
  for (const c of configs) set.add(c.provider)
  return set
}

export function hasProviderKey(keys: ApiKeyMap, provider: RouteProvider): boolean {
  const v = keys[provider]
  return typeof v === 'string' && v.length > 0
}

export function missingProviders(keys: ApiKeyMap, required: Set<RouteProvider>): RouteProvider[] {
  const missing: RouteProvider[] = []
  for (const p of required) if (!hasProviderKey(keys, p)) missing.push(p)
  return missing
}
