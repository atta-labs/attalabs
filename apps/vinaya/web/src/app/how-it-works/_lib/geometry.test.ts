import { describe, expect, it } from 'vitest'
import { drillArcs, overviewBands, polarPoint } from './geometry'

describe('overviewBands', () => {
  it('produces one concentric band per group key, strictly increasing radius, never overlapping', () => {
    const bands = overviewBands(['ring0', 'ring1', 'ring2', 'action-github', 'action-internal', 'actors'])
    expect(bands).toHaveLength(6)
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].rIn).toBeGreaterThan(bands[i - 1].rOut)
    }
  })
})

describe('drillArcs', () => {
  it('splits N children into N equal-span sectors — angle is 360/N, not fixed', () => {
    const three = drillArcs(['a', 'b', 'c'])
    const six = drillArcs(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(three).toHaveLength(3)
    expect(six).toHaveLength(6)
    // six arcs pack tighter (smaller angular gap between midpoints) than three
    const threeSpan = three[1].midAngle - three[0].midAngle
    const sixSpan = six[1].midAngle - six[0].midAngle
    expect(sixSpan).toBeLessThan(threeSpan)
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
