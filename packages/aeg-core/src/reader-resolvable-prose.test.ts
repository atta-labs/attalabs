import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkReaderResolvableProse,
  checkUndefinedVocabulary,
  checkUnresolvableReferences,
  classifyProseFile,
  legacySlugPattern,
  parseGlossaryTerms,
  stripNonProse
} from './reader-resolvable-prose'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Same derivation `retired-vocabulary.test.ts` uses: read live, never guessed. */
function legacySlugs(): string[] {
  const dir = join(REPO_ROOT, 'aeg-root/tranches/completed')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.tokens.md'))
    .map((f) => f.slice(0, -3))
    .filter((slug) => !/-v[0-9]+$/.test(slug))
}

const REAL_GLOSSARY = readFileSync(join(REPO_ROOT, 'aeg-root/glossary.md'), 'utf8')

/** This test's own consumer-supplied reader-facing shape — mirrors the real bin script's literal. */
const READER_FACING_PREFIX = 'apps/vinaya-portal/web/src/app/(site)/'
const READER_FACING_SUFFIX = '/page.tsx'

describe('classifyProseFile — the three-class map', () => {
  it('classifies aeg-root/** as ships', () => {
    expect(classifyProseFile('aeg-root/enforcement.md', READER_FACING_PREFIX, READER_FACING_SUFFIX)).toBe('ships')
    expect(classifyProseFile('aeg-root/roles/developer.md', READER_FACING_PREFIX, READER_FACING_SUFFIX)).toBe('ships')
  })

  it('classifies the archived-tranche history under aeg-root as internal, not ships', () => {
    expect(
      classifyProseFile('aeg-root/tranches/completed/aeg-ui-v1.md', READER_FACING_PREFIX, READER_FACING_SUFFIX)
    ).toBe('internal')
  })

  it('classifies a (site) page as reader-facing', () => {
    expect(
      classifyProseFile(
        'apps/vinaya-portal/web/src/app/(site)/start/quick/page.tsx',
        READER_FACING_PREFIX,
        READER_FACING_SUFFIX
      )
    ).toBe('reader-facing')
  })

  it('does not classify a (site) non-page component as reader-facing', () => {
    expect(
      classifyProseFile(
        'apps/vinaya-portal/web/src/app/(site)/_components/canvas/TwoErasCanvas.tsx',
        READER_FACING_PREFIX,
        READER_FACING_SUFFIX
      )
    ).toBeNull()
  })

  it('classifies apps/*/specs/** as internal', () => {
    expect(classifyProseFile('apps/vinaya/specs/vinaya-spec.md', READER_FACING_PREFIX, READER_FACING_SUFFIX)).toBe(
      'internal'
    )
  })

  it('classifies any CLAUDE.md as internal', () => {
    expect(classifyProseFile('CLAUDE.md', READER_FACING_PREFIX, READER_FACING_SUFFIX)).toBe('internal')
    expect(classifyProseFile('apps/vinaya/CLAUDE.md', READER_FACING_PREFIX, READER_FACING_SUFFIX)).toBe('internal')
  })

  it('classifies an unrelated source file as out of scope entirely', () => {
    expect(classifyProseFile('packages/aeg-core/src/index.ts', READER_FACING_PREFIX, READER_FACING_SUFFIX)).toBeNull()
  })
})

