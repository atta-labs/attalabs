import { describe, expect, it } from 'bun:test'
import { estimateInputCost } from './adapter'

describe('estimateInputCost', () => {
  it('computes tokens and cost for a known-priced model', () => {
    const text = 'a'.repeat(10)
    const result = estimateInputCost(text, 'claude-sonnet-4-6')

    expect(result.tokens).toBe(Math.ceil(text.length / 4))
    expect(result.tokens).toBe(3)
    // claude-sonnet-4-6 input rate: $3.00 / 1M tokens → 3 * 3.0 / 1_000_000
    expect(result.costUsd).toBe(0.000009)
  })

  it('returns null cost but still computes tokens for an unpriced model', () => {
    const text = 'a'.repeat(10)
    const result = estimateInputCost(text, 'not-a-real-model')

    expect(result.tokens).toBe(Math.ceil(text.length / 4))
    expect(result.costUsd).toBeNull()
  })

  it('returns zero tokens for an empty string', () => {
    const result = estimateInputCost('', 'claude-sonnet-4-6')

    expect(result.tokens).toBe(0)
  })
})
