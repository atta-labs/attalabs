import { describe, expect, it } from 'vitest'
import { checkManifestValidity, parseNoDocRules } from './manifest-validity'

describe('parseNoDocRules', () => {
  it('parses em-dash separator', () => {
    const rules = parseNoDocRules('# no-doc: apps/atta-ai/** — scaffold only\n')
    expect(rules).toHaveLength(1)
    expect(rules[0]).toEqual({ glob: 'apps/atta-ai/**', reason: 'scaffold only' })
  })

  it('parses ASCII hyphen separator', () => {
    const rules = parseNoDocRules('# no-doc: packages/typescript-config/** - shared configs, no docs needed\n')
    expect(rules).toHaveLength(1)
    expect(rules[0]?.glob).toBe('packages/typescript-config/**')
  })

  it('ignores regular comment lines', () => {
    const rules = parseNoDocRules('# This is a normal comment\n# no-doc: apps/foo/** — ok\n')
    expect(rules).toHaveLength(1)
  })

  it('returns empty array when no no-doc lines exist', () => {
    expect(parseNoDocRules('# only comments\nglob pointer\n')).toHaveLength(0)
  })
})

describe('checkManifestValidity', () => {
  const fileExists = (missing: string[]) => (p: string) => !missing.includes(p)

  it('null content → all empty (dormant)', () => {
    const r = checkManifestValidity(null, fileExists([]))
    expect(r.m1Errors).toHaveLength(0)
    expect(r.m2Notes).toHaveLength(0)
    expect(r.m3Errors).toHaveLength(0)
    expect(r.noDocRules).toHaveLength(0)
  })

  it('M1 — dangling in-repo pointer is flagged', () => {
    const content = 'scripts/foo.ts   docs/missing.md\n'
    const r = checkManifestValidity(content, fileExists(['docs/missing.md']))
    expect(r.m1Errors).toHaveLength(1)
    expect(r.m1Errors[0]).toMatch(/M1 manifest-dangling/)
    expect(r.m1Errors[0]).toMatch(/docs\/missing\.md/)
  })

  it('M1 — URL pointer is not checked for disk existence', () => {
    const content = 'scripts/foo.ts   https://example.com/docs\n'
    const r = checkManifestValidity(content, fileExists([]))
    expect(r.m1Errors).toHaveLength(0)
  })

  it('M1 — existing pointer passes', () => {
    const content = 'scripts/foo.ts   docs/exists.md\n'
    const r = checkManifestValidity(content, fileExists([]))
    expect(r.m1Errors).toHaveLength(0)
  })

  it('M3 — duplicate glob is flagged', () => {
    const content = ['scripts/foo.ts   docs/a.md', 'scripts/foo.ts   docs/b.md'].join('\n')
    const r = checkManifestValidity(content, fileExists([]))
    expect(r.m3Errors).toHaveLength(1)
    expect(r.m3Errors[0]).toMatch(/M3 manifest-duplicate-glob/)
    expect(r.m3Errors[0]).toMatch(/scripts\/foo\.ts/)
  })

  it('no-doc rules are parsed from comment lines', () => {
    const content = '# no-doc: apps/vitakka-ai/** — scaffold only\nscripts/x.ts   docs/x.md\n'
    const r = checkManifestValidity(content, fileExists([]))
    expect(r.noDocRules).toHaveLength(1)
    expect(r.noDocRules[0]?.glob).toBe('apps/vitakka-ai/**')
  })
})