describe('class 1 — unresolvable references — the gate can see what it bans', () => {
  it('fires on a bare forge number, drawn from the ships class', () => {
    const findings = checkUnresolvableReferences(
      [{ path: 'aeg-root/enforcement.md', content: 'fixed the gap (task 3, #365)' }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
    expect(findings[0]!.message).toContain('forge number')
  })

  it('fires on a bare forge number, drawn from the reader-facing class', () => {
    const findings = checkUnresolvableReferences(
      [{ path: 'apps/vinaya-portal/web/src/app/(site)/roadmap/page.tsx', content: 'shipped in (#365)' }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
  })

  it('fires on a bare -vN tranche slug, drawn from the ships class', () => {
    const findings = checkUnresolvableReferences(
      [{ path: 'aeg-root/roles/developer.md', content: 'landed in aeg-coherence-v1 task 3' }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
    expect(findings[0]!.message).toContain('tranche slug')
  })

  it('fires on a real legacy slug (predates -vN), drawn from the ships class — the coverage gap `retired-vocabulary.test.ts` closed', () => {
    const slugs = legacySlugs()
    expect(slugs.length, 'no legacy slugs on disk to prove coverage against').toBeGreaterThan(0)
    const findings = checkUnresolvableReferences(
      [{ path: 'aeg-root/enforcement.md', content: `shipped during ${slugs[0]}` }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX,
      slugs
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
  })

  it('the legacy-slug pattern does NOT fire on a bare substring inside a longer, unrelated token (review finding: MINOR)', () => {
    const slugs = legacySlugs()
    expect(slugs.length, 'no legacy slugs on disk to prove this against').toBeGreaterThan(0)
    const pattern = legacySlugPattern(slugs)
    expect(pattern).not.toBeNull()
    // e.g. real slug `aeg-consolidation` must not match inside `xxx-aeg-consolidation-suffixyyy`
    const embedded = `xxx-${slugs[0]}-suffixyyy`
    expect((pattern as RegExp).test(embedded)).toBe(false)
  })

  it('the legacy-slug pattern reports only the slug itself, not the boundary characters around it', () => {
    const slugs = legacySlugs()
    const findings = checkUnresolvableReferences(
      [{ path: 'aeg-root/enforcement.md', content: `(shipped during ${slugs[0]}.)` }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX,
      slugs
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
    expect(findings[0]!.message).toContain(`"${slugs[0]}"`)
  })

  it('does NOT fire inside a markdown code fence — a quoted example is not prose', () => {
    const content = ['See the grammar:', '```', 'Closes #365', '```', 'in every PR.'].join('\n')
    const findings = checkUnresolvableReferences(
      [{ path: 'aeg-root/enforcement.md', content }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('does NOT fire inside a .tsx source comment — a developer comment is not reader prose', () => {
    const content = ['// task 9 (#569) added them for `/cli`', 'export default function Page() { return null }'].join(
      '\n'
    )
    const findings = checkUnresolvableReferences(
      [{ path: 'apps/vinaya-portal/web/src/app/(site)/docs/page.tsx', content }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('never sweeps apps/*/specs/** or CLAUDE.md — references are legitimate there', () => {
    const findings = checkUnresolvableReferences(
      [
        { path: 'apps/vinaya/specs/vinaya-spec.md', content: 'closed by (#365), see aeg-coherence-v1' },
        { path: 'apps/vinaya/CLAUDE.md', content: 'closed by (#365), see aeg-coherence-v1' }
      ],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('red before green — a seeded violation fails, then the fix passes', () => {
    const violating = checkUnresolvableReferences(
      [{ path: 'aeg-root/roles/developer.md', content: 'This closed the gap (#365).' }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(violating.length, 'expected the seeded violation to be caught').toBeGreaterThan(0)

    const fixed = checkUnresolvableReferences(
      [{ path: 'aeg-root/roles/developer.md', content: 'This closed the gap in a prior task.' }],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(fixed).toEqual([])
  })
})

describe('class 2 — undefined coined vocabulary — the gate can see what it bans', () => {
  const glossaryTerms = parseGlossaryTerms(REAL_GLOSSARY)

  it('the real glossary yields the expected term list', () => {
    expect(glossaryTerms).toEqual(
      expect.arrayContaining([
        'Brief',
        'Dispatch',
        'Forge',
        'Gate',
        'Impact tier',
        'Provenance',
        'Ratification',
        'Seam',
        'Step 0',
        'The Dig',
        'Tranche',
        'Worktree'
      ])
    )
  })

  it('fires on a coined term used bare, drawn from the reader-facing class', () => {
    const findings = checkUndefinedVocabulary(
      [
        {
          path: 'apps/vinaya-portal/web/src/app/(site)/start/quick/page.tsx',
          content: "This step's changes land in the current tranche."
        }
      ],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
    expect(findings[0]!.message).toContain('Tranche')
  })

  it('fires on a coined term used bare, drawn from the ships class', () => {
    const findings = checkUndefinedVocabulary(
      [{ path: 'aeg-root/roles/planner.md', content: 'The planner reads the tranche next.' }],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
  })

  it('does NOT fire when the file defines the term inline (same "Term — definition" shape)', () => {
    const findings = checkUndefinedVocabulary(
      [
        {
          path: 'apps/vinaya-portal/web/src/app/(site)/start/quick/page.tsx',
          content: 'A tranche — a named batch of related tasks — is what ships together.'
        }
      ],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('does NOT fire when the file links the glossary', () => {
    const findings = checkUndefinedVocabulary(
      [
        {
          path: 'apps/vinaya-portal/web/src/app/(site)/start/quick/page.tsx',
          content: 'This lands in the current tranche. See /docs/glossary for definitions.'
        }
      ],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('does NOT match an ordinary-English word that merely contains a coined term ("briefly" is not "Brief")', () => {
    const findings = checkUndefinedVocabulary(
      [{ path: 'aeg-root/roles/planner.md', content: 'The planner briefly summarizes the sizing.' }],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('never sweeps apps/*/specs/** or CLAUDE.md — this reader already has this forge', () => {
    const findings = checkUndefinedVocabulary(
      [
        { path: 'apps/vinaya/specs/vinaya-spec.md', content: 'The tranche and its brief are dispatched.' },
        { path: 'apps/vinaya/CLAUDE.md', content: 'The tranche and its brief are dispatched.' }
      ],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings).toEqual([])
  })

  it('reads the real glossary — deleting an entry from a scratch copy stops that term being checkable', () => {
    const withEntry = parseGlossaryTerms(REAL_GLOSSARY)
    expect(withEntry).toContain('Tranche')

    const scratch = REAL_GLOSSARY.split('\n')
      .filter((line) => !line.startsWith('**Tranche** —'))
      .join('\n')
    const withoutEntry = parseGlossaryTerms(scratch)
    expect(withoutEntry).not.toContain('Tranche')
    // Restored: the real file on disk was never touched — `scratch` is a
    // string derived in memory, not written back.
    expect(parseGlossaryTerms(REAL_GLOSSARY)).toContain('Tranche')
  })

  it('red before green — a seeded violation fails, then the fix (an inline definition) passes', () => {
    const violating = checkUndefinedVocabulary(
      [{ path: 'apps/vinaya-portal/web/src/app/(site)/roadmap/page.tsx', content: 'The forge tracks every task.' }],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(violating.length, 'expected the seeded violation to be caught').toBeGreaterThan(0)

    const fixed = checkUndefinedVocabulary(
      [
        {
          path: 'apps/vinaya-portal/web/src/app/(site)/roadmap/page.tsx',
          content: 'The forge — the Git host treated as the source of truth — tracks every task.'
        }
      ],
      glossaryTerms,
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(fixed).toEqual([])
  })
})

describe('stripNonProse', () => {
  it('blanks fenced and inline code in markdown while preserving line count', () => {
    const content = ['before', '```', 'inside #365', '```', 'after `#365` too'].join('\n')
    const stripped = stripNonProse('aeg-root/x.md', content)
    expect(stripped.split('\n')).toHaveLength(5)
    expect(stripped).not.toContain('#365')
  })

  it('blanks line and block comments in .tsx while preserving line count', () => {
    const content = ['const a = 1 // #365', '/* tranche', 'still a comment */', 'const b = 2'].join('\n')
    const stripped = stripNonProse('apps/vinaya-portal/web/src/app/(site)/x/page.tsx', content)
    expect(stripped.split('\n')).toHaveLength(4)
    expect(stripped).not.toContain('#365')
    expect(stripped).not.toContain('tranche')
  })

  it('leaves other file kinds untouched', () => {
    expect(stripNonProse('apps/vinaya/specs/vinaya-spec.md.txt', '// not stripped')).toBe('// not stripped')
  })

  it('does NOT treat a URL\'s "//" as a comment start — real prose after it survives (review finding: MAJOR)', () => {
    const content = '<p>See https://vinaya.dev — every tranche ships here</p>'
    const stripped = stripNonProse('apps/vinaya-portal/web/src/app/(site)/x/page.tsx', content)
    expect(stripped).toContain('https://vinaya.dev')
    expect(stripped).toContain('every tranche ships here')
  })

  it('still strips a genuine trailing comment that follows a URL on the same line', () => {
    const content = 'const href = "https://vinaya.dev" // tranche: internal note'
    const stripped = stripNonProse('apps/vinaya-portal/web/src/app/(site)/x/page.tsx', content)
    expect(stripped).toContain('https://vinaya.dev')
    expect(stripped).not.toContain('internal note')
  })
})

describe('regression: class 2 still fires on prose that follows a URL on the same line', () => {
  it('detects a bare coined term after "https://" without the URL eating it (review finding: MAJOR)', () => {
    const findings = checkUndefinedVocabulary(
      [
        {
          path: 'apps/vinaya-portal/web/src/app/(site)/start/page.tsx',
          content: '<p>See https://vinaya.dev — every tranche ships here</p>'
        }
      ],
      ['Tranche'],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings, JSON.stringify(findings)).toHaveLength(1)
    expect(findings[0]!.message).toContain('Tranche')
  })
})

describe('checkReaderResolvableProse — runs both classes together', () => {
  it('reports both a reference finding and a vocabulary finding for one file', () => {
    const findings = checkReaderResolvableProse(
      [{ path: 'aeg-root/roles/reviewer.md', content: 'Closed the gap (#365) in this tranche.' }],
      ['Tranche'],
      READER_FACING_PREFIX,
      READER_FACING_SUFFIX
    )
    expect(findings.length).toBeGreaterThanOrEqual(2)
  })
})
