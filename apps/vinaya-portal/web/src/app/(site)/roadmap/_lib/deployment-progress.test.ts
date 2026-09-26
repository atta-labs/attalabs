import { describe, expect, it } from 'vitest'
import { clamp01, computeCardProgress, computeCardStageProgress, computeDeployedPx } from './deployment-progress'

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

describe('computeCardProgress', () => {
  it('is 0 before the beam tip reaches the card', () => {
    expect(computeCardProgress(0, 500, 110)).toBe(0)
    expect(computeCardProgress(400, 500, 110)).toBe(0)
  })

  it('is 1 once the beam has cleared spurReach past the card mid', () => {
    expect(computeCardProgress(610, 500, 110)).toBe(1)
    expect(computeCardProgress(9000, 500, 110)).toBe(1)
  })

  it('scales linearly between the card mid and mid + spurReach', () => {
    expect(computeCardProgress(555, 500, 110)).toBeCloseTo(0.5, 10)
  })

  it('takes no viewport-width input — the same triple always yields the same q regardless of layout split', () => {
    // The function's signature alone guarantees this (no width/side parameter exists to
    // branch on); this test pins that shape so a later change can't quietly add one.
    expect(computeCardProgress.length).toBe(3)
    expect(computeCardProgress(555, 500, 110)).toBe(computeCardProgress(555, 500, 110))
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

describe('exact rewind through the full pipeline', () => {
  // The designer-handoff contract: a card's animated state is a pure function of current
  // scroll position, recomputed fresh every frame — nothing eased or lagged feeds it. This
  // walks a beam position forward through a card's whole travel, then re-derives the same
  // positions in reverse (as a scroll-back would), and asserts every value the way back
  // matches its forward counterpart exactly — not approximately, not close, identical.
  it('re-deriving stage progress at a prior scroll position reproduces the forward value exactly', () => {
    const cardMid = 800
    const spurReach = 110
    const deployedSamples = [0, 150, 400, 700, 780, 800, 830, 855, 875, 900, 910, 1000, 5000]

    const stageAt = (deployed: number) => computeCardStageProgress(computeCardProgress(deployed, cardMid, spurReach))

    const forward = deployedSamples.map(stageAt)
    const backward = [...deployedSamples].reverse().map(stageAt)

    forward.forEach((stage, i) => {
      const rewound = backward[deployedSamples.length - 1 - i]
      expect(rewound).toEqual(stage)
    })
  })

  it('reproduces the same stage at the same scroll position regardless of which direction reached it', () => {
    const cardMid = 800
    const spurReach = 110
    const stageAt = (deployed: number) => computeCardStageProgress(computeCardProgress(deployed, cardMid, spurReach))

    // Simulate scrolling forward past the card, then back to a mid-transition point, then
    // forward again — the value at 830 must be identical every time it's revisited.
    const path = [0, 400, 830, 900, 1000, 900, 830, 400, 830]
    const results = path.map(stageAt)

    expect(results[2]).toEqual(results[6])
    expect(results[2]).toEqual(results[8])
  })
})
