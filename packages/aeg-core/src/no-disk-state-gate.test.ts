import { describe, expect, it } from 'vitest'
import { checkNoDiskState, GRANDFATHERED_LEGACY_PATHS } from './no-disk-state-gate'

const BASELINE_TRACKED_PATHS = [
  'aeg-root/iterations/README.md',
  'packages/aeg-core/src/fixtures/aeg-ui-v1.tokens.md',
  'packages/aeg-core/bin/open-pr.ts',
  ...GRANDFATHERED_LEGACY_PATHS
]

describe('checkNoDiskState (forge-sole-state task 1)', () => {
  it('passes on the real post-migration baseline (README + fixture + grandfathered legacy set)', () => {
    expect(checkNoDiskState(BASELINE_TRACKED_PATHS)).toEqual([])
  })

  it('passes on an empty repo', () => {
    expect(checkNoDiskState([])).toEqual([])
  })

  it('fails on a live (re-created) iteration topology file', () => {
    const result = checkNoDiskState([...BASELINE_TRACKED_PATHS, 'aeg-root/iterations/some-new-iteration-v1.md'])
    expect(result).toHaveLength(1)
    expect(result[0]?.path).toBe('aeg-root/iterations/some-new-iteration-v1.md')
    expect(result[0]?.reason).toContain('forge-native')
  })

  it('fails on a NEW archived-iteration file not in the grandfathered set', () => {
    const result = checkNoDiskState([...BASELINE_TRACKED_PATHS, 'aeg-root/iterations/completed/brand-new-iteration.md'])
    expect(result).toHaveLength(1)
    expect(result[0]?.path).toBe('aeg-root/iterations/completed/brand-new-iteration.md')
  })

  it('fails on a NEW .tokens.md file anywhere in the repo, not just completed/', () => {
    const result = checkNoDiskState([...BASELINE_TRACKED_PATHS, 'aeg-root/iterations/some-iteration.tokens.md'])
    expect(result).toHaveLength(1)
    expect(result[0]?.path).toBe('aeg-root/iterations/some-iteration.tokens.md')
  })

  it('does not flag any of the grandfathered legacy paths themselves', () => {
    expect(checkNoDiskState([...GRANDFATHERED_LEGACY_PATHS])).toEqual([])
  })

  it('does not flag the ledger-parser test fixture', () => {
    expect(checkNoDiskState(['packages/aeg-core/src/fixtures/aeg-ui-v1.tokens.md'])).toEqual([])
  })

  it('does not flag README.md itself', () => {
    expect(checkNoDiskState(['aeg-root/iterations/README.md'])).toEqual([])
  })

  it('does not flag ordinary repo files', () => {
    expect(checkNoDiskState(['packages/aeg-core/bin/open-pr.ts', 'aeg-root/state-machine.md'])).toEqual([])
  })

  it('reports every violation, not just the first', () => {
    const result = checkNoDiskState([
      'aeg-root/iterations/a.md',
      'aeg-root/iterations/b.md',
      'aeg-root/iterations/completed/c.md'
    ])
    expect(result).toHaveLength(3)
  })
})
