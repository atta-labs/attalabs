import { describe, expect, it } from 'vitest'
import { unpublishedBadgeLabel } from './unpublished-badge'

describe('unpublishedBadgeLabel', () => {
  it('returns null for a shipped (built) command', () => {
    expect(unpublishedBadgeLabel({ status: 'shipped' }, { version: '0.1.3' })).toBeNull()
  })

  it('returns a version-aware label for a planned (non-built) command', () => {
    expect(unpublishedBadgeLabel({ status: 'planned' }, { version: '0.1.3' })).toBe('Not in v0.1.3 — coming soon')
  })

  it('returns a fallback label for a planned command when the version is unknown', () => {
    expect(unpublishedBadgeLabel({ status: 'planned' }, { fallback: true })).toBe('Not yet published')
  })
})
