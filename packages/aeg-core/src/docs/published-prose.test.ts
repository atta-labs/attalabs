import { describe, expect, it } from 'vitest'
import {
  countWords,
  enforcementPublishedText,
  evaluatePublishedProse,
  extractShortVersion,
  publishedDoctrineBody,
  type PublishedProseEntry
} from './published-prose'

const SURFACED = new Set(['roles/developer.md', 'contracts/planner-brief.md', 'enforcement.md'])

/** Padding so a fixture clears the 150-word floor without carrying meaning. */
function filler(words: number): string {
  return Array.from({ length: words }, () => 'word').join(' ')
}

function roleShortVersion(options: { blocks?: string[]; extra?: string; padWords?: number } = {}): string {
  const blocks = options.blocks ?? ['You own', 'You refuse', 'You never', 'How it physically runs']
  const body = blocks
    .map((b) => `**${b}** — the obligation this block states, in plain words. ${filler(30)}`)
    .join('\n\n')
  return [
    '# Developer — Role Reference',
    '',
    '## The short version',
    '',
    `You execute one brief and answer for it. ${options.extra ?? ''}`,
    '',
    body,
    options.padWords ? `\n${filler(options.padWords)}` : '',
    '',
    'Everything below is the reference.',
    '',
    '## Reference',
    '',
    'The long body nobody publishes, naming D-135 and packages/aeg-core/bin/foo.ts freely.'
  ].join('\n')
}

function entry(relPath: string, body: string): PublishedProseEntry {
  return { relPath, frontmatter: {}, body }
}

describe('extractShortVersion / publishedDoctrineBody', () => {
  it('extracts only the short-version section, stopping at the next heading', () => {
    const short = extractShortVersion(roleShortVersion())
    expect(short).toContain('You execute one brief')
    expect(short).not.toContain('The long body nobody publishes')
  })

  it('returns null when the doc carries no short version', () => {
    expect(extractShortVersion('# Title\n\n## Reference\n\nbody')).toBeNull()
  })

  it('publishes the short version when present', () => {
    expect(publishedDoctrineBody(roleShortVersion())).toContain('You execute one brief')
    expect(publishedDoctrineBody(roleShortVersion())).not.toContain('The long body nobody publishes')
  })

  it('never leaks the reference when the short version is missing', () => {
    const body = '# Title\n\nA preamble.\n\n## Reference\n\nInternal detail: D-135.'
    expect(publishedDoctrineBody(body)).toBe('# Title\n\nA preamble.')
  })
})

describe('C7 structure', () => {
  it('passes a compliant role short version', () => {
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', roleShortVersion())], SURFACED)
    expect(errors).toEqual([])
  })

  it('fails a surfaced doc with no short version', () => {
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', '# Developer\n\nbody')], SURFACED)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('has no "## The short version" section')
  })

  it('fails a short version missing one of the four blocks', () => {
    const body = roleShortVersion({ blocks: ['You own', 'You refuse', 'How it physically runs'] })
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', body)], SURFACED)
    expect(errors.some((e) => e.includes('missing the "You never" block'))).toBe(true)
  })

  it('fails blocks that appear out of order', () => {
    const body = roleShortVersion({ blocks: ['You never', 'You own', 'You refuse', 'How it physically runs'] })
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', body)], SURFACED)
    expect(errors.some((e) => e.includes('missing the "How it physically runs" block'))).toBe(false)
    expect(errors.some((e) => e.includes('missing the "You never" block'))).toBe(true)
  })

  it('fails an over-long short version', () => {
    const { errors } = evaluatePublishedProse(
      [entry('roles/developer.md', roleShortVersion({ padWords: 400 }))],
      SURFACED
    )
    expect(errors.some((e) => e.includes('over the 450-word ceiling'))).toBe(true)
  })

  it('fails an under-length short version', () => {
    const body = [
      '# Developer',
      '',
      '## The short version',
      '',
      '**You own** — it. **You refuse** — nothing. **You never** — anything. **How it physically runs** — somehow.',
      '',
      '## Reference',
      '',
      'body'
    ].join('\n')
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', body)], SURFACED)
    expect(errors.some((e) => e.includes('under the 150-word floor'))).toBe(true)
  })

  it('requires the contract block set on a contract, not the role one', () => {
    const roleBlocksOnAContract = roleShortVersion().replace('# Developer — Role Reference', '# Contract')
    const { errors } = evaluatePublishedProse([entry('contracts/planner-brief.md', roleBlocksOnAContract)], SURFACED)
    expect(errors.some((e) => e.includes('missing the "What crosses" block'))).toBe(true)
  })

  it('passes a compliant contract short version', () => {
    const body = roleShortVersion({
      blocks: ['What crosses', 'The hand-off is malformed', 'What it does not carry', 'How it physically runs']
    })
    const { errors } = evaluatePublishedProse([entry('contracts/planner-brief.md', body)], SURFACED)
    expect(errors).toEqual([])
  })

  it('ignores a doc the model does not surface', () => {
    const { errors } = evaluatePublishedProse([entry('roles/unsurfaced.md', '# Nope\n\nbody')], SURFACED)
    expect(errors).toEqual([])
  })
})

