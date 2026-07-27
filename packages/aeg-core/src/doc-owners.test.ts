import { describe, expect, it } from 'vitest'
import {
  classifyDocOwnersManifest,
  DOC_OWNERS_PATH,
  evaluateC5,
  globToRegex,
  isUrlPointer,
  parseDocOwners,
  pointerToPath
} from './doc-owners'

/**
 * `verify-dispatch --surfaces` must distinguish a repo that never configured
 * doc ownership from one whose manifest resolved to nothing — the second is a
 * broken derivation reporting success, which is the failure a silent `exit 0`
 * used to hide. Four review rounds flagged this branch as untested; it was
 * untestable while it lived inside a command that chdirs to the repo root.
 */
describe('classifyDocOwnersManifest', () => {
  it('absent — no manifest at all is dormant, never a failure', () => {
    expect(classifyDocOwnersManifest(null)).toBe('absent')
  })

  it('empty — a manifest that exists but says nothing must never read as success', () => {
    expect(classifyDocOwnersManifest('')).toBe('empty')
    expect(classifyDocOwnersManifest('   \n\n  \t\n')).toBe('empty')
  })

  it('present — any real content, including comment-only, is parsed rather than assumed', () => {
    expect(classifyDocOwnersManifest('packages/ui/**  docs/ui.md')).toBe('present')
    // A comment-only manifest is a deliberate, configured state: it parses to
    // zero bindings, which the caller reports as "no mechanical floor" — a
    // different outcome from "the file was not there."
    expect(classifyDocOwnersManifest('# bindings intentionally removed\n')).toBe('present')
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

describe('isUrlPointer / pointerToPath', () => {
  it('recognizes http(s) pointers', () => {
    expect(isUrlPointer('https://example.com/docs')).toBe(true)
    expect(isUrlPointer('http://example.com/docs')).toBe(true)
    expect(isUrlPointer('aeg-root/state-machine.md')).toBe(false)
  })

  it('strips an anchor fragment', () => {
    expect(pointerToPath('aeg-root/state-machine.md#section-9')).toBe('aeg-root/state-machine.md')
    expect(pointerToPath('aeg-root/state-machine.md')).toBe('aeg-root/state-machine.md')
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
    const r = evaluateC5(['packages/ui/topbar/index.tsx'], null, '', fileExists([]), false)
    expect(r.errors).toEqual([])
    expect(r.notes).toEqual([])
  })

  it('dormant — doc-owners present but no glob fires → empty result', () => {
    const r = evaluateC5(['packages/unrelated/x.ts'], OWNERS, '', fileExists([]), false)
    expect(r.errors).toEqual([])
    expect(r.notes).toEqual([])
  })

  it('strong-pass — code change + matching doc in diff → no error', () => {
    const r = evaluateC5(
      ['packages/ui/topbar/index.tsx', '.claude/skills/ui-components/SKILL.md'],
      OWNERS,
      '',
      fileExists([]),
      false
    )
    expect(r.errors).toEqual([])
  })

  it('strong-fail — code change but matching doc absent from diff → error names the doc', () => {
    const r = evaluateC5(['packages/ui/topbar/index.tsx'], OWNERS, '', fileExists([]), false)
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/C5 doc-coverage/)
    expect(r.errors[0]).toMatch(/\.claude\/skills\/ui-components\/SKILL\.md/)
  })

  it('url-ack — URL binding satisfied by a matching Doc-ack line in the PR body', () => {
    const body = 'Doc-ack: https://example.com/foo-docs — confirmed, no change needed'
    const r = evaluateC5(['packages/foo/index.ts'], OWNERS, body, fileExists([]), false)
    expect(r.errors).toEqual([])
  })

  it('url-ack-missing — URL binding without Doc-ack → error names the URL', () => {
    const r = evaluateC5(['packages/foo/index.ts'], OWNERS, '', fileExists([]), false)
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/External pointer requires `Doc-ack: https:\/\/example\.com\/foo-docs/)
  })

  it('dangling — in-repo pointer that does not exist → distinct dangling error', () => {
    const r = evaluateC5(['packages/dangling/x.ts'], OWNERS, '', fileExists(['docs/does-not-exist.md']), false)
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/C5 doc-owners-dangling/)
    expect(r.errors[0]).toMatch(/docs\/does-not-exist\.md/)
  })

  it('waiver active — suppresses a missing-doc error and logs a note instead', () => {
    const r = evaluateC5(['packages/ui/topbar/index.tsx'], OWNERS, '', fileExists([]), true)
    expect(r.errors).toEqual([])
    expect(r.notes.length).toBe(1)
    expect(r.notes[0]).toMatch(/C5 doc-waiver active/)
    expect(r.notes[0]).toMatch(/\.claude\/skills\/ui-components\/SKILL\.md/)
  })

  it('waiver active — also suppresses a URL-ack-missing error PR-wide', () => {
    const r = evaluateC5(['packages/foo/index.ts'], OWNERS, '', fileExists([]), true)
    expect(r.errors).toEqual([])
    expect(r.notes.length).toBe(1)
    expect(r.notes[0]).toMatch(/C5 doc-waiver active/)
    expect(r.notes[0]).toMatch(/https:\/\/example\.com\/foo-docs/)
  })

  it('separator tolerance — Doc-ack with a plain hyphen separator satisfies a URL binding', () => {
    // Mirror of the em-dash url-ack test, with the separator typed as " - ".
    const body = 'Doc-ack: https://example.com/foo-docs - confirmed, no change needed'
    const r = evaluateC5(['packages/foo/index.ts'], OWNERS, body, fileExists([]), false)
    expect(r.errors).toEqual([])
  })

  it('multiple bindings — strong-pass for one + strong-fail for another → only the failing error', () => {
    const r = evaluateC5(
      // matches both topbar binding AND verify-docs binding; only the topbar SKILL.md is in the diff.
      ['packages/ui/topbar/index.tsx', '.claude/skills/ui-components/SKILL.md', 'scripts/verify-docs.ts'],
      OWNERS,
      '',
      fileExists([]),
      false
    )
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]).toMatch(/aeg-root\/state-machine\.md/)
  })
})

describe('the real manifest resolves at its configured path', () => {
  // Review finding: a missing or misresolved `doc-owners` path returns silent
  // success ("dormant — no bindings"), so a relocation that breaks it would
  // pass every gate. This asserts the real file, at the real path, parses.
  it('parses .vinaya/doc-owners with real bindings', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const raw = readFileSync(join(__dirname, '../../..', DOC_OWNERS_PATH), 'utf8')
    const { bindings, errors } = parseDocOwners(raw)
    expect(errors).toEqual([])
    expect(bindings.length).toBeGreaterThan(0)
  })
})
