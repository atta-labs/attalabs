import { describe, expect, it } from 'vitest'
import { type AnchorSourceFile, checkLocalAnchorCoverage } from './local-anchor-coverage'

const TASK_PATTERN = /Task [0-9]+/g
const CITATION_PATTERN = /\(task [0-9]+, #[0-9]+\)/

function file(content: string, path = 'doc.md'): AnchorSourceFile[] {
  return [{ path, content }]
}

describe('checkLocalAnchorCoverage', () => {
  it('flags a bare anchor with no citation anywhere in the file', () => {
    const result = checkLocalAnchorCoverage(file('Task 2 fixed this.'), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line'
    })
    expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 2' }])
  })

  it('scope: line — a citation on the SAME line clears the anchor', () => {
    const result = checkLocalAnchorCoverage(file('Task 2 (task 2, #722) fixed this.'), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line'
    })
    expect(result.findings).toEqual([])
  })

  it('scope: line — a citation on the NEXT line does not clear the anchor', () => {
    const result = checkLocalAnchorCoverage(file('Task 2 fixed this.\n(task 2, #722)'), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line'
    })
    expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 2' }])
  })

  it('scope: block — a multi-line bullet (wrapped continuation, no blank line) counts as one block', () => {
    const content = [
      '- Task 2 fixed this bug, a long sentence',
      '  that wraps onto a second line (task 2, #722).'
    ].join('\n')
    const result = checkLocalAnchorCoverage(file(content), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'block'
    })
    expect(result.findings).toEqual([])
  })

  it('scope: block — a nested sub-bullet stays part of its parent block', () => {
    const content = ['- Task 2 fixed this bug', '  - detail: see (task 2, #722)'].join('\n')
    const result = checkLocalAnchorCoverage(file(content), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'block'
    })
    expect(result.findings).toEqual([])
  })

  it('scope: block — two adjacent top-level bullets (no blank line) are still SEPARATE blocks', () => {
    const content = ['- Task 2 fixed this bug', '- unrelated bullet citing (task 2, #722)'].join('\n')
    const result = checkLocalAnchorCoverage(file(content), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'block'
    })
    expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 2' }])
  })

  it('scope: block — a blank line ends the block even without a new bullet', () => {
    const content = ['Task 2 fixed this bug.', '', 'Separate paragraph citing (task 2, #722).'].join('\n')
    const result = checkLocalAnchorCoverage(file(content), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'block'
    })
    expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 2' }])
  })

  it('scope: block — a heading line starts a new block even without a blank line before it', () => {
    const content = ['## Heading mentions Task 2', 'Body text citing (task 2, #722) elsewhere.'].join('\n')
    const result = checkLocalAnchorCoverage(file(content), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'block'
    })
    expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 2' }])
  })

  it('reports every match across multiple files, each keyed to its own file/line', () => {
    const files: AnchorSourceFile[] = [
      { path: 'a.md', content: 'Task 1 did X.' },
      { path: 'b.md', content: 'Task 2 (task 2, #722) did Y.' },
      { path: 'c.md', content: 'intro\nTask 3 did Z.' }
    ]
    const result = checkLocalAnchorCoverage(files, {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line'
    })
    expect(result.findings).toEqual([
      { file: 'a.md', line: 1, match: 'Task 1' },
      { file: 'c.md', line: 2, match: 'Task 3' }
    ])
  })

  it('non-vacuity: reports "pattern" when the sample does not self-match', () => {
    const result = checkLocalAnchorCoverage(file('nothing relevant here'), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line',
      sample: 'this sample has no bare task reference'
    })
    expect(result.vacuous).toEqual(['pattern'])
  })

  it('non-vacuity: reports "mustCoOccurWith" when the co-occur sample does not self-match', () => {
    const result = checkLocalAnchorCoverage(file('nothing relevant here'), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line',
      coOccurSample: 'this sample has no citation shape'
    })
    expect(result.vacuous).toEqual(['mustCoOccurWith'])
  })

  it('non-vacuity: a passing self-test on both samples reports no vacuity', () => {
    const result = checkLocalAnchorCoverage(file('nothing relevant here'), {
      pattern: TASK_PATTERN,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line',
      sample: 'Task 9 shipped',
      coOccurSample: '(task 9, #123)'
    })
    expect(result.vacuous).toEqual([])
  })

  it('does not mutate a global RegExp passed in across repeated calls (lastIndex statefulness)', () => {
    const sharedPattern = /Task [0-9]+/g
    checkLocalAnchorCoverage(file('Task 1 first call'), {
      pattern: sharedPattern,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line'
    })
    const result = checkLocalAnchorCoverage(file('Task 2 second call'), {
      pattern: sharedPattern,
      mustCoOccurWith: CITATION_PATTERN,
      scope: 'line'
    })
    expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 2' }])
  })

  /**
   * The confirmed historical fixture (see PR body for the commit pair):
   * `0b53d460` "Docs(vinaya): Fix dangling Task 2 reference in
   * vinaya-spec.md" on this repo's own `apps/vinaya/specs/vinaya-spec.md`.
   * The bullet's header parenthetical cites `(#722)` — a bare forge number,
   * not the `(task N, #issue)` shape this check requires — so the pattern
   * must still fire pre-fix and go clean post-fix.
   */
  describe('confirmed historical fixture (commit 0b53d460)', () => {
    const preFixContent =
      "- **`VINAYA.md`'s generated text corrected to match this gap (#722).** The generated `doctrinePointer()` " +
      '(`apps/vinaya/cli/src/lib/artifacts.ts`) still claimed the doctrine "ships inside the installed `vinaya` npm ' +
      'package as versioned reference content" — restating the promise this bullet already flags as unfulfilled. ' +
      'Task 2 corrected that generated text to state plainly that the doctrine currently lives only in the ' +
      "`attalabs` monorepo's `aeg-root/` (public GitHub source) and that in-package bundling is planned, not yet " +
      'shipped. It did not build the bundling mechanism itself — that remains the separate, larger follow-up this ' +
      'bullet describes.'

    const postFixContent = preFixContent.replace(
      'Task 2 corrected that generated text',
      'This fix corrected that generated text'
    )

    it('fires on the pre-fix content', () => {
      const result = checkLocalAnchorCoverage(file(preFixContent, 'apps/vinaya/specs/vinaya-spec.md'), {
        pattern: TASK_PATTERN,
        mustCoOccurWith: CITATION_PATTERN,
        scope: 'block'
      })
      expect(result.findings).toEqual([{ file: 'apps/vinaya/specs/vinaya-spec.md', line: 1, match: 'Task 2' }])
    })

    it('stays clean on the post-fix content', () => {
      const result = checkLocalAnchorCoverage(file(postFixContent, 'apps/vinaya/specs/vinaya-spec.md'), {
        pattern: TASK_PATTERN,
        mustCoOccurWith: CITATION_PATTERN,
        scope: 'block'
      })
      expect(result.findings).toEqual([])
    })
  })

  /**
   * Co-occurrence is COUNTED, not merely detected (found live in code
   * review, PR #766): a presence-only test lets one real citation clear
   * every other, unrelated anchor sharing the same scope. Two `Task N`
   * mentions, one citation → the uncited one must still fire.
   */
  describe('co-occurrence is counted per-match, not shared across a scope (review finding)', () => {
    it('flags exactly one of the two anchors — not zero — when the block has two anchors and one citation', () => {
      // Citations are consumed in document order: the first match ("Task 2")
      // claims the block's one available citation, leaving the second
      // ("Task 5") flagged — this primitive has no semantic notion of WHICH
      // citation belongs to WHICH anchor (see the function's own doc
      // comment), only that supply (1 citation) must meet demand (2
      // anchors). The point under test is the COUNT: exactly one finding,
      // never zero.
      const result = checkLocalAnchorCoverage(file('Task 2 did X, and Task 5 (task 5, #999) wrapped it up.'), {
        pattern: TASK_PATTERN,
        mustCoOccurWith: CITATION_PATTERN,
        scope: 'block'
      })
      expect(result.findings).toEqual([{ file: 'doc.md', line: 1, match: 'Task 5' }])
    })

    it('stays clean when every anchor in the block has its own citation, one-to-one', () => {
      const result = checkLocalAnchorCoverage(
        file('Task 2 (task 2, #100) did X, and Task 5 (task 5, #999) wrapped it up.'),
        { pattern: TASK_PATTERN, mustCoOccurWith: CITATION_PATTERN, scope: 'block' }
      )
      expect(result.findings).toEqual([])
    })

    it('flags both anchors when the block has zero citations, not just the first', () => {
      const result = checkLocalAnchorCoverage(file('Task 2 did X, and Task 5 wrapped it up.'), {
        pattern: TASK_PATTERN,
        mustCoOccurWith: CITATION_PATTERN,
        scope: 'block'
      })
      expect(result.findings).toEqual([
        { file: 'doc.md', line: 1, match: 'Task 2' },
        { file: 'doc.md', line: 1, match: 'Task 5' }
      ])
    })
  })
})
