import { describe, expect, it } from 'vitest'
import {
  clamp01,
  computeCardProgress,
  computeCardStageProgress,
  computeDeployedPx,
  computeTrackFrame,
  type TrackFrameGeometry,
  type TrackFrameHistory
} from './deployment-progress'

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

describe('computeTrackFrame', () => {
  // The full per-frame computation `DeploymentTrack.tsx`'s scroll effect actually calls —
  // exercising this, not just the smaller pure helpers in isolation, is what lets these
  // tests catch the regression the designer-handoff contract exists to prevent: the beam's
  // velocity/history state (the one thing genuinely carried frame-to-frame) leaking into
  // the beam's position or a card's stage.
  const baseGeometry: TrackFrameGeometry = {
    reduced: false,
    trackHeight: 2000,
    trackTop: 100,
    line: 500,
    spurReach: 110,
    cardOffsets: [
      { top: 800, height: 200 },
      { top: 1400, height: 200 }
    ]
  }

  it('computes deployed position and every card stage from geometry alone — varying carried history changes nothing but the velocity target', () => {
    // Same current-frame geometry every time; only the carried history differs, as if this
    // frame were reached by a slow approach, a fast approach, or no prior frame at all. A
    // buggy implementation that blended history into position (the exact regression this
    // split guards against) would make `deployed`/`cardStages` differ across these — the
    // correct implementation cannot, since `history` never reaches that part of the return
    // value.
    const histories: TrackFrameHistory[] = [
      { lastDeployed: null, velTarget: 0 },
      { lastDeployed: 0, velTarget: 0 },
      { lastDeployed: 9999, velTarget: 1 },
      { lastDeployed: 401, velTarget: 0.5 }
    ]

    const results = histories.map((history) => computeTrackFrame(baseGeometry, history))
    const [reference, ...rest] = results

    for (const result of rest) {
      expect(result.deployed).toBe(reference.deployed)
      expect(result.cardStages).toEqual(reference.cardStages)
      expect(result.installDoneAt).toBe(reference.installDoneAt)
    }
  })

  it('does let history change the velocity target — the one output allowed to carry state', () => {
    // A large jump from the previous frame's deployed position reads as fast motion; the
    // point of this test is to confirm the history argument does something (it drives
    // `velTarget`), so the previous test's "nothing changes" result isn't just history being
    // silently ignored altogether.
    const noJump = computeTrackFrame(baseGeometry, { lastDeployed: null, velTarget: 0 })
    const bigJump = computeTrackFrame(baseGeometry, { lastDeployed: 0, velTarget: 0 })
    expect(bigJump.velTarget).toBeGreaterThan(noJump.velTarget)
  })

  it('reproduces the same deployed position and card stages at a revisited scroll position, regardless of the history that led there', () => {
    // Same `trackTop` (the same real scroll position) visited twice, fed drastically
    // different carried history each time — one resembling a slow approach from above, the
    // other a fast approach from below, as scrolling back up through this point would
    // produce. Position and every card's stage must still match exactly; only the cosmetic
    // velocity target may differ.
    const revisited: TrackFrameGeometry = { ...baseGeometry, trackTop: -300 }
    // `revisited`'s own deployed position works out to 800px (see `computeDeployedPx`); one
    // history has the previous frame only 10px away (a slow approach), the other 800px away
    // (a fast, near-instant jump) — different enough that the resulting velocity target
    // actually differs, without both saturating at the same clamp ceiling.
    const arrivedSlowlyFromAbove = computeTrackFrame(revisited, { lastDeployed: 790, velTarget: 0.05 })
    const arrivedFastFromBelow = computeTrackFrame(revisited, { lastDeployed: 0, velTarget: 0.05 })

    expect(arrivedFastFromBelow.deployed).toBe(arrivedSlowlyFromAbove.deployed)
    expect(arrivedFastFromBelow.cardStages).toEqual(arrivedSlowlyFromAbove.cardStages)
    expect(arrivedFastFromBelow.velTarget).not.toBe(arrivedSlowlyFromAbove.velTarget)
  })

  it('threading history frame-to-frame through a realistic forward-then-backward scroll still rewinds every card exactly', () => {
    // Simulates how `DeploymentTrack.tsx` actually drives this function: each call's
    // history comes from the PREVIOUS call's own result, not a hand-picked value. Walk
    // `trackTop` from far below the track up past it (scrolling down) and then back
    // (scrolling up) through the same positions, threading history correctly each step, and
    // assert every revisited position reproduces the exact same card stages.
    const trackTops = [900, 700, 500, 300, 150, 50, -50, -150, -300, -500]

    function run(path: number[]) {
      let history: TrackFrameHistory = { lastDeployed: null, velTarget: 0 }
      const framesByTrackTop = new Map<number, ReturnType<typeof computeTrackFrame>>()
      for (const trackTop of path) {
        const frame = computeTrackFrame({ ...baseGeometry, trackTop }, history)
        framesByTrackTop.set(trackTop, frame)
        history = { lastDeployed: frame.deployed, velTarget: frame.velTarget }
      }
      return framesByTrackTop
    }

    const forward = run(trackTops)
    const backward = run([...trackTops].reverse())

    for (const trackTop of trackTops) {
      expect(backward.get(trackTop)?.deployed).toBe(forward.get(trackTop)?.deployed)
      expect(backward.get(trackTop)?.cardStages).toEqual(forward.get(trackTop)?.cardStages)
    }
  })
})
