const STORAGE_KEY_PREFIX = 'vada:reviewer-models:'

/** agentName → modelId string */
export type ReviewerConfig = Record<string, string>

export function getReviewerConfig(specId: string): ReviewerConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + specId)
    return raw ? (JSON.parse(raw) as ReviewerConfig) : null
  } catch {
    return null
  }
}

export function setReviewerConfig(specId: string, config: ReviewerConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PREFIX + specId, JSON.stringify(config))
}

export function clearReviewerConfig(specId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_PREFIX + specId)
}

/**
 * Returns true if every model in the config has a corresponding configured
 * provider. Accepts both RouteProvider keys (e.g. 'google') and
 * model-prefix resolution.
 */
export function validateKeysForConfig(config: ReviewerConfig, configuredProviders: string[]): boolean {
  for (const model of Object.values(config)) {
    const vendor = resolveVendor(model)
    if (!vendor) return false
    if (!configuredProviders.includes(vendor)) return false
  }
  return true
}

function resolveVendor(model: string): string | null {
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gemini-')) return 'google'
  if (model.startsWith('gpt-') || model.startsWith('o4-')) return 'openai'
  if (model.startsWith('grok-')) return 'xai'
  return null
}
