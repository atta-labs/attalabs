import type { ModelEntry } from '@atta/models'
import { findModelEntryByModelId, resolveVendorByPrefix } from '@atta/models'

const STORAGE_KEY_PREFIX = 'vada:team:'

/** agentName → modelId — same format for every team type */
export type ReviewerConfig = Record<string, string>

export function getReviewerConfig(specId: string): ReviewerConfig | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + specId)
    return raw ? (JSON.parse(raw) as ReviewerConfig) : null
  } catch {
    return null
  }
}

export function setReviewerConfig(specId: string, config: ReviewerConfig): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PREFIX + specId, JSON.stringify(config))
}

export function clearReviewerConfig(specId: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_PREFIX + specId)
}

/**
 * Returns true if every model in the config has a corresponding configured
 * provider. When `catalog` is provided it is the authoritative source for the
 * model's route (covers Groq / DeepSeek / OpenRouter / etc.); the prefix
 * fallback is kept for the four core vendors when catalog isn't available.
 */
export function validateKeysForConfig(
  config: ReviewerConfig,
  configuredProviders: string[],
  catalog?: ModelEntry[]
): boolean {
  for (const model of Object.values(config)) {
    const vendor = resolveVendor(model, catalog)
    if (!vendor) return false
    // Ollama is local — no API key concept. If a config references an ollama
    // model, the picker only allowed it when the local server was reachable.
    if (vendor === 'ollama') continue
    if (!configuredProviders.includes(vendor)) return false
  }
  return true
}

/**
 * Resolves a model's vendorId. Catalog lookup is authoritative (covers cross-vendor
 * models like deepseek-r1-distill served by Groq); prefix-based fallback handles
 * models not in the catalog.
 */
export function resolveVendor(model: string, catalog?: ModelEntry[]): string | null {
  if (catalog) {
    const entry = findModelEntryByModelId(catalog, model)
    if (entry) return entry.vendorId
  }
  return resolveVendorByPrefix(model)
}
