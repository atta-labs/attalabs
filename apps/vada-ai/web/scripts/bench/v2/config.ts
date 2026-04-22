export const V2_MODEL_ID = 'claude-haiku-4-5-20251001'
export const V2_MODEL_PROVIDER = 'anthropic' as const
export const V2_RUNS_PER_CONFIG = 3 // N=3 for Step 1 diagnostic; Step 4 uses N=5
export const V2_JUDGE_MODEL_ID = 'claude-haiku-4-5-20251001'

export function assertModelId(modelId: string, expected: string) {
  if (modelId !== expected) {
    throw new Error(
      `Model mismatch: expected ${expected}, got ${modelId}. V2 experiments must use Haiku 4.5 throughout.`
    )
  }
}
