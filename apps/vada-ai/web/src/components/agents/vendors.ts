export type VendorId = 'anthropic' | 'google' | 'openai' | 'xai' | 'meta' | 'deepseek'

export interface VendorVisual {
  displayName: string
  color: string
}

export const VENDORS: Record<VendorId, VendorVisual> = {
  anthropic: { displayName: 'Anthropic', color: 'var(--vendor-anthropic)' },
  google: { displayName: 'Google', color: 'var(--vendor-google)' },
  openai: { displayName: 'OpenAI', color: 'var(--vendor-openai)' },
  xai: { displayName: 'xAI', color: 'var(--vendor-xai)' },
  meta: { displayName: 'Meta', color: 'var(--vendor-meta)' },
  deepseek: { displayName: 'DeepSeek', color: 'var(--vendor-deepseek)' }
}

const MODEL_PREFIX_MAP: Array<[string, VendorId]> = [
  ['claude-', 'anthropic'],
  ['gemini-', 'google'],
  ['gpt-', 'openai'],
  ['o4-', 'openai'],
  ['o3-', 'openai'],
  ['o1-', 'openai'],
  ['grok-', 'xai'],
  ['llama-', 'meta'],
  ['deepseek-', 'deepseek']
]

export function inferVendor(model: string): VendorId | undefined {
  const lower = model.toLowerCase()
  for (const [prefix, vendorId] of MODEL_PREFIX_MAP) {
    if (lower.startsWith(prefix)) return vendorId
  }
  return undefined
}
