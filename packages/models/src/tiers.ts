import type { ModelEntry } from './catalog'

/**
 * Capability floor over `ModelEntry.tier` — distinct from the picker's
 * display-sort ordering (`packages/ui/.../model-picker.tsx`'s private
 * `TIER_ORDER`, which only answers "what to show first"). This answers
 * "is this model strong enough for a given role".
 *
 * `reasoning` is deliberately excluded from the ranked scale: whether
 * reasoning-tier models (o3, deepseek-r1) outperform a frontier model at
 * strict-JSON synthesis over large multi-agent inputs has not been measured.
 * Ranking `reasoning` either way would hardcode an unmeasured claim into a
 * safety floor, so `meetsMinTier` fails closed against it — a reasoning-tier
 * model satisfies no floor until a role opts it in explicitly. Give it a rank
 * here once a benchmark has actually compared the two on that task shape.
 */
export type MinTier = 'frontier' | 'balanced' | 'fast'

export const TIER_RANK: Record<MinTier, number> = { frontier: 3, balanced: 2, fast: 1 }

export function isRankedTier(tier: ModelEntry['tier']): tier is MinTier {
  return tier !== 'reasoning'
}

export function meetsMinTier(tier: ModelEntry['tier'], minTier: MinTier): boolean {
  if (!isRankedTier(tier)) return false
  return TIER_RANK[tier] >= TIER_RANK[minTier]
}