describe('C7 readability', () => {
  const withToken = (token: string) => roleShortVersion({ extra: token })

  it('fails a decision id in published text', () => {
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', withToken('See D-999.'))], SURFACED)
    expect(errors.some((e) => e.includes('a decision id') && e.includes('D-999'))).toBe(true)
  })

  it('passes a decision id that lives in provenance frontmatter, not the page', () => {
    const body = roleShortVersion()
    const withProvenance = `---\nprovenance: >\n  The reasoning lives in D-999.\n---\n${body}`
    // The caller hands this check a parsed body: frontmatter is stripped before
    // it ever arrives, which is exactly why `provenance:` is the sanctioned
    // home for an internal reference.
    const { errors } = evaluatePublishedProse(
      [entry('roles/developer.md', withProvenance.slice(withProvenance.indexOf('---\n', 4) + 4))],
      SURFACED
    )
    expect(errors).toEqual([])
  })

  it('fails a section sign, a forge number and the retired public name', () => {
    for (const token of ['See §4.', 'See #1234.', 'The AEG model.']) {
      const { errors } = evaluatePublishedProse([entry('roles/developer.md', withToken(token))], SURFACED)
      expect(errors.length, token).toBeGreaterThan(0)
    }
  })

  it('fails a tranche slug', () => {
    const { errors } = evaluatePublishedProse(
      [entry('roles/developer.md', withToken('Shipped in vinaya-pages-v2.'))],
      SURFACED
    )
    expect(errors.some((e) => e.includes('a tranche slug'))).toBe(true)
  })

  it('fails label vocabulary, namespaced and retired alike', () => {
    for (const token of ['Apply vinaya/waiver:docs.', 'Apply waiver:docs.', 'Label it tranche:<slug>.']) {
      const { errors } = evaluatePublishedProse([entry('roles/developer.md', withToken(token))], SURFACED)
      expect(
        errors.some((e) => e.includes('forge label vocabulary')),
        token
      ).toBe(true)
    }
  })

  it('fails a repo-internal path', () => {
    const { errors } = evaluatePublishedProse(
      [entry('roles/developer.md', withToken('Run packages/aeg-core/bin/foo.ts.'))],
      SURFACED
    )
    expect(errors.some((e) => e.includes('repo-internal'))).toBe(true)
  })

  it('passes the protocol mechanics a reader must learn', () => {
    const mechanics = 'You work in `.worktrees/task/<tranche>/<n>` on branch `task/<tranche>/<n>`.'
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', withToken(mechanics))], SURFACED)
    expect(errors).toEqual([])
  })

  it('never reads the reference body, only the short version', () => {
    // The fixture's `## Reference` names a decision id AND an internal path.
    const { errors } = evaluatePublishedProse([entry('roles/developer.md', roleShortVersion())], SURFACED)
    expect(errors).toEqual([])
  })
})

describe('C7 over enforcement.md', () => {
  const ENFORCEMENT = [
    '# Enforcement Map',
    '',
    'The introduction a reader gets.',
    '',
    '## Ring 0 — Hooks',
    '',
    '| Action | Summary | Category | Description | Gate | What must be true | implementation | lock |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| `git commit` | Ever pushed code that did not compile? | hook | Refuses a commit that does not build. | **Pre-commit** | Everything D-999 requires, per packages/aeg-core/bin/foo.ts | `.husky/pre-commit` |  |',
    '',
    '## Ring 1 — Branch Rules',
    '',
    '| CI check | Summary | Category | Description | Re-verifies | implementation | lock |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| Review gate | Ever merged with nobody approving? | ci | Holds the merge until the verdicts exist. | D-134 and §11 | `packages/aeg-core/bin/verify-review-gate.ts` |  |'
  ].join('\n')

  it('reads the intro and the four rendered columns, resolved by header name', () => {
    const texts = enforcementPublishedText(ENFORCEMENT)
    expect(texts.some((t) => t.includes('The introduction a reader gets.'))).toBe(true)
    expect(texts).toContain('Refuses a commit that does not build.')
    expect(texts).toContain('Holds the merge until the verdicts exist.')
    expect(texts).toContain('hook')
  })

  it('never scans the enforcing columns', () => {
    const texts = enforcementPublishedText(ENFORCEMENT).join('\n')
    expect(texts).not.toContain('D-999')
    expect(texts).not.toContain('§11')
    expect(texts).not.toContain('.husky/pre-commit')
    const { errors } = evaluatePublishedProse([entry('enforcement.md', ENFORCEMENT)], SURFACED)
    expect(errors).toEqual([])
  })

  it('fails an unresolvable token in a column that does reach the page', () => {
    const leaky = ENFORCEMENT.replace(
      'Refuses a commit that does not build.',
      'Refuses a commit that does not build (D-999).'
    )
    const { errors } = evaluatePublishedProse([entry('enforcement.md', leaky)], SURFACED)
    expect(errors.some((e) => e.includes('D-999'))).toBe(true)
  })
})

describe('countWords', () => {
  it('counts whitespace-separated tokens', () => {
    expect(countWords('  one two   three \n four ')).toBe(4)
    expect(countWords('')).toBe(0)
  })
})
