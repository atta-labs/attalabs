// Token pricing constants (per token, not per 1M) — update if rates change.
// Source: Anthropic pricing page, 2026-04.

type ModelPricing = { input: number; output: number }

const PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-opus-4-7': { input: 15 / 1_000_000, output: 75 / 1_000_000 }
}

const FALLBACK: ModelPricing = { input: 3 / 1_000_000, output: 15 / 1_000_000 }

export function computeCost(
  modelId: string | null | undefined,
  tokensInput: number | null | undefined,
  tokensOutput: number | null | undefined
): number {
  const pricing = PRICING[modelId ?? ''] ?? FALLBACK
  return (tokensInput ?? 0) * pricing.input + (tokensOutput ?? 0) * pricing.output
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return '$0.0000'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}
