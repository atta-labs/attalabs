import { describe, expect, it } from 'vitest'
import { CENTER, drillArcs, overviewBands, polarPoint, VIEW_SIZE } from './geometry'

describe('overviewBands', () => {
  it('produces one band per group key plus a static substrate divider after actions, never overlapping', () => {
    const bands = overviewBands(['actors', 'contracts', 'ring0', 'actions', 'ring1', 'ring2'])
    // 6 real groups + 1 static "substrate" (GitHub) divider inserted after `actions`
    expect(bands).toHaveLength(7)
    expect(bands.map((b) => b.key)).toEqual(['actors', 'contracts', 'ring0', 'actions', 'substrate', 'ring1', 'ring2'])
    // Returned outermost-first (matches GROUP_ORDER) — radius shrinks toward
    // the hub as you walk the array, ring2 ending up closest to `main`.
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].rOut).toBeLessThanOrEqual(bands[i - 1].rIn)
    }
    expect(bands[0].key).toBe('actors')
    expect(bands[bands.length - 1].key).toBe('ring2')
    expect(bands[0].rOut).toBeGreaterThan(bands[bands.length - 1].rOut)
  })

  it('three width tiers: actors/ring0 widest, ring1/ring2/substrate thick, contracts/actions (seam) narrowest', () => {
    // Round-2 fix: rendering `substrate` thin was a classification bug.
    // GitHub isn't a hand-off, it's substrate — Issue #508 names exactly
    // two SEAM rings (contracts, actions); everything else is a real
    // governed object. `actors`/`ring0` were later widened past the rest of
    // the thick bands on explicit request, making three width tiers instead
    // of two.
    const bands = overviewBands(['actors', 'contracts', 'ring0', 'actions', 'ring1', 'ring2'])
    const widthOf = (key: string) => {
      const b = bands.find((band) => band.key === key)
      if (!b) throw new Error(`missing band ${key}`)
      return b.rOut - b.rIn
    }
    expect(widthOf('ring0')).toBe(widthOf('actors'))
    expect(widthOf('ring1')).toBe(widthOf('substrate'))
    expect(widthOf('ring2')).toBe(widthOf('substrate'))
    expect(widthOf('contracts')).toBe(widthOf('actions'))
    expect(widthOf('actors')).toBeGreaterThan(widthOf('substrate'))
    expect(widthOf('substrate')).toBeGreaterThan(widthOf('contracts'))
  })

  it('the outermost band never exceeds the viewBox — clips the ring otherwise', () => {
    const bands = overviewBands(['actors', 'contracts', 'ring0', 'actions', 'ring1', 'ring2'])
    const outerRadius = Math.max(...bands.map((b) => b.rOut))
    expect(outerRadius).toBeLessThan(CENTER.x)
    expect(outerRadius).toBeLessThan(VIEW_SIZE / 2)
  })
})

describe('drillArcs', () => {
  it('splits N children into N equal-span sectors — angle is 360/N, not fixed', () => {
    const three = drillArcs(['a', 'b', 'c'])
    const six = drillArcs(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(three).toHaveLength(3)
    expect(six).toHaveLength(6)
    // six arcs pack tighter (smaller distance between adjacent centroids) than three
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
    const threeGap = dist(three[0].centroid, three[1].centroid)
    const sixGap = dist(six[0].centroid, six[1].centroid)
    expect(sixGap).toBeLessThan(threeGap)
  })

  it('returns an empty array for zero children — never fabricates a placeholder sector', () => {
    expect(drillArcs([])).toEqual([])
  })
})

describe('polarPoint', () => {
  it('places angle 0 directly above the center (12 o clock)', () => {
    const p = polarPoint(100, 0, { x: 0, y: 0 })
    expect(p.x).toBeCloseTo(0, 5)
    expect(p.y).toBeCloseTo(-100, 5)
  })

  it('places angle 90 directly right of the center (3 o clock)', () => {
    const p = polarPoint(100, 90, { x: 0, y: 0 })
    expect(p.x).toBeCloseTo(100, 5)
    expect(p.y).toBeCloseTo(0, 5)
  })
})
