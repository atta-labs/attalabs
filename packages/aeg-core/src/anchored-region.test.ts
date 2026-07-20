import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { anchoredRegion } from './anchored-region'
import { buildProvenanceBlock, type MergedPrFacts } from './archive-task'
import { checkProjectField } from './brief-validation'
import { checkClosesN, extractClosesReferences, type IterationFile } from './coherence-checks'
import { fenceShapes } from './fixtures/fence-shapes'
import { readTierFromPrBody } from './pr-tier'
import { parsePremiseBlock } from './premise-check'
import { locateTestPlanSection } from './test-plan-section'
import type { Task } from './types'

const FIXTURES = join(__dirname, 'fixtures')

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

// ---------- fixture helpers ---------------------------------------------------

function makeTask(id: string, issue: number | null): Task {
  return { id, title: `Task ${id}`, issue, projects: ['aeg'], dependsOn: [], conflictsWith: [], rationaleMarkdown: '' }
}

function makeIterationFile(slug: string, tasks: Task[]): IterationFile {
  return { slug, archived: false, iteration: { name: slug, lifecycle: 'active', goal: 'test', tasks, backlog: [] } }
}

function makeFacts(body: string): MergedPrFacts {
  return {
    number: 407,
    headRefName: 'task/aeg-governance-hardening/31',
    body,
    mergedAt: '2026-07-05T00:00:00Z',
    mergeSha: 'deadbeef',
    comments: []
  }
}

// ---------- grammar -----------------------------------------------------------

describe('anchoredRegion — grammar', () => {
  it('returns the text between a START/END pair', () => {
    const body = 'before\n<!-- AEG:TIER:START -->\n**Tier:** 1\n<!-- AEG:TIER:END -->\nafter'
    expect(anchoredRegion(body, 'TIER')).toBe('\n**Tier:** 1\n')
  })

  it('returns null when the body carries no pair for the field', () => {
    expect(anchoredRegion('**Tier:** 1\n', 'TIER')).toBeNull()
  })

  it('is field-scoped — a TIER pair is not a PROJECT pair', () => {
    const body = '<!-- AEG:TIER:START -->\n**Tier:** 1\n<!-- AEG:TIER:END -->'
    expect(anchoredRegion(body, 'PROJECT')).toBeNull()
  })

  it('tolerates extra whitespace inside the comment markers', () => {
    const body = '<!--  AEG:TIER:START  -->\n**Tier:** 3\n<!--\tAEG:TIER:END -->'
    expect(anchoredRegion(body, 'TIER')).toBe('\n**Tier:** 3\n')
  })

  it('treats a START with no following END as no anchor at all', () => {
    const body = '<!-- AEG:TIER:START -->\n**Tier:** 1\n(no end marker)'
    expect(anchoredRegion(body, 'TIER')).toBeNull()
  })

  it('first pair wins when a field is anchored twice', () => {
    const body =
      '<!-- AEG:TIER:START -->\nfirst\n<!-- AEG:TIER:END -->\n<!-- AEG:TIER:START -->\nsecond\n<!-- AEG:TIER:END -->'
    expect(anchoredRegion(body, 'TIER')).toBe('\nfirst\n')
  })

  it('ignores markers inside fenced code blocks', () => {
    const body = ['```', '<!-- AEG:TIER:START -->', 'Tier: 3', '<!-- AEG:TIER:END -->', '```'].join('\n')
    expect(anchoredRegion(body, 'TIER')).toBeNull()
  })

  it('ignores markers inside inline code spans', () => {
    const body = 'use `<!-- AEG:TIER:START -->` and `<!-- AEG:TIER:END -->` to anchor the field'
    expect(anchoredRegion(body, 'TIER')).toBeNull()
  })

  it('a fenced decoy marker does not shadow a real pair later in the body', () => {
    const body = [
      '```',
      '<!-- AEG:TIER:START -->',
      'Tier: 3',
      '<!-- AEG:TIER:END -->',
      '```',
      '<!-- AEG:TIER:START -->',
      '**Tier:** 1',
      '<!-- AEG:TIER:END -->'
    ].join('\n')
    expect(anchoredRegion(body, 'TIER')).toBe('\n**Tier:** 1\n')
  })
})

// ---------- round-trip: freeform (no-anchor) bodies parse identically ---------
//
// The fixture is the verbatim body of merged PR #407 (task 31 — a real,
// recent, anchor-free task PR). The expected values below were captured by
// running the UNMODIFIED pre-task-30 parsers over this exact fixture
// (scratch capture, 2026-07-05) — so equality here proves the anchor change
// is a byte-identical no-op for every already-merged freeform body.

