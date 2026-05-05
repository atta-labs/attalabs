import type { ModelEntry } from '@atta/models'
import { findModelEntryByModelId } from '@atta/models'

const STORAGE_KEY_PREFIX = 'vada:reviewer-models:'

/** agentName → modelId string */
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
 * Resolves a model's vendor (provider key). Catalog lookup is preferred — it
 * matches what the picker uses and works for any model. Prefix fallback covers
 * native routes when a catalog isn't available (e.g. server-side or stripped
 * model strings). xAI is NOT a RouteProvider — Grok models route via OpenRouter,
 * so a bare 'grok-3' string resolves to 'openrouter'.
 */
export function resolveVendor(model: string, catalog?: ModelEntry[]): string | null {
  if (catalog) {
    const entry = findModelEntryByModelId(catalog, model)
    if (entry) return entry.route
  }
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gemini-')) return 'google'
  if (model.startsWith('gpt-') || model.startsWith('o4-')) return 'openai'
  if (model.startsWith('grok-')) return 'openrouter'
  return null
}
