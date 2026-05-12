import { describe, it, expect } from 'bun:test'
import { DECOMMISSIONED_MODEL_IDS, isDecommissioned } from './deprecations'

describe('decommissioned models', () => {
  it('marks deepseek-r1-distill-llama-70b as decommissioned', () => {
    expect(isDecommissioned('deepseek-r1-distill-llama-70b')).toBe(true)
  })

  it('does not mark active models as decommissioned', () => {
    expect(isDecommissioned('claude-sonnet-4-6')).toBe(false)
    expect(isDecommissioned('gemini-2.5-pro')).toBe(false)
    expect(isDecommissioned('llama-3.3-70b-versatile')).toBe(false)
  })

  it('returns false for unknown model ids', () => {
    expect(isDecommissioned('some-unknown-model-9000')).toBe(false)
  })

  it('exposes the underlying set for inspection', () => {
    expect(DECOMMISSIONED_MODEL_IDS.has('deepseek-r1-distill-llama-70b')).toBe(true)
  })
})
