import { describe, expect, it } from 'vitest'
import { captureBaseline, compareToBaseline } from './baseline-capture'

describe('captureBaseline', () => {
  it('stamps every entry with the caller-supplied capturedAt', () => {
    const result = captureBaseline(
      [
        { tool: 'verify-docs-full', findingCount: 44 },
        { tool: 'verify-coherence', findingCount: 0 }
      ],
      '2026-07-03T00:00:00Z'
    )
    expect(result).toEqual([
      { tool: 'verify-docs-full', findingCount: 44, capturedAt: '2026-07-03T00:00:00Z' },
      { tool: 'verify-coherence', findingCount: 0, capturedAt: '2026-07-03T00:00:00Z' }
    ])
  })

  it('produces an empty array for empty input', () => {
    expect(captureBaseline([], '2026-07-03T00:00:00Z')).toEqual([])
  })
})

describe('compareToBaseline', () => {
  const baseline = captureBaseline(
    [
      { tool: 'verify-docs-full', findingCount: 44 },
      { tool: 'verify-coherence', findingCount: 2 }
    ],
    '2026-07-03T00:00:00Z'
  )

  it('is within budget when current counts equal the baseline', () => {
    const result = compareToBaseline(
      [
        { tool: 'verify-docs-full', findingCount: 44 },
        { tool: 'verify-coherence', findingCount: 2 }
      ],
      baseline
    )
    expect(result.withinBudget).toBe(true)
    expect(result.delta).toBe(0)
  })

  it('is within budget when current counts improve on the baseline', () => {
    const result = compareToBaseline(
      [
        { tool: 'verify-docs-full', findingCount: 40 },
        { tool: 'verify-coherence', findingCount: 2 }
      ],
      baseline
    )
    expect(result.withinBudget).toBe(true)
    expect(result.delta).toBe(-4)
  })

  it('is NOT within budget when any tool regresses past its baseline', () => {
    const result = compareToBaseline(
      [
        { tool: 'verify-docs-full', findingCount: 45 },
        { tool: 'verify-coherence', findingCount: 2 }
      ],
      baseline
    )
    expect(result.withinBudget).toBe(false)
    expect(result.delta).toBe(1)
    expect(result.perTool.find((t) => t.tool === 'verify-docs-full')?.delta).toBe(1)
  })

  it('treats a tool absent from the baseline as its own baseline (delta 0, never fails)', () => {
    const result = compareToBaseline(
      [
        { tool: 'verify-docs-full', findingCount: 44 },
        { tool: 'verify-coherence', findingCount: 2 },
        { tool: 'brand-new-check', findingCount: 7 }
      ],
      baseline
    )
    expect(result.withinBudget).toBe(true)
    const newTool = result.perTool.find((t) => t.tool === 'brand-new-check')
    expect(newTool).toEqual({ tool: 'brand-new-check', baseline: 7, current: 7, delta: 0 })
  })
})
