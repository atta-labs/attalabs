import { describe, it, expect } from 'bun:test'
import { isRankedTier, meetsMinTier } from './tiers'

describe('isRankedTier', () => {
  it('returns false only for reasoning', () => {
    expect(isRankedTier('reasoning')).toBe(false)
  })

  it('returns true for every other tier', () => {
    expect(isRankedTier('frontier')).toBe(true)
    expect(isRankedTier('balanced')).toBe(true)
    expect(isRankedTier('fast')).toBe(true)
  })
})

describe('meetsMinTier', () => {
  it('frontier meets a balanced floor', () => {
    expect(meetsMinTier('frontier', 'balanced')).toBe(true)
  })

  it('fast does not meet a balanced floor', () => {
    expect(meetsMinTier('fast', 'balanced')).toBe(false)
  })

  it('balanced meets a balanced floor (boundary is >=, not >)', () => {
    expect(meetsMinTier('balanced', 'balanced')).toBe(true)
  })

  it('reasoning meets no floor, including fast', () => {
    expect(meetsMinTier('reasoning', 'fast')).toBe(false)
    expect(meetsMinTier('reasoning', 'balanced')).toBe(false)
    expect(meetsMinTier('reasoning', 'frontier')).toBe(false)
  })
})
