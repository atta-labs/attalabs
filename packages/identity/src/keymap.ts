import type { VendorId } from '@atta/models'

export type ApiKeyMap = Partial<Record<VendorId, string>>

export interface ModelRef {
  provider: VendorId
  modelId: string
}

export function collectRequiredProviders(configs: ModelRef[]): Set<VendorId> {
  const set = new Set<VendorId>()
  for (const c of configs) set.add(c.provider)
  return set
}

export function hasProviderKey(keys: ApiKeyMap, provider: VendorId): boolean {
  const v = keys[provider]
  return typeof v === 'string' && v.length > 0
}

export function missingProviders(keys: ApiKeyMap, required: Set<VendorId>): VendorId[] {
  const missing: VendorId[] = []
  for (const p of required) if (!hasProviderKey(keys, p)) missing.push(p)
  return missing
}
