import { describe, expect, it } from 'vitest'
import { type ForgeSlugFailure, reduceSettled } from './forge-status'

describe('reduceSettled', () => {
  it('returns ok when the enumeration succeeded and no slug failed', () => {
    expect(reduceSettled(6, [], false)).toEqual({ kind: 'ok' })
  })

  it('returns ok for zero total slugs (a legitimately empty list, not a failure)', () => {
    expect(reduceSettled(0, [], false)).toEqual({ kind: 'ok' })
  })

  it('returns partial when some slugs failed but survivors exist', () => {
    const failed: ForgeSlugFailure[] = [{ slug: 'a', reason: 'secondary rate limit' }]
    expect(reduceSettled(6, failed, false)).toEqual({ kind: 'partial', failed, total: 6 })
  })

  it('returns unreachable when every slug failed (all-failed collapses to unreachable)', () => {
    const failed: ForgeSlugFailure[] = [
      { slug: 'a', reason: 'x' },
      { slug: 'b', reason: 'y' }
    ]
    expect(reduceSettled(2, failed, false)).toEqual({ kind: 'unreachable' })
  })

  it('returns unreachable when the enumeration call itself failed, regardless of failures/total', () => {
    expect(reduceSettled(0, [], true)).toEqual({ kind: 'unreachable' })
  })

  it('enumerationFailed takes precedence even if failures/total would otherwise read as partial', () => {
    const failed: ForgeSlugFailure[] = [{ slug: 'a', reason: 'x' }]
    expect(reduceSettled(6, failed, true)).toEqual({ kind: 'unreachable' })
  })
})
