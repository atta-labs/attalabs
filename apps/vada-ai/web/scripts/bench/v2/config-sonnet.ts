// V2 Step 3.5 — Sonnet replication config.
// DO NOT modify config.ts — Haiku config must remain clean for Haiku runs.

export const V2S_MODEL_ID = 'claude-sonnet-4-6'
export const V2S_MODEL_PROVIDER = 'anthropic'
export const V2S_JUDGE_MODEL_ID = 'claude-sonnet-4-6'
export const V2S_RUNS_PER_CONFIG = 3

export function assertSonnetModelId(modelId: string) {
  if (modelId !== V2S_MODEL_ID) {
    throw new Error(`Model mismatch: expected ${V2S_MODEL_ID}, got ${modelId}. Task 3.5 must use Sonnet throughout.`)
  }
}
