import { describe, expect, it } from 'bun:test'
import { deriveTierFromDiff } from './verify-docs'

describe('deriveTierFromDiff', () => {
  it('decision-log in diff → tier 3 (C0 error still emitted; explicit declaration required)', () => {
    expect(deriveTierFromDiff(['aeg-project/decisions.md'])).toBe(3)
    expect(deriveTierFromDiff(['apps/herald-ai/specs/herald-decisions.md'])).toBe(3)
    // decision log wins over any other file in the same diff
    expect(deriveTierFromDiff(['apps/foo/web/src/lib/foo.ts', 'aeg-project/decisions.md'])).toBe(3)
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
