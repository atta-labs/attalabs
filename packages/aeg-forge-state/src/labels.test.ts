import type { RawTaskFacts } from '@atta/aeg-types'
import { describe, expect, it } from 'vitest'
import { AEG_BLOCKED_LABEL, type Label, type LabelCategory, LABELS } from './labels'
import { mapForgeFacts } from './map-forge-facts'

const CATEGORIES: LabelCategory[] = ['state', 'tier', 'iteration', 'needs', 'waiver']

describe('LABELS — shape', () => {
  it('every id is unique', () => {
    const ids = LABELS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every category is a valid LabelCategory', () => {
    for (const l of LABELS) {
      expect(CATEGORIES).toContain(l.category)
    }
  })

  it('every form is literal or prefix', () => {
    for (const l of LABELS) {
      expect(l.form === 'literal' || l.form === 'prefix').toBe(true)
    }
  })

  it('every carries is non-empty — a label with no stated fact is not a vocabulary entry', () => {
    for (const l of LABELS) {
      expect(l.carries.length).toBeGreaterThan(0)
    }
  })

  it('every id is namespaced with a colon — the prefix is what makes the axis readable', () => {
    for (const l of LABELS) {
      expect(l.id).toContain(':')
    }
  })

  it('a prefix-form id ends at its colon — its suffix is open-ended and cannot be enumerated', () => {
    for (const l of LABELS.filter((x) => x.form === 'prefix')) {
      expect(l.id.endsWith(':')).toBe(true)
    }
  })

  it('carries no status:* label — execution status is derived, never written (D-059/D-069)', () => {
    expect(LABELS.some((l) => l.id.startsWith('status:'))).toBe(false)
  })

  it('every category is actually used by at least one label', () => {
    for (const c of CATEGORIES) {
      expect(
        LABELS.some((l) => l.category === c),
        `category '${c}' has no label`
      ).toBe(true)
    }
  })

  it('covers the three real tiers — 0, 1, 3 (there is no tier:2)', () => {
    const tiers = LABELS.filter((l) => l.category === 'tier').map((l) => l.id)
    expect(tiers.sort()).toEqual(['tier:0', 'tier:1', 'tier:3'])
  })

  it('covers all four needs:* escalation kinds', () => {
    const needs = LABELS.filter((l) => l.category === 'needs').map((l) => l.id)
    expect(needs.sort()).toEqual([
      'needs:brief-correction',
      'needs:execution-input',
      'needs:principal-input',
      'needs:strategy-input'
    ])
  })

  it('covers both waiver labels', () => {
    const waivers = LABELS.filter((l) => l.category === 'waiver').map((l) => l.id)
    expect(waivers.sort()).toEqual(['waiver:docs', 'waiver:review'])
  })
})

describe('AEG_BLOCKED_LABEL — tied to its LABELS entry', () => {
  it("still resolves to 'aeg:blocked'", () => {
    expect(AEG_BLOCKED_LABEL).toBe('aeg:blocked')
  })

  it('has a matching LABELS entry in the state category, so constant and vocabulary cannot drift', () => {
    const entry = LABELS.find((l: Label) => l.id === AEG_BLOCKED_LABEL)
    expect(entry).toBeDefined()
    expect(entry?.category).toBe('state')
    expect(entry?.form).toBe('literal')
  })

  it('is the label the mapper actually reads — the vocabulary drives real derivation', () => {
    const issue = {
      state: 'OPEN' as const,
      stateReason: null,
      closedAt: null,
      assigneesCount: 0,
      labels: [AEG_BLOCKED_LABEL]
    }
    const raw: RawTaskFacts = { issue, refExists: false, pullRequest: null }
    expect(mapForgeFacts(raw)?.blockedLabel).toBe(true)
    expect(mapForgeFacts({ ...raw, issue: { ...issue, labels: [] } })?.blockedLabel).toBe(false)
  })
})
