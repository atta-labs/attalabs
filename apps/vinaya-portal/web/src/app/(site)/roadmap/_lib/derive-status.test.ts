import { describe, expect, it } from 'vitest'
import { deriveStatus, isVersionAtLeast } from './derive-status'

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
})
