import { describe, expect, it } from 'vitest'
import { deriveTierFromDiff, overrideActive, readTierFromPrBody } from './pr-tier'

describe('deriveTierFromDiff', () => {
  it('decision-log in diff → tier 3 (C0 error still emitted; explicit declaration required)', () => {
    expect(deriveTierFromDiff(['packages/governance/decisions.md'])).toBe(3)
    expect(deriveTierFromDiff(['apps/herald-ai/specs/herald-decisions.md'])).toBe(3)
    // decision log wins over any other file in the same diff
    expect(deriveTierFromDiff(['apps/foo/web/src/lib/foo.ts', 'packages/governance/decisions.md'])).toBe(3)
  })

  it('code-only diff → tier 0 (passes without Tier: field in PR body)', () => {
    expect(deriveTierFromDiff(['apps/vada-ai/web/src/lib/foo.ts'])).toBe(0)
    expect(deriveTierFromDiff(['.github/workflows/ci.yml'])).toBe(0)
    expect(deriveTierFromDiff(['apps/herald-ai/web/src/app/api/route.ts', 'packages/engine/src/types.ts'])).toBe(0)
  })

  it('spec file in diff → tier 1 (passes without Tier: field in PR body)', () => {
    expect(deriveTierFromDiff(['apps/herald-ai/specs/some-spec.md'])).toBe(1)
    expect(deriveTierFromDiff(['apps/vada-ai/specs/architecture.md'])).toBe(1)
  })

  it('doc file in diff → tier 1', () => {
    expect(deriveTierFromDiff(['aeg-root/roles/developer.md'])).toBe(1)
    expect(deriveTierFromDiff(['.claude/skills/brief-authoring/SKILL.md'])).toBe(1)
  })

  it('code + doc together → tier 1', () => {
    expect(deriveTierFromDiff(['apps/herald-ai/web/src/lib/foo.ts', 'aeg-root/skills/brief-authoring/SKILL.md'])).toBe(
      1
    )
  })
})

describe('readTierFromPrBody', () => {
  it('reads plain form', () => {
    expect(readTierFromPrBody('Tier: 3')).toBe(3)
  })

  it('reads bold-colon form', () => {
    expect(readTierFromPrBody('**Tier:** 1')).toBe(1)
  })

  it('reads bold-label form', () => {
    expect(readTierFromPrBody('**Tier**: 0')).toBe(0)
  })

  it('finds the field inline in a metadata line, not anchored to line-start', () => {
    expect(readTierFromPrBody('Iteration: x · Task: 1 · **Tier:** 3 · Project: y')).toBe(3)
  })

  it('returns null when no Tier field is present', () => {
    expect(readTierFromPrBody('no tier field here')).toBeNull()
  })

  it('rejects a value outside {0,1,3} (no Tier 2)', () => {
    expect(readTierFromPrBody('Tier: 2')).toBeNull()
  })
})

describe('overrideActive', () => {
  it('OVERRIDE_DOCS=1 activates', () => {
    expect(overrideActive({ overrideDocsEnv: '1' })).toBe(true)
  })

  it('override:docs label activates', () => {
    expect(overrideActive({ prLabels: 'vinaya/tier:3, override:docs' })).toBe(true)
  })

  it('[override:docs] in the PR body activates', () => {
    expect(overrideActive({ prBody: 'some text [override:docs] more text' })).toBe(true)
  })

  it('none present → inactive', () => {
    expect(overrideActive({ prLabels: 'vinaya/tier:1', prBody: 'no override here' })).toBe(false)
  })

  it('all inputs absent → inactive', () => {
    expect(overrideActive({})).toBe(false)
  })
})
