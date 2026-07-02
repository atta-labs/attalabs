import { describe, expect, it } from 'vitest'
import { deriveSection7, globsOverlap } from './derive-section7'

describe('globsOverlap', () => {
  it('exact-glob match', () => {
    expect(globsOverlap('scripts/verify-docs.ts', 'scripts/verify-docs.ts')).toBe(true)
    expect(globsOverlap('scripts/verify-docs.ts', 'scripts/other.ts')).toBe(false)
  })

  it('** vs concrete-path overlap', () => {
    expect(globsOverlap('packages/ui/**', 'packages/ui/topbar/**')).toBe(true)
    expect(globsOverlap('packages/ui/topbar/**', 'packages/ui/**')).toBe(true)
    expect(globsOverlap('packages/**', 'packages/ui/topbar/index.tsx')).toBe(true)
  })

  it('no-overlap for disjoint top-level dirs', () => {
    expect(globsOverlap('packages/foo/**', 'packages/bar/**')).toBe(false)
  })

  it('* matches exactly one segment', () => {
    expect(globsOverlap('packages/*/index.ts', 'packages/ui/index.ts')).toBe(true)
    expect(globsOverlap('packages/*/index.ts', 'packages/ui/topbar/index.ts')).toBe(false)
  })

  it('no overlap when one side runs out of segments without a pending **', () => {
    expect(globsOverlap('packages/ui/topbar/**', 'packages/ui')).toBe(false)
    expect(globsOverlap('packages/*', 'packages')).toBe(false)
  })
})

describe('deriveSection7', () => {
  const OWNERS = [
    'packages/ui/**                                    .claude/skills/ui-components/SKILL.md',
    'scripts/verify-docs.ts                            aeg-root/state-machine.md',
    'packages/foo/**                                   https://example.com/foo-docs'
  ].join('\n')

  it('matches a surface against an overlapping ** binding', () => {
    const { pointers, matches, errors } = deriveSection7(['packages/ui/topbar/**'], OWNERS)
    expect(errors).toEqual([])
    expect(pointers).toEqual(['.claude/skills/ui-components/SKILL.md'])
    expect(matches).toEqual([
      {
        surface: 'packages/ui/topbar/**',
        glob: 'packages/ui/**',
        pointer: '.claude/skills/ui-components/SKILL.md',
        lineNum: 1
      }
    ])
  })

  it('no-overlap case yields no pointers and no matches', () => {
    const { pointers, matches, errors } = deriveSection7(['packages/disjoint/**'], OWNERS)
    expect(errors).toEqual([])
    expect(pointers).toEqual([])
    expect(matches).toEqual([])
  })

  it('a surface matching two different bindings — both present in matches, pointers deduped', () => {
    const { pointers, matches, errors } = deriveSection7(
      ['packages/ui/**', 'scripts/verify-docs.ts', 'packages/ui/topbar/**'],
      OWNERS
    )
    expect(errors).toEqual([])
    expect(pointers).toEqual(['.claude/skills/ui-components/SKILL.md', 'aeg-root/state-machine.md'])
    expect(matches.length).toBe(3)
    expect(matches.map((m) => m.surface)).toEqual(['packages/ui/**', 'scripts/verify-docs.ts', 'packages/ui/topbar/**'])
  })

  it('malformed doc-owners line surfaces via errors, delegated from parseDocOwners', () => {
    const { pointers, matches, errors } = deriveSection7(['packages/ui/**'], 'only-one-column\n')
    expect(pointers).toEqual([])
    expect(matches).toEqual([])
    expect(errors.length).toBe(1)
    expect(errors[0]).toMatch(/malformed binding/)
  })
})
