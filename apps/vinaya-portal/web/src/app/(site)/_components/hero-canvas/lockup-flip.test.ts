import { describe, expect, it } from 'vitest'
// @ts-expect-error — plain-JS module with no type declarations
import { barReveal, FLIP } from './lockup-flip'

describe('barReveal', () => {
  it('keeps the bar controls fully hidden at rest', () => {
    expect(barReveal(0)).toBe(0)
  })

  it('starts revealing on the first scroll movement', () => {
    expect(barReveal(0.001)).toBeGreaterThan(0)
  })

  it('is fully shown by FLIP.BAR_REVEAL_END, well before the lockup docks', () => {
    expect(FLIP.BAR_REVEAL_END).toBeLessThan(FLIP.TRAVEL_END / 2)
    expect(barReveal(FLIP.BAR_REVEAL_END)).toBe(1)
    expect(barReveal(FLIP.TRAVEL_END)).toBe(1)
    expect(barReveal(1)).toBe(1)
  })

  it('rises continuously, with no step', () => {
    let prev = barReveal(0)
    for (let i = 1; i <= 1000; i++) {
      const next = barReveal((i / 1000) * FLIP.BAR_REVEAL_END)
      expect(next).toBeGreaterThan(prev)
      expect(next - prev).toBeLessThan(0.01)
      prev = next
    }
  })
})
