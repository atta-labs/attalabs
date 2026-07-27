import type { RawTaskFacts } from '@atta/aeg-types'
import { describe, expect, it } from 'vitest'
import {
  AEG_BLOCKED_LABEL,
  findTrancheSlug,
  hasLabel,
  trancheLabel,
  trancheLabelsToQuery,
  trancheSlugLengthError,
  trancheSlugOf,
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

const CATEGORIES: LabelCategory[] = ['state', 'tier', 'tranche', 'needs', 'waiver', 'flag', 'kind']

const KEYS: LabelKey[] = [
  'blocked',
  'tier-0',
  'tier-1',
  'tier-3',
  'tranche',
  'needs-execution-input',
  'needs-strategy-input',
  'needs-principal-input',
  'needs-brief-correction',
  'waiver-docs',
  'waiver-review',
  'override-docs',
  'incoherent',
  'direct-main-push',
  'dead-branch-push',
  'state-object'
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

  it('every id lives under the vinaya/ product namespace', () => {
    for (const l of LABELS) {
      expect(l.id.startsWith(LABEL_NAMESPACE), `'${l.id}' is not namespaced`).toBe(true)
    }
  })

  it('no id carries the retired aeg name', () => {
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

  it('carries no status:* label — execution status is derived, never written', () => {
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

  it('covers both waivers and the blunt override — the whole escape-hatch axis', () => {
    const waivers = LABELS.filter((l) => l.category === 'waiver').map((l) => l.id)
    expect(waivers.sort()).toEqual(['vinaya/override:docs', 'vinaya/waiver:docs', 'vinaya/waiver:review'])
  })

  it('covers all three detection flags — the anomalies a human must resolve', () => {
    const flags = LABELS.filter((l) => l.category === 'flag').map((l) => l.id)
    expect(flags.sort()).toEqual(['vinaya/dead-branch-push', 'vinaya/direct-main-push', 'vinaya/incoherent'])
  })

  it('covers the one non-work kind — a storage object is not a task', () => {
    const kinds = LABELS.filter((l) => l.category === 'kind').map((l) => l.id)
    expect(kinds).toEqual(['vinaya/state-object'])
  })

  it('carries no foreign-grammar id — the namespace separator is / , never : (#614 addendum)', () => {
    for (const l of LABELS) {
      expect(l.id.startsWith('vinaya/'), `'${l.id}' uses the old vinaya: grammar`).toBe(true)
      expect(l.id.slice('vinaya/'.length).includes('/'), `'${l.id}' has a second /`).toBe(false)
    }
  })

  it('LabelKey and LABELS stay in lockstep — every key resolves, and none is orphaned', () => {
    for (const k of KEYS) expect(label(k)).toBeTruthy()
    expect(LABELS.map((l) => l.key).sort()).toEqual([...KEYS].sort())
  })
})

describe('label() — the only sanctioned constructor', () => {
  it('names the labels the detection bins MINT on first fire — never a literal in the bin', () => {
    // Both bins create their own label the first time they fire. A literal
    // there would have minted a retired `aeg:`-named label.
    expect(label('direct-main-push')).toBe('vinaya/direct-main-push')
    expect(label('dead-branch-push')).toBe('vinaya/dead-branch-push')
  })

  it('names the storage-object kind the backlog excludes', () => {
    expect(label('state-object')).toBe('vinaya/state-object')
  })

  it('names the docs-gate override — the one §14 label the family-enumerated grep missed', () => {
    expect(label('override-docs')).toBe('vinaya/override:docs')
  })

  it('returns the full string for a literal label', () => {
    expect(label('tier-1')).toBe('vinaya/tier:1')
    expect(label('waiver-docs')).toBe('vinaya/waiver:docs')
    expect(label('needs-brief-correction')).toBe('vinaya/needs:brief-correction')
  })

  it('returns the bare prefix for the prefix family', () => {
    expect(label('tranche')).toBe('vinaya/tranche:')
  })

  it('trancheLabel() builds the full slug label', () => {
    expect(trancheLabel('state-machine-v1')).toBe('vinaya/tranche:state-machine-v1')
  })
})

describe('matchesLabel() / hasLabel()', () => {
  it('matches a literal label exactly', () => {
    expect(matchesLabel('tier-3', 'vinaya/tier:3')).toBe(true)
    expect(matchesLabel('tier-3', 'vinaya/tier:1')).toBe(false)
    expect(matchesLabel('tier-3', 'vinaya/tier:33')).toBe(false)
  })

  it('matches a prefix family by prefix, whatever the slug', () => {
    expect(matchesLabel('tranche', 'vinaya/tranche:anything-at-all')).toBe(true)
    expect(matchesLabel('tranche', 'vinaya/tier:1')).toBe(false)
  })

  it('rejects the pre-vinaya/ name — the transition window is closed', () => {
    expect(matchesLabel('blocked', 'aeg:blocked')).toBe(false)
    expect(matchesLabel('tier-1', 'tier:1')).toBe(false)
    expect(matchesLabel('waiver-review', 'waiver:review')).toBe(false)
    expect(matchesLabel('tranche', 'tranche:deprecation-v1')).toBe(false)
  })

  it('rejects the old colon grammar on the labels that used it (#614 addendum)', () => {
    expect(matchesLabel('state-object', 'vinaya:state-object')).toBe(false)
    expect(matchesLabel('state-object', 'vinaya/state-object')).toBe(true)
    expect(matchesLabel('direct-main-push', 'aeg:direct-main-push')).toBe(false)
    expect(matchesLabel('dead-branch-push', 'aeg:dead-branch-push')).toBe(false)
    expect(matchesLabel('incoherent', 'aeg:incoherent')).toBe(false)
  })

  it('hasLabel() scans a label set', () => {
    expect(hasLabel('tier-1', ['bug', 'vinaya/tier:1'])).toBe(true)
    expect(hasLabel('tier-1', ['bug', 'vinaya/tier:3'])).toBe(false)
    expect(hasLabel('tranche', [])).toBe(false)
  })

  it('rejects the superseded vinaya/iteration: prefix — the migration window is closed', () => {
    expect(matchesLabel('tranche', 'vinaya/iteration:anything-at-all')).toBe(false)
    expect(hasLabel('tranche', ['bug', 'vinaya/iteration:iter'])).toBe(false)
  })
})

describe('trancheSlugOf() / findTrancheSlug()', () => {
  it('extracts the slug from a namespaced tranche label', () => {
    expect(trancheSlugOf('vinaya/tranche:state-machine-v1')).toBe('state-machine-v1')
  })

  it('returns null for the pre-vinaya/ form — the transition window is closed', () => {
    expect(trancheSlugOf('tranche:deprecation-v1')).toBeNull()
  })

  it('returns null for a non-tranche label', () => {
    expect(trancheSlugOf('vinaya/tier:1')).toBeNull()
    expect(trancheSlugOf('bug')).toBeNull()
  })

  it('findTrancheSlug() returns the first slug in a label set', () => {
    expect(findTrancheSlug(['bug', 'vinaya/tier:1', 'vinaya/tranche:iter'])).toBe('iter')
    expect(findTrancheSlug(['bug', 'vinaya/tier:1'])).toBeNull()
  })

  it('returns null for the superseded vinaya/iteration: prefix too — the migration window is closed', () => {
    expect(trancheSlugOf('vinaya/iteration:state-machine-v1')).toBeNull()
    expect(findTrancheSlug(['bug', 'vinaya/iteration:iter'])).toBeNull()
  })

  it('still constructs under the canonical prefix only', () => {
    expect(trancheLabel('iter')).toBe('vinaya/tranche:iter')
  })
})

describe('trancheLabelsToQuery() — the migration window is closed', () => {
  it('returns just the canonical label now that the migration window is closed', () => {
    expect(trancheLabelsToQuery('iter')).toEqual(['vinaya/tranche:iter'])
  })

  it('always contains what trancheLabel() would construct', () => {
    expect(trancheLabelsToQuery('state-machine-v1')).toContain(trancheLabel('state-machine-v1'))
  })
})

describe('trancheSlugLengthError() — GitHub’s 50-character cap', () => {
  it('passes a slug that fits', () => {
    expect(trancheSlugLengthError('state-machine-v1')).toBeNull()
  })

  it('passes the longest slug that exactly fills the cap', () => {
    const slug = 'x'.repeat(LABEL_MAX_LENGTH - 'vinaya/tranche:'.length)
    expect(trancheLabel(slug).length).toBe(LABEL_MAX_LENGTH)
    expect(trancheSlugLengthError(slug)).toBeNull()
  })

  it('rejects a slug one character too long, and says by how much', () => {
    const slug = 'x'.repeat(LABEL_MAX_LENGTH - 'vinaya/tranche:'.length + 1)
    const err = trancheSlugLengthError(slug)
    expect(err).toContain('caps a label name at 50')
    expect(err).toContain('Shorten the slug by 1 character(s)')
  })
})

describe('AEG_BLOCKED_LABEL — tied to its LABELS entry', () => {
  it("resolves to the namespaced 'vinaya/blocked' — the aeg: name is retired", () => {
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
