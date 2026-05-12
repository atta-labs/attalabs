// Hand-maintained list of model ids that upstream catalogs (models.dev,
// OpenRouter) still surface but vendors have decommissioned. Filtered out
// in transformModelsDev so the picker never shows guaranteed-error options.
//
// Add entries when a vendor announces deprecation. Remove entries when a
// vendor un-deprecates (rare) or when upstream catalog updates and the
// entry naturally disappears.
//
// Key: the canonical models.dev model id (modelId field on ModelEntry).

export const DECOMMISSIONED_MODEL_IDS: ReadonlySet<string> = new Set([
  // Groq — decommissioned May 2026 per https://console.groq.com/docs/deprecations
  'deepseek-r1-distill-llama-70b'
])

export function isDecommissioned(modelId: string): boolean {
  return DECOMMISSIONED_MODEL_IDS.has(modelId)
}
