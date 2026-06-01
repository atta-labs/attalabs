import { DECOMMISSIONED_MODEL_IDS } from './deprecations'
import { FALLBACK_CATALOG } from './fallback'

/**
 * Resolve a model spec to a concrete model ID for CLI dispatch (e.g. cetana).
 *
 * Spec formats:
 * - "<vendor>/<tier>" → resolves to the current non-decommissioned model for that
 *   vendor+tier from FALLBACK_CATALOG.
 *   Example: "anthropic/balanced" → "claude-sonnet-4-6" (until deprecated)
 * - "<modelId>" → returned as-is for backward compatibility.
 *   Example: "claude-sonnet-4-6"
 *
 * When a model is deprecated (no config or code changes needed):
 *   1. Add its modelId to DECOMMISSIONED_MODEL_IDS in deprecations.ts
 *   2. Update FALLBACK_CATALOG in fallback.ts with the replacement entry
 *   All dispatches automatically resolve to the new model on next run.
 */
export function resolveDispatchModel(spec: string): string {
  const match = spec.match(/^([a-z]+)\/([a-z]+)$/)
  if (!match) return spec

  const [, vendor, tier] = match

  const candidate = FALLBACK_CATALOG.find(
    (entry) => entry.vendorId === vendor && entry.tier === tier && !DECOMMISSIONED_MODEL_IDS.has(entry.modelId)
  )

  if (!candidate) {
    throw new Error(
      `No active model found for spec "${spec}". Update FALLBACK_CATALOG in packages/models/src/fallback.ts.`
    )
  }

  return candidate.modelId
}