describe('anchor recognition is additive — PR #407 freeform round-trip', () => {
  const body = readFileSync(join(FIXTURES, 'pr-body-freeform-407.md'), 'utf8')

  it('carries no anchor pair for any field (a genuine freeform body)', () => {
    for (const field of ['CLOSES', 'PROJECT', 'TIER', 'PREMISE', 'TEST-PLAN'] as const) {
      expect(anchoredRegion(body, field)).toBeNull()
    }
  })

  it('readTierFromPrBody — unchanged (tier 1)', () => {
    expect(readTierFromPrBody(body)).toBe(1)
  })

  it('locateTestPlanSection — unchanged (same section, byte for byte)', () => {
    const r = locateTestPlanSection(body)
    expect(r.found).toBe(true)
    if (r.found) {
      expect(r.section.length).toBe(3419)
      expect(sha256(r.section)).toBe('72590d341f1edbf3f303d5307d0418cc8f76eb15c1a491e2c4b39e11e44572b1')
    }
  })

  it('parsePremiseBlock — unchanged (the five captured pins)', () => {
    expect(parsePremiseBlock(body)).toEqual([
      { kind: 'contains', path: '.github/workflows/archivist.yml', value: 'pull-requests: read' },
      { kind: 'contains', path: '.github/workflows/forge-lifecycle.yml', value: 'aeg-gate-suite' },
      { kind: 'contains', path: '.github/workflows/forge-lifecycle.yml', value: '!cancelled()' },
      { kind: 'contains', path: 'apps/vada-ai/web/vercel.json', value: 'git fetch --depth=100 origin main:main' },
      { kind: 'contains', path: 'apps/vada-ai/web/vercel.json', value: '--fallback=main' }
    ])
  })

  it('checkProjectField — unchanged (pass)', () => {
    expect(checkProjectField(body).status).toBe('pass')
  })

  it('checkClosesN — unchanged (ok, expected Issue 395)', () => {
    const files = [makeIterationFile('aeg-governance-hardening', [makeTask('31', 395)])]
    const r = checkClosesN('task/aeg-governance-hardening/31', body, files)
    expect(r.ok).toBe(true)
    expect(r.expectedIssue).toBe(395)
  })

  it('buildProvenanceBlock — unchanged (same block, byte for byte)', () => {
    const { block, issue, dangling } = buildProvenanceBlock(makeFacts(body))
    expect(issue).toBe(395)
    expect(dangling).toEqual([
      'no code-reviewer verdict comment found on this PR',
      'no security-review verdict comment found on this PR'
    ])
    expect(sha256(block)).toBe('813b4f79e10d1c0f0f5630361c8adc5501bf23df2f4abe8c7dc146047b59aeb0')
  })
})

// ---------- anchor vs decoy: the anchored value always wins -------------------
//
// Each body below carries BOTH an anchored real value and a decoy that the
// legacy first-match/header-block recognition would have picked (the decoy
// sits earlier in the body, or inside the header block, deliberately). The
// PR #392 incident shape: a pasted reference brief whose own Tier / Test
// Plan / Closes text collides with the PR's real fields.

describe('anchor vs decoy — Tier', () => {
  it('resolves to the anchored value, not an earlier decoy', () => {
    const body = [
      'Reference brief says Tier: 3 somewhere in prose.', // decoy, earlier
      '<!-- AEG:TIER:START -->',
      '**Tier:** 1',
      '<!-- AEG:TIER:END -->'
    ].join('\n')
    expect(readTierFromPrBody(body)).toBe(1)
  })

  it('an anchored pair with no Tier field inside is a missing tier (no decoy fallback)', () => {
    const body = ['<!-- AEG:TIER:START -->', '(left empty)', '<!-- AEG:TIER:END -->', 'Tier: 3'].join('\n')
    expect(readTierFromPrBody(body)).toBeNull()
  })
})

describe('anchor vs decoy — Project', () => {
  it('gate and archivist both resolve to the anchored value, not the header decoy', () => {
    const body = [
      'Project: wrong-decoy', // header-block decoy — legacy recognition would pick this
      '<!-- AEG:PROJECT:START -->',
      '**Project:** aeg',
      '<!-- AEG:PROJECT:END -->',
      '',
      '## Summary',
      '',
      'Closes #395 rides elsewhere.'
    ].join('\n')
    expect(checkProjectField(body).status).toBe('pass')
    const { block } = buildProvenanceBlock(makeFacts(body))
    expect(block).toContain('- Project(s):   aeg')
    expect(block).not.toContain('wrong-decoy')
  })
})

