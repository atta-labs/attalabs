import { describe, expect, it } from 'vitest'
import { type VocabularyHit, type VocabularyPattern, evaluateVocabularyCitation } from './vocabulary-citation'

/**
 * Fake `grepFn`/`matchFn` — the whole point of injecting them is that this
 * suite proves the pure evaluator's decision logic without spawning a real
 * `grep`. The bin's own I/O shim (a real `execFileSync('grep', …)`
 * implementation) is proved separately, against real repo content, in the
 * check's own non-vacuity run — not here.
 */
function fakeGrep(
  hitsByPattern: Record<string, VocabularyHit[]>
): (pattern: string, scope: string[]) => VocabularyHit[] {
  return (pattern) => hitsByPattern[pattern] ?? []
}

const ALWAYS_MATCHES = () => true
const NEVER_MATCHES = () => false

describe('evaluateVocabularyCitation', () => {
  it('reports a hit as a finding when no exemption applies', () => {
    const patterns: VocabularyPattern[] = [
      { id: 'product-name', pattern: '\\bvada\\b', scope: ['apps/example'], sample: 'cites vada directly' }
    ]
    const hits = [{ file: 'apps/example/README.md', line: 12, content: 'built on vada internals' }]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ '\\bvada\\b': hits }), ALWAYS_MATCHES)
    expect(result.findings).toEqual([{ ...hits[0], patternId: 'product-name' }])
    expect(result.vacuousPatterns).toEqual([])
  })

  it('drops a hit whose path matches globalExempt', () => {
    const patterns: VocabularyPattern[] = [
      { id: 'product-name', pattern: '\\bvada\\b', scope: ['.'], sample: 'cites vada directly' }
    ]
    const hits = [{ file: 'packages/x/fixtures/data.md', line: 1, content: 'vada' }]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ '\\bvada\\b': hits }), ALWAYS_MATCHES, [
      '/fixtures/'
    ])
    expect(result.findings).toEqual([])
  })

  it('drops a hit whose path matches a per-pattern exempt, on top of globalExempt', () => {
    const patterns: VocabularyPattern[] = [
      {
        id: 'product-name',
        pattern: '\\bvada\\b',
        scope: ['.'],
        sample: 'cites vada directly',
        exempt: ['apps/vinaya/docs/']
      }
    ]
    const hits = [{ file: 'apps/vinaya/docs/history.md', line: 3, content: 'vada' }]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ '\\bvada\\b': hits }), ALWAYS_MATCHES, [
      '/fixtures/'
    ])
    expect(result.findings).toEqual([])
  })

  it('records a pattern whose sample fails to self-match as vacuous, and skips its scope entirely', () => {
    // Deliberately not shaped like any real retired-vocabulary token — this
    // repo's own `retired-vocabulary.test.ts` sweeps `['.']` repo-wide, and a
    // realistic-looking fixture in an aeg-core file not on its own EXEMPT
    // list would trip that unrelated suite.
    const patterns: VocabularyPattern[] = [
      { id: 'broken', pattern: 'ZZZ_UNMATCHABLE_TOKEN', scope: ['.'], sample: 'ZZZ_UNMATCHABLE_TOKEN' }
    ]
    const hits = [{ file: 'apps/example/README.md', line: 1, content: 'ZZZ_UNMATCHABLE_TOKEN lives here' }]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ ZZZ_UNMATCHABLE_TOKEN: hits }), NEVER_MATCHES)
    expect(result.vacuousPatterns).toEqual(['broken'])
    expect(result.findings).toEqual([])
  })

  it('§6 Part 3 — exemptTableRow: a registry table-row citation is not a finding', () => {
    const patterns: VocabularyPattern[] = [
      {
        id: 'harness-claude-path',
        pattern: '\\.claude/hooks/',
        scope: ['aeg-root'],
        sample: 'wired via .claude/hooks/check-skill.sh',
        exemptTableRow: true
      }
    ]
    const hits = [
      {
        file: 'aeg-root/enforcement.md',
        line: 37,
        content: '| Editing a governed file | … | `.claude/hooks/check-skill.sh` |'
      }
    ]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ '\\.claude/hooks/': hits }), ALWAYS_MATCHES)
    expect(result.findings).toEqual([])
  })

  it('§6 Part 3 — exemptTableRow: the identical citation in normative prose IS a finding', () => {
    const patterns: VocabularyPattern[] = [
      {
        id: 'harness-claude-path',
        pattern: '\\.claude/hooks/',
        scope: ['aeg-root'],
        sample: 'wired via .claude/hooks/check-skill.sh',
        exemptTableRow: true
      }
    ]
    const hits = [
      {
        file: 'aeg-root/some-doc.md',
        line: 12,
        content: 'Every agent must run .claude/hooks/check-skill.sh before editing.'
      }
    ]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ '\\.claude/hooks/': hits }), ALWAYS_MATCHES)
    expect(result.findings).toEqual([{ ...hits[0], patternId: 'harness-claude-path' }])
  })

  it('a table row with leading whitespace is still recognized as a table row', () => {
    const patterns: VocabularyPattern[] = [
      {
        id: 'harness-claude-path',
        pattern: '\\.claude/hooks/',
        scope: ['aeg-root'],
        sample: 'wired via .claude/hooks/check-skill.sh',
        exemptTableRow: true
      }
    ]
    const hits = [{ file: 'aeg-root/enforcement.md', line: 5, content: '  | row | `.claude/hooks/x.sh` |' }]
    const result = evaluateVocabularyCitation(patterns, fakeGrep({ '\\.claude/hooks/': hits }), ALWAYS_MATCHES)
    expect(result.findings).toEqual([])
  })

  it('evaluates every pattern independently — one vacuous pattern does not suppress another pattern’s real findings', () => {
    const patterns: VocabularyPattern[] = [
      { id: 'broken', pattern: 'ZZZ_NEVER', scope: ['.'], sample: 'ZZZ_NEVER' },
      { id: 'product-name', pattern: '\\bvada\\b', scope: ['.'], sample: 'cites vada directly' }
    ]
    const hits = [{ file: 'apps/example/README.md', line: 1, content: 'vada' }]
    const result = evaluateVocabularyCitation(
      patterns,
      fakeGrep({ '\\bvada\\b': hits }),
      (pattern) => pattern !== 'ZZZ_NEVER'
    )
    expect(result.vacuousPatterns).toEqual(['broken'])
    expect(result.findings).toEqual([{ ...hits[0], patternId: 'product-name' }])
  })
})
