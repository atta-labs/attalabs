import { describe, expect, it } from 'vitest'
import { clamp01, enterProgress, pinFits, pinProgress } from './pin-math'

describe('pinFits', () => {
  it('needs both 1000 wide and 620 tall', () => {
    expect(pinFits(1000, 620)).toBe(true)
    expect(pinFits(999, 800)).toBe(false)
    expect(pinFits(1280, 619)).toBe(false)
  })
})

describe('pinProgress', () => {
  it('runs 0 to 1 across the runway', () => {
    expect(pinProgress(100, 2000, 800)).toBe(0)
    expect(pinProgress(-600, 2000, 800)).toBe(0.5)
    expect(pinProgress(-1200, 2000, 800)).toBe(1)
    expect(pinProgress(-5000, 2000, 800)).toBe(1)
  })
  it('survives a runway no taller than the viewport', () => {
    expect(pinProgress(-10, 800, 800)).toBe(1)
  })
})

describe('enterProgress', () => {
  it('starts when the top crosses the start line', () => {
    expect(enterProgress(720, 800, 0.9, 0.6)).toBe(0)
    expect(enterProgress(480, 800, 0.9, 0.6)).toBe(0.5)
    expect(enterProgress(0, 800, 0.9, 0.6)).toBe(1)
  })
})

describe('clamp01', () => {
  it('clamps', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
  })
})