describe('anchor vs decoy — Closes #N', () => {
  const body = [
    'Closes #999', // header-block decoy — legacy recognition would pick this
    '<!-- AEG:CLOSES:START -->',
    'Closes #395',
    '<!-- AEG:CLOSES:END -->',
    '**Project:** aeg',
    '',
    '## Summary',
    '',
    'body text'
  ].join('\n')

  it('checkClosesN counts only references inside the pair', () => {
    const files = [makeIterationFile('aeg-governance-hardening', [makeTask('31', 395)])]
    expect(checkClosesN('task/aeg-governance-hardening/31', body, files).ok).toBe(true)
    // …and the decoy alone would NOT satisfy the gate for issue 999:
    const files999 = [makeIterationFile('aeg-governance-hardening', [makeTask('31', 999)])]
    expect(checkClosesN('task/aeg-governance-hardening/31', body, files999).ok).toBe(false)
  })

  it('archivist resolves the primary Issue to the anchored reference and flags the decoy as extra', () => {
    const { issue, dangling } = buildProvenanceBlock(makeFacts(body))
    expect(issue).toBe(395)
    expect(dangling.join('\n')).toContain('#999')
  })
})

describe('anchor vs decoy — Premise', () => {
  it('parses only the anchored block, not an earlier premise-shaped decoy', () => {
    const body = [
      '**Premise:**', // decoy block, earlier — legacy recognition would pick this
      '- decoy/path.ts contains: DECOY',
      '',
      '<!-- AEG:PREMISE:START -->',
      '**Premise:**',
      '- real/path.ts contains: REAL',
      '<!-- AEG:PREMISE:END -->'
    ].join('\n')
    expect(parsePremiseBlock(body)).toEqual([{ kind: 'contains', path: 'real/path.ts', value: 'REAL' }])
  })
})

describe('anchor vs decoy — Test Plan', () => {
  it('the anchored pair IS the section; an earlier heading-form decoy is ignored', () => {
    const body = [
      '## Test Plan', // decoy section, earlier — legacy recognition would pick this
      '',
      '- [ ] **[principal]** decoy unticked box from a pasted reference brief',
      '',
      '## Real report',
      '',
      '<!-- AEG:TEST-PLAN:START -->',
      '- [x] **[agent]** real, ticked item',
      '<!-- AEG:TEST-PLAN:END -->'
    ].join('\n')
    const r = locateTestPlanSection(body)
    expect(r.found).toBe(true)
    if (r.found) {
      expect(r.section).toContain('real, ticked item')
      expect(r.section).not.toContain('decoy unticked box')
    }
  })

  it('needs no heading inside the pair (closing the #377 unrecognized-heading class)', () => {
    const body = '<!-- AEG:TEST-PLAN:START -->\n- [x] **[agent]** item\n<!-- AEG:TEST-PLAN:END -->'
    const r = locateTestPlanSection(body)
    expect(r.found).toBe(true)
    if (r.found) expect(r.section).toContain('**[agent]** item')
  })
})

// ---------- the PR-report-template shape: anchors + <details> reference brief --

describe('template-shaped body — anchored report above a <details>-wrapped brief', () => {
  const body = [
    '<!-- AEG:CLOSES:START -->',
    'Closes #393',
    '<!-- AEG:CLOSES:END -->',
    '',
    '**For:** Sonnet (test)',
    '<!-- AEG:PROJECT:START -->',
    '**Project:** aeg',
    '<!-- AEG:PROJECT:END -->',
    '',
    '## Summary',
    '',
    'What shipped.',
    '',
    '## Test plan',
    '',
    '<!-- AEG:TEST-PLAN:START -->',
    '- [x] **[agent]** real item, ticked, with evidence',
    '<!-- AEG:TEST-PLAN:END -->',
    '',
    '## Scope',
    '',
    'Blast radius.',
    '',
    '<!-- AEG:TIER:START -->',
    '**Tier:** 1',
    '<!-- AEG:TIER:END -->',
    '',
    '## Reference — the dispatched brief',
    '',
    '<details>',
    '<summary>Full brief (reference copy)</summary>',
    '',
    '**Goal:** decoy brief text',
    '**Project:** decoy-project',
    '**Tier:** 3',
    '',
    '## 9. Test Plan',
    '',
    '- [ ] **[principal]** decoy unticked box',
    '',
    'Closes #999',
    '',
    '</details>'
  ].join('\n')

  it('every gate-read field resolves to the anchored value, never the reference copy', () => {
    expect(readTierFromPrBody(body)).toBe(1)
    expect(checkProjectField(body).status).toBe('pass')

    const tp = locateTestPlanSection(body)
    expect(tp.found).toBe(true)
    if (tp.found) {
      expect(tp.section).toContain('real item, ticked')
      expect(tp.section).not.toContain('decoy unticked box')
    }

    const files = [makeIterationFile('aeg-governance-hardening', [makeTask('30', 393)])]
    expect(checkClosesN('task/aeg-governance-hardening/30', body, files).ok).toBe(true)

    const { issue, block } = buildProvenanceBlock(makeFacts(body))
    expect(issue).toBe(393)
    expect(block).toContain('- Project(s):   aeg')
  })

  it('the raw body still carries the full reference-brief text for provenance greps', () => {
    // The <details> wrap hides nothing from raw-body consumers.
    expect(body).toContain('decoy brief text')
  })
})

