import { describe, expect, it } from 'vitest'
import { compareVersions, deriveStatus, isVersionAtLeast } from './derive-status'

describe('isVersionAtLeast', () => {
  it('is true when candidate equals threshold', () => {
    expect(isVersionAtLeast('0.19.2', '0.19.2')).toBe(true)
  })

  it('is true when candidate is greater on the minor segment', () => {
    expect(isVersionAtLeast('0.20.0', '0.19.2')).toBe(true)
  })

  it('is false when candidate is less on the patch segment', () => {
    expect(isVersionAtLeast('0.19.1', '0.19.2')).toBe(false)
  })

  it('compares the major segment before minor/patch', () => {
    expect(isVersionAtLeast('1.0.0', '0.24.0')).toBe(true)
    expect(isVersionAtLeast('0.24.0', '1.0.0')).toBe(false)
  })

  it('parses a segment with a non-numeric suffix from its leading digits, not NaN', () => {
    // A free-text CMS `version` field can carry a pre-release-shaped typo like
    // "0.20.0-rc1" — `Number("20-rc1")` is `NaN`, which used to make this comparison
    // (and everything after it) resolve to `false` forever, with no error anywhere.
    expect(isVersionAtLeast('0.20.0-rc1', '0.20.0')).toBe(true)
    expect(isVersionAtLeast('0.20.0', '0.20.0-rc1')).toBe(true)
    expect(isVersionAtLeast('0.19.0-rc1', '0.20.0')).toBe(false)
  })

  it('treats a fully non-numeric segment as 0 rather than throwing or NaN-ing', () => {
    expect(isVersionAtLeast('0.abc.0', '0.0.0')).toBe(true)
    expect(isVersionAtLeast('0.0.0', '0.abc.0')).toBe(true)
  })
})

describe('deriveStatus', () => {
  const published = { version: '0.19.2' }
  const unreachable = { fallback: true as const }

  it('is shipping when the milestone version is at or below the published version', () => {
    expect(deriveStatus({ status: 'planned', version: '0.19.0' }, published)).toBe('shipping')
    expect(deriveStatus({ status: 'planned', version: '0.19.2' }, published)).toBe('shipping')
  })

  it('is planned when the milestone version is above the published version', () => {
    expect(deriveStatus({ status: 'shipping', version: '0.20.0' }, published)).toBe('planned')
  })

  it('dropped always wins, regardless of version', () => {
    expect(deriveStatus({ status: 'dropped', version: '0.1.0' }, published)).toBe('dropped')
    expect(deriveStatus({ status: 'dropped', version: '9.9.9' }, published)).toBe('dropped')
  })

  it('falls back to the CMS-stored status when the registry is unreachable', () => {
    expect(deriveStatus({ status: 'planned', version: '0.19.0' }, unreachable)).toBe('planned')
    expect(deriveStatus({ status: 'shipping', version: '0.19.0' }, unreachable)).toBe('shipping')
  })

  it('falls back to the CMS-stored status when version is null — no target to compare against', () => {
    expect(deriveStatus({ status: 'planned', version: null }, published)).toBe('planned')
    // Even a status of 'shipping' with no version isn't auto-corrected — status is the
    // only source of truth while version is empty; the registry comparison never runs.
    expect(deriveStatus({ status: 'shipping', version: null }, published)).toBe('shipping')
  })

  it('dropped still wins over a null version', () => {
    expect(deriveStatus({ status: 'dropped', version: null }, published)).toBe('dropped')
  })
})

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('0.19.3', '0.19.3')).toBe(0)
  })

  it('is negative when the first version is lower', () => {
    expect(compareVersions('0.19.0', '0.19.3')).toBeLessThan(0)
  })

  it('is positive when the first version is higher', () => {
    expect(compareVersions('1.0.0', '0.24.0')).toBeGreaterThan(0)
  })

  it('compares segments numerically, not lexically', () => {
    expect(compareVersions('0.19.10', '0.19.3')).toBeGreaterThan(0)
  })

  it('treats a missing trailing segment as 0', () => {
    expect(compareVersions('0.19', '0.19.0')).toBe(0)
    expect(compareVersions('0.19', '0.19.1')).toBeLessThan(0)
  })
})
