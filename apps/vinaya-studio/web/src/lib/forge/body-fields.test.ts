import { describe, expect, it } from 'vitest'
import { tierFromBody, typeFromBody, withBodyFallback } from './body-fields'

describe('tierFromBody', () => {
  it('resolves a `**Tier:** 3` line to the full label', () => {
    expect(tierFromBody('Intro\n\n**Tier:** 3\n**Type:** fix\n')).toBe('vinaya/tier:3')
  })

  it('tolerates CRLF line endings', () => {
    expect(tierFromBody('**Tier:** 1\r\n')).toBe('vinaya/tier:1')
  })

  it('rejects a tier outside the label vocabulary', () => {
    expect(tierFromBody('**Tier:** 2')).toBeNull()
    expect(tierFromBody('**Tier:** 9')).toBeNull()
  })

  it('only matches at the start of a line', () => {
    expect(tierFromBody('see **Tier:** 3')).toBeNull()
    expect(tierFromBody('- **Tier:** 3')).toBeNull()
  })

  it('returns null with no tier line or an empty body', () => {
    expect(tierFromBody('')).toBeNull()
    expect(tierFromBody('**Tier:** high')).toBeNull()
  })
})

describe('typeFromBody', () => {
  it('resolves a `**Type:** fix` line to the full label', () => {
    expect(typeFromBody('**Tier:** 3\n**Type:** fix')).toBe('vinaya/type:fix')
  })

  it('is case-insensitive on the word', () => {
    expect(typeFromBody('**Type:** Feat')).toBe('vinaya/type:feat')
  })

  it('rejects a word outside the label vocabulary', () => {
    expect(typeFromBody('**Type:** bugfix')).toBeNull()
  })

  it('only matches at the start of a line', () => {
    expect(typeFromBody('the **Type:** fix')).toBeNull()
  })
})

describe('withBodyFallback', () => {
  const body = { bodyTier: 'vinaya/tier:3', bodyType: 'vinaya/type:fix' }

  it('fills a missing tier and type from the body', () => {
    const out = withBodyFallback({ tier: null, type: null, flags: ['f'] }, body)
    expect(out).toEqual({ tier: 'vinaya/tier:3', type: 'vinaya/type:fix', flags: ['f'] })
  })

  it('lets a label win over the body', () => {
    const out = withBodyFallback({ tier: 'vinaya/tier:1', type: 'vinaya/type:feat' }, body)
    expect(out).toEqual({ tier: 'vinaya/tier:1', type: 'vinaya/type:feat' })
  })

  it('stays null when neither side has a value', () => {
    expect(withBodyFallback({ tier: null, type: null }, { bodyTier: null, bodyType: null })).toEqual({
      tier: null,
      type: null
    })
  })
})
