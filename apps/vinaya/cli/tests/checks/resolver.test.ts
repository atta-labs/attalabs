import { describe, expect, it } from 'bun:test'
import type { CheckEntry } from '../../src/lib/config'
import { isValidNamespacedKey, resolveChecks } from '../../src/checks/resolver'
import type { CheckSpec } from '../../src/checks/contract'

const CORE: CheckSpec[] = [
  { name: 'doc-coverage', run: 'bin/doc-coverage', scope: 'diff' },
  { name: 'coherence', run: 'bin/coherence', scope: 'full' }
]

function entry(overrides: Partial<CheckEntry> = {}): CheckEntry {
  return { run: 'scripts/custom.ts', scope: 'full', ...overrides }
}

describe('isValidNamespacedKey', () => {
  it('accepts a well-formed namespaced key', () => {
    expect(isValidNamespacedKey('myteam/lint')).toBe(true)
  })

  it('rejects a key with no slash', () => {
    expect(isValidNamespacedKey('badkey')).toBe(false)
  })

  it('rejects a key with more than one slash', () => {
    expect(isValidNamespacedKey('a/b/c')).toBe(false)
  })

  it('rejects an empty segment', () => {
    expect(isValidNamespacedKey('/x')).toBe(false)
    expect(isValidNamespacedKey('x/')).toBe(false)
  })

  it('rejects a segment not matching [a-z0-9][a-z0-9-]*', () => {
    expect(isValidNamespacedKey('MyTeam/lint')).toBe(false)
    expect(isValidNamespacedKey('myteam/Lint')).toBe(false)
    expect(isValidNamespacedKey('-myteam/lint')).toBe(false)
  })

  it('rejects the reserved `vinaya` prefix as an exact segment match', () => {
    expect(isValidNamespacedKey('vinaya/x')).toBe(false)
  })

  it('accepts a prefix that merely starts with `vinaya` but is not an exact match', () => {
    expect(isValidNamespacedKey('vinayatools/x')).toBe(true)
  })
})

describe('resolveChecks', () => {
  it('classifies every core entry as default when config is undefined', () => {
    const result = resolveChecks(CORE, undefined)
    expect(result.failures).toEqual([])
    expect(result.resolved).toHaveLength(2)
    for (const r of result.resolved) {
      expect(r.state).toBe('default')
      expect(r.source).toBe('core')
    }
  })

  it('classifies every core entry as default when config is an empty object', () => {
    const result = resolveChecks(CORE, {})
    expect(result.resolved.every((r) => r.state === 'default')).toBe(true)
    expect(result.failures).toEqual([])
  })

  it('an exact-key match overrides the core entry, replacing it in place', () => {
    const result = resolveChecks(CORE, { 'doc-coverage': entry({ scope: 'full' }) })
    expect(result.resolved).toHaveLength(2)
    const overridden = result.resolved.find((r) => r.name === 'doc-coverage')
    expect(overridden?.state).toBe('overridden')
    expect(overridden?.source).toBe('config')
    // Complete replacement: `include` is never inherited from the core default,
    // and the replaced spec's own fields (here just `scope`) come from config.
    expect(overridden?.spec).toEqual({ name: 'doc-coverage', run: 'scripts/custom.ts', scope: 'full' })
  })

  it('a namespaced key with no core match is additive', () => {
    const result = resolveChecks(CORE, { 'myteam/lint': entry() })
    expect(result.failures).toEqual([])
    const additive = result.resolved.find((r) => r.name === 'myteam/lint')
    expect(additive?.state).toBe('additive')
    expect(additive?.source).toBe('config')
  })

  it('a bare key with no core match and no namespace is a FAIL_CLOSED failure, not added to resolved', () => {
    const result = resolveChecks(CORE, { badkey: entry() })
    expect(result.failures).toEqual([{ key: 'badkey', reason: 'bare key has no "/" and matches no core check id' }])
    expect(result.resolved.some((r) => r.name === 'badkey')).toBe(false)
    // Core entries are unaffected by the failure.
    expect(result.resolved).toHaveLength(2)
  })

  it('the reserved `vinaya/x` key is a failure, distinct from `vinayatools/x`', () => {
    const result = resolveChecks(CORE, { 'vinaya/x': entry() })
    expect(result.failures).toEqual([{ key: 'vinaya/x', reason: 'bare key has no "/" and matches no core check id' }])
  })

  it('classification is deterministic and independent of config-file key order', () => {
    const configA: Record<string, CheckEntry> = { 'myteam/lint': entry(), 'doc-coverage': entry() }
    const configB: Record<string, CheckEntry> = { 'doc-coverage': entry(), 'myteam/lint': entry() }
    const resultA = resolveChecks(CORE, configA)
    const resultB = resolveChecks(CORE, configB)
    const byName = (r: typeof resultA) =>
      Object.fromEntries(r.resolved.map((entry) => [entry.name, { state: entry.state, source: entry.source }]))
    expect(byName(resultA)).toEqual(byName(resultB))
  })

  it('mixes default, overridden, and additive states together', () => {
    const result = resolveChecks(CORE, {
      'doc-coverage': entry(),
      'myteam/lint': entry(),
      badkey: entry()
    })
    expect(result.resolved.find((r) => r.name === 'coherence')?.state).toBe('default')
    expect(result.resolved.find((r) => r.name === 'doc-coverage')?.state).toBe('overridden')
    expect(result.resolved.find((r) => r.name === 'myteam/lint')?.state).toBe('additive')
    expect(result.failures).toEqual([{ key: 'badkey', reason: 'bare key has no "/" and matches no core check id' }])
  })
})
