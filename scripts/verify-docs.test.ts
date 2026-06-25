import { describe, expect, it } from 'bun:test'
import { deriveTierFromDiff, evaluateC5, globToRegex, parseDocOwners } from './verify-docs'

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

describe('globToRegex (doc-owners glob → regex)', () => {
  it('** matches across slashes; * does not', () => {
    expect(globToRegex('packages/ui/topbar/**').test('packages/ui/topbar/index.tsx')).toBe(true)
    expect(globToRegex('packages/ui/topbar/**').test('packages/ui/topbar/nested/deep/x.tsx')).toBe(true)
    expect(globToRegex('packages/ui/*.ts').test('packages/ui/index.ts')).toBe(true)
    expect(globToRegex('packages/ui/*.ts').test('packages/ui/topbar/index.ts')).toBe(false)
  })

  it('Next.js dynamic segments like [username] match literally (no character-class)', () => {
    const re = globToRegex('apps/herald-ai/web/src/app/[username]/**')
    expect(re.test('apps/herald-ai/web/src/app/[username]/(owner)/layout.tsx')).toBe(true)
    // `u` alone is NOT a member of a `[username]` character class — must require the brackets:
    expect(re.test('apps/herald-ai/web/src/app/u/layout.tsx')).toBe(false)
  })

  it('exact-path globs match exactly', () => {
    const re = globToRegex('scripts/verify-docs.ts')
    expect(re.test('scripts/verify-docs.ts')).toBe(true)
    expect(re.test('scripts/verify-docs.test.ts')).toBe(false)
  })
})

describe('parseDocOwners', () => {
  it('parses simple two-column lines, skips blanks and comments', () => {
    const { bindings, errors } = parseDocOwners(
      [
        '# header',
        '',
        'packages/ui/topbar/**   .claude/skills/ui-components/SKILL.md',
        '   # indented comment',
        'scripts/verify-docs.ts   aeg-root/state-machine.md   # trailing comment',
        ''
      ].join('\n')
    )
    expect(errors).toEqual([])
    expect(bindings).toEqual([
      { glob: 'packages/ui/topbar/**', pointer: '.claude/skills/ui-components/SKILL.md', lineNum: 3 },
      { glob: 'scripts/verify-docs.ts', pointer: 'aeg-root/state-machine.md', lineNum: 5 }
    ])
  })

  it('reports a parse error for a malformed (single-column) binding', () => {
    const { bindings, errors } = parseDocOwners('only-one-column\n')
    expect(bindings).toEqual([])
    expect(errors.length).toBe(1)
    expect(errors[0]).toMatch(/malformed binding/)
  })
})

describe('evaluateC5 — six required paths', () => {
  const OWNERS = [
    'packages/ui/topbar/**                            .claude/skills/ui-components/SKILL.md',
    'scripts/verify-docs.ts                           aeg-root/state-machine.md',
    'packages/foo/**                                  https://example.com/foo-docs',
    'packages/dangling/**                             docs/does-not-exist.md'
  ].join('\n')

  // Closure-based fake fs: every path "exists" by default; named paths "don't".
  const fileExists = (missing: string[]) => (p: string) => !missing.includes(p)

  it('dormant — doc-owners absent → empty result', () => {
    const r = evaluateC5(['packages/ui/topbar/index.tsx'], null, '')
    expect(r.errors).toEqual([])
    expect(r.notes).toEqual([])
  })

  it('dormant — doc-owners present but no glob fires → empty result', () => {
    const r = evaluateC5(['packages/unrelated/x.ts'], OWNERS, '', fileExists([]))
    expect(r.errors).toEqual([])
    expect(r.notes).toEqual([])
  })

  it('strong-pass — code change + matching doc in diff → no error', () => {
    const r = evaluateC5(
      ['packages/ui/topbar/index.tsx', '.claude/skills/ui-components/SKILL.md'],
      OWNERS,
      '',
      fileExists([])
    )
    expect(r.errors).toEqual([])
  })

  it('strong-fail — code change but matching doc absent from diff → error names the doc', () => {
    const r = evaluateC5(['packages/ui/topbar/index.tsx'], OWNERS, '', fileExists([]))
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/C5 doc-coverage/)
    expect(r.errors[0]).toMatch(/\.claude\/skills\/ui-components\/SKILL\.md/)
  })

  it('url-ack — URL binding satisfied by a matching Doc-ack line in the PR body', () => {
    const body = 'Doc-ack: https://example.com/foo-docs — confirmed, no change needed'
    const r = evaluateC5(['packages/foo/index.ts'], OWNERS, body, fileExists([]))
    expect(r.errors).toEqual([])
  })

  it('url-ack-missing — URL binding without Doc-ack → error names the URL', () => {
    const r = evaluateC5(['packages/foo/index.ts'], OWNERS, '', fileExists([]))
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/External pointer requires `Doc-ack: https:\/\/example\.com\/foo-docs/)
  })

  it('dangling — in-repo pointer that does not exist → distinct dangling error', () => {
    const r = evaluateC5(['packages/dangling/x.ts'], OWNERS, '', fileExists(['docs/does-not-exist.md']))
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/C5 doc-owners-dangling/)
    expect(r.errors[0]).toMatch(/docs\/does-not-exist\.md/)
  })

  it('waiver — Doc-waiver suppresses a missing-doc error and logs a note', () => {
    const body = 'Doc-waiver: .claude/skills/ui-components/SKILL.md — out of scope this PR; tracked in #999'
    const r = evaluateC5(['packages/ui/topbar/index.tsx'], OWNERS, body, fileExists([]))
    expect(r.errors).toEqual([])
    expect(r.notes.length).toBe(1)
    expect(r.notes[0]).toMatch(/C5 doc-waiver active/)
    expect(r.notes[0]).toMatch(/out of scope/)
  })

  it('multiple bindings — strong-pass for one + strong-fail for another → only the failing error', () => {
    const r = evaluateC5(
      // matches both topbar binding AND verify-docs binding; only the topbar SKILL.md is in the diff.
      ['packages/ui/topbar/index.tsx', '.claude/skills/ui-components/SKILL.md', 'scripts/verify-docs.ts'],
      OWNERS,
      '',
      fileExists([])
    )
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/aeg-root\/state-machine\.md/)
  })
})
