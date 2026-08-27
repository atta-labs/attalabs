import { describe, expect, it } from 'vitest'
import { clamp01, computeCardStageProgress, computeDeployedPx } from './deployment-progress'

describe('clamp01', () => {
  it('passes values inside [0, 1] through unchanged', () => {
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(1)).toBe(1)
  })

  it('clamps below 0 to 0 and above 1 to 1', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(4)).toBe(1)
  })
})

describe('computeDeployedPx', () => {
  it('is 0 when the track has not been reached yet (line well above the track top)', () => {
    expect(computeDeployedPx(2000, 500, 3000)).toBe(0)
  })

  it('grows as the track top approaches the line', () => {
    expect(computeDeployedPx(2000, 500, 100)).toBe(400)
    expect(computeDeployedPx(2000, 500, 0)).toBe(500)
  })

  it('clamps at H once fully scrolled past the track', () => {
    expect(computeDeployedPx(2000, 500, -5000)).toBe(2000)
  })

  it('never goes negative even when trackTop is far below line', () => {
    expect(computeDeployedPx(2000, 500, 9000)).toBe(0)
  })
})

describe('computeCardStageProgress', () => {
  it('is all-zero at q=0 (beam has not reached the card)', () => {
    expect(computeCardStageProgress(0)).toEqual({ b: 0, a: 0, c: 0 })
  })

  it('is all-one at q=1 (card fully deployed)', () => {
    expect(computeCardStageProgress(1)).toEqual({ b: 1, a: 1, c: 1 })
  })

  it('junction (b) finishes before spur (a) starts moving', () => {
    // q=0.26 is the seam between the junction window (0→0.26) and the spur window
    // (0.26→0.58) — b must be fully seated exactly as a starts.
    const stage = computeCardStageProgress(0.26)
    expect(stage.b).toBeCloseTo(1, 5)
    expect(stage.a).toBeCloseTo(0, 5)
  })

  it('panel (c) starts fading in right as the spur (a) nears completion', () => {
    // The spur window is 0.26→0.60 (width 0.34) and the panel window is 0.58→1
    // (width 0.42) — c's start at q=0.58 sits just inside a's own window, not
    // exactly at its end, so there's a brief overlap where both animate together
    // rather than a hard handoff.
    const atPanelStart = computeCardStageProgress(0.58)
    expect(atPanelStart.a).toBeCloseTo(0.9412, 4)
    expect(atPanelStart.c).toBeCloseTo(0, 5)

    const atSpurEnd = computeCardStageProgress(0.6)
    expect(atSpurEnd.a).toBeCloseTo(1, 5)
  })

  it('stages are monotonically non-decreasing as q increases (no rewind glitch)', () => {
    const samples = Array.from({ length: 21 }, (_, i) => i / 20)
    let prev = { b: 0, a: 0, c: 0 }
    for (const q of samples) {
      const stage = computeCardStageProgress(q)
      expect(stage.b).toBeGreaterThanOrEqual(prev.b)
      expect(stage.a).toBeGreaterThanOrEqual(prev.a)
      expect(stage.c).toBeGreaterThanOrEqual(prev.c)
      prev = stage
    }
  })
})
