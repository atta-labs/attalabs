import type { RawTaskFacts } from '@atta/aeg-types'
import { describe, expect, it } from 'vitest'
import {
  AEG_BLOCKED_LABEL,
  findIterationSlug,
  hasLabel,
  iterationLabel,
  iterationSlugLengthError,
  iterationSlugOf,
  type Label,
  type LabelCategory,
  type LabelKey,
  LABEL_MAX_LENGTH,
  LABEL_NAMESPACE,
  LABELS,
  label,
  matchesLabel
} from './labels'
import { mapForgeFacts } from './map-forge-facts'

const CATEGORIES: LabelCategory[] = ['state', 'tier', 'iteration', 'needs', 'waiver']

const KEYS: LabelKey[] = [
  'blocked',
  'tier-0',
  'tier-1',
  'tier-3',
  'iteration',
  'needs-execution-input',
  'needs-strategy-input',
  'needs-principal-input',
  'needs-brief-correction',
  'waiver-docs',
  'waiver-review'
]

describe('LABELS — shape', () => {
  it('every id is unique', () => {
    const ids = LABELS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every key is unique', () => {
    const keys = LABELS.map((l) => l.key)
    expect(new Set(keys).size).toBe(keys.length)
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

  it('every id lives under the vinaya/ product namespace (D-123)', () => {
    for (const l of LABELS) {
      expect(l.id.startsWith(LABEL_NAMESPACE), `'${l.id}' is not namespaced`).toBe(true)
    }
  })

  it('no id carries the retired aeg name (D-123)', () => {
    for (const l of LABELS) {
      expect(l.id.includes('aeg')).toBe(false)
    }
  })

  it('every id fits GitHub’s 50-character label cap', () => {
    for (const l of LABELS.filter((x) => x.form === 'literal')) {
      expect(l.id.length, `'${l.id}' is ${l.id.length} chars`).toBeLessThanOrEqual(LABEL_MAX_LENGTH)
    }
  })

  it('a prefix-form id ends at its colon — its suffix is open-ended and cannot be enumerated', () => {
    for (const l of LABELS.filter((x) => x.form === 'prefix')) {
      expect(l.id.endsWith(':')).toBe(true)
    }
  })

  it('carries no status:* label — execution status is derived, never written (D-059/D-069)', () => {
    expect(LABELS.some((l) => l.id.includes('status:'))).toBe(false)
  })

  it('carries no project:* label — project is a body field, never a label', () => {
    expect(LABELS.some((l) => l.id.includes('project:'))).toBe(false)
  })

  it('every category is actually used by at least one label', () => {
    for (const c of CATEGORIES) {
      expect(
        LABELS.some((l) => l.category === c),
        `category '${c}' has no label`
      ).toBe(true)
    }
  })

  it('covers the three real tiers — 0, 1, 3 (there is no tier:2 in code)', () => {
    const tiers = LABELS.filter((l) => l.category === 'tier').map((l) => l.id)
    expect(tiers.sort()).toEqual(['vinaya/tier:0', 'vinaya/tier:1', 'vinaya/tier:3'])
  })

  it('covers all four needs:* escalation kinds', () => {
    const needs = LABELS.filter((l) => l.category === 'needs').map((l) => l.id)
    expect(needs.sort()).toEqual([
      'vinaya/needs:brief-correction',
      'vinaya/needs:execution-input',
      'vinaya/needs:principal-input',
      'vinaya/needs:strategy-input'
    ])
  })

  it('covers both waiver labels', () => {
    const waivers = LABELS.filter((l) => l.category === 'waiver').map((l) => l.id)
    expect(waivers.sort()).toEqual(['vinaya/waiver:docs', 'vinaya/waiver:review'])
  })

  it('LabelKey and LABELS stay in lockstep — every key resolves, and none is orphaned', () => {
    for (const k of KEYS) expect(label(k)).toBeTruthy()
    expect(LABELS.map((l) => l.key).sort()).toEqual([...KEYS].sort())
  })
})

describe('label() — the only sanctioned constructor', () => {
  it('returns the full string for a literal label', () => {
    expect(label('tier-1')).toBe('vinaya/tier:1')
    expect(label('waiver-docs')).toBe('vinaya/waiver:docs')
    expect(label('needs-brief-correction')).toBe('vinaya/needs:brief-correction')
  })

  it('returns the bare prefix for the prefix family', () => {
    expect(label('iteration')).toBe('vinaya/iteration:')
  })

  it('iterationLabel() builds the full slug label', () => {
    expect(iterationLabel('state-machine-v1')).toBe('vinaya/iteration:state-machine-v1')
  })
})

describe('matchesLabel() / hasLabel()', () => {
  it('matches a literal label exactly', () => {
    expect(matchesLabel('tier-3', 'vinaya/tier:3')).toBe(true)
    expect(matchesLabel('tier-3', 'vinaya/tier:1')).toBe(false)
    expect(matchesLabel('tier-3', 'vinaya/tier:33')).toBe(false)
  })

  it('matches a prefix family by prefix, whatever the slug', () => {
    expect(matchesLabel('iteration', 'vinaya/iteration:anything-at-all')).toBe(true)
    expect(matchesLabel('iteration', 'vinaya/tier:1')).toBe(false)
  })

  it('rejects the pre-vinaya/ name — the transition window is closed', () => {
    expect(matchesLabel('blocked', 'aeg:blocked')).toBe(false)
    expect(matchesLabel('tier-1', 'tier:1')).toBe(false)
    expect(matchesLabel('waiver-review', 'waiver:review')).toBe(false)
    expect(matchesLabel('iteration', 'iteration:deprecation-v1')).toBe(false)
  })

  it('hasLabel() scans a label set', () => {
    expect(hasLabel('tier-1', ['bug', 'vinaya/tier:1'])).toBe(true)
    expect(hasLabel('tier-1', ['bug', 'vinaya/tier:3'])).toBe(false)
    expect(hasLabel('iteration', [])).toBe(false)
  })
})

describe('iterationSlugOf() / findIterationSlug()', () => {
  it('extracts the slug from a namespaced iteration label', () => {
    expect(iterationSlugOf('vinaya/iteration:state-machine-v1')).toBe('state-machine-v1')
  })

  it('returns null for the pre-vinaya/ form — the transition window is closed', () => {
    expect(iterationSlugOf('iteration:deprecation-v1')).toBeNull()
  })

  it('returns null for a non-iteration label', () => {
    expect(iterationSlugOf('vinaya/tier:1')).toBeNull()
    expect(iterationSlugOf('bug')).toBeNull()
  })

  it('findIterationSlug() returns the first slug in a label set', () => {
    expect(findIterationSlug(['bug', 'vinaya/tier:1', 'vinaya/iteration:iter'])).toBe('iter')
    expect(findIterationSlug(['bug', 'vinaya/tier:1'])).toBeNull()
  })
})

describe('iterationSlugLengthError() — GitHub’s 50-character cap', () => {
  it('passes a slug that fits', () => {
    expect(iterationSlugLengthError('state-machine-v1')).toBeNull()
  })

  it('passes the longest slug that exactly fills the cap', () => {
    const slug = 'x'.repeat(LABEL_MAX_LENGTH - 'vinaya/iteration:'.length)
    expect(iterationLabel(slug).length).toBe(LABEL_MAX_LENGTH)
    expect(iterationSlugLengthError(slug)).toBeNull()
  })

  it('rejects a slug one character too long, and says by how much', () => {
    const slug = 'x'.repeat(LABEL_MAX_LENGTH - 'vinaya/iteration:'.length + 1)
    const err = iterationSlugLengthError(slug)
    expect(err).toContain('caps a label name at 50')
    expect(err).toContain('Shorten the slug by 1 character(s)')
  })
})

describe('AEG_BLOCKED_LABEL — tied to its LABELS entry', () => {
  it("resolves to the namespaced 'vinaya/blocked' (D-123 retires the aeg: name)", () => {
    expect(AEG_BLOCKED_LABEL).toBe('vinaya/blocked')
    expect(AEG_BLOCKED_LABEL).toBe(label('blocked'))
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

  it('the mapper no longer reads the pre-vinaya/ name — the forge was renamed', () => {
    const raw: RawTaskFacts = {
      issue: { state: 'OPEN', stateReason: null, closedAt: null, assigneesCount: 0, labels: ['aeg:blocked'] },
      refExists: false,
      pullRequest: null
    }
    expect(mapForgeFacts(raw)?.blockedLabel).toBe(false)
  })
})