/**
 * `maskCode` runs *upstream* of `stripCode` — `anchoredRegion` picks the region
 * before any consumer strips it — so a decoy anchor the mask cannot see wins
 * outright, and the gate resolves a **wrong** Issue number rather than none.
 * `maskCode` sat on the naive fence/inline regexes for the whole life of this
 * PR while `stripCode` was hardened three times (PR #617 review BLOCKER). These
 * cases pin the mask to the same grammar, across every anchor field, and pin
 * the over-strip direction too: a real anchor must survive every shape below.
 */
describe('maskCode / stripCode grammar parity (PR #617 review BLOCKER)', () => {
  const decoyBody = (open: string, close: string, eol = '\n') =>
    [
      '## Summary',
      '',
      'Example of the anchor shape:',
      '',
      open,
      '<!-- AEG:CLOSES:START -->',
      'Closes #123',
      '<!-- AEG:CLOSES:END -->',
      '<!-- AEG:TIER:START -->',
      '**Tier:** 3',
      '<!-- AEG:TIER:END -->',
      close,
      '',
      '<!-- AEG:CLOSES:START -->',
      'Closes #616',
      '<!-- AEG:CLOSES:END -->',
      '<!-- AEG:TIER:START -->',
      '**Tier:** 1',
      '<!-- AEG:TIER:END -->',
      ''
    ].join(eol)

  // The same shared enumeration `brief-validation.test.ts` runs against
  // `stripCode` — one matrix, both consumers (PR #617 review finding 3). The
  // BLOCKER existed precisely because this file's fence coverage was
  // backtick-only while the other file's had grown three more dimensions.
  for (const { name, open, close, eol } of fenceShapes()) {
    it(`${name}: a decoy anchor inside the fence loses to the real one`, () => {
      const body = decoyBody(open, close, eol)
      expect([...extractClosesReferences(body)]).toEqual([616])
      expect(readTierFromPrBody(body)).toBe(1)
    })
  }

  it('a decoy anchor in a double-backtick inline span loses to the real one', () => {
    const body =
      'See ``<!-- AEG:CLOSES:START -->Closes #123<!-- AEG:CLOSES:END -->`` for shape.\n\n<!-- AEG:CLOSES:START -->\nCloses #616\n<!-- AEG:CLOSES:END -->\n'
    expect([...extractClosesReferences(body)]).toEqual([616])
  })

  it('a decoy anchor in an indented code block loses to the real one', () => {
    const body =
      'Shape:\n\n    <!-- AEG:CLOSES:START -->\n    Closes #123\n    <!-- AEG:CLOSES:END -->\n\n<!-- AEG:CLOSES:START -->\nCloses #616\n<!-- AEG:CLOSES:END -->\n'
    expect([...extractClosesReferences(body)]).toEqual([616])
  })

  // Over-strip is the worse failure (a false-red on an honest body, the brief's
  // §10 stop condition), so every shape a real anchor legitimately appears in
  // must still resolve. `anchoredRegion` slices the ORIGINAL body, so these also
  // pin the mask's 1:1 index mapping — a length-changing mask would misalign here.
  it.each([
    ['plain', '<!-- AEG:CLOSES:START -->\nCloses #616\n<!-- AEG:CLOSES:END -->', '\nCloses #616\n'],
    [
      'after a fenced block',
      '```\ncode\n```\n\n<!-- AEG:CLOSES:START -->\nCloses #616\n<!-- AEG:CLOSES:END -->',
      '\nCloses #616\n'
    ],
    ['between two inline spans', '`a` <!-- AEG:CLOSES:START -->Closes #616<!-- AEG:CLOSES:END --> `b`', 'Closes #616'],
    [
      'indented inside a list item',
      '- item\n\n    <!-- AEG:CLOSES:START -->Closes #616<!-- AEG:CLOSES:END -->',
      'Closes #616'
    ],
    ['CRLF body', '<!-- AEG:CLOSES:START -->\r\nCloses #616\r\n<!-- AEG:CLOSES:END -->', '\r\nCloses #616\r\n']
  ])('does not over-mask a real anchor: %s', (_name, body, expected) => {
    expect(anchoredRegion(body, 'CLOSES')).toBe(expected)
  })
})
