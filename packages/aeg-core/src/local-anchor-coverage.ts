/**
 * local-anchor-coverage.ts — a generic, regex-parameterized "dangling
 * anchor" checker.
 *
 * The pattern this generalizes: `reader-resolvable-prose.ts`'s Class 1
 * (`checkUnresolvableReferences`) flags a reference a reader cannot resolve
 * at all — the pattern (a forge number, a tranche slug) IS the finding, full
 * stop. This module handles the one-step-further case Issue #730 names: a
 * reference that is FINE as long as something else nearby resolves it — an
 * ordinal task mention ("Task 2") is fine beside a citation shaped
 * `(task N, #issue)`, and only a finding when that citation is missing from
 * its scope. Same "pattern is an input, not a constant" discipline as
 * `reader-resolvable-prose.ts`, carried one step further: the CITATION
 * pattern and its co-occurrence SCOPE are inputs too. This file has no
 * `/Task \d+/` literal, no citation-shape regex, no product name — that
 * knowledge belongs to whoever configures an instance (see
 * `scripts/vinaya-checks/task-anchor.ts` for attalabs' own).
 *
 * Zero I/O: mirrors `reader-resolvable-prose.ts`'s in-memory-content shape
 * (`files: { path, content }[]`, adapter-read) rather than
 * `vocabulary-citation.ts`'s `grepFn`/`matchFn` injection. Reason: co-occurrence
 * scoping (§ below) needs the whole file's line structure to group lines into
 * blocks — a per-line grep-hit model would force the adapter to pre-chunk
 * paragraphs itself before calling in, which is exactly the structural work
 * this primitive exists to own.
 *
 * `pattern`/`mustCoOccurWith` are real `RegExp` objects, not POSIX-ERE
 * strings — unlike `vocabulary-citation.ts`, nothing here shells out to
 * `grep -E`, so the `\d`/`\w`/`\s`-avoidance caution that applies there (GNU
 * grep reads those as literal characters) does not apply to this file; native
 * `RegExp` supports them. A consumer that itself uses `grep` for file
 * discovery (as `task-anchor.ts` does not — it reads files directly) would
 * still need that caution on its own end, independent of this primitive.
 */

export type AnchorSourceFile = { path: string; content: string }

/**
 * `'line'` — the citation must appear on the same line as the anchor.
 * `'block'` — the citation must appear anywhere in the anchor's enclosing
 * block (see `splitIntoBlocks` below): a markdown paragraph, or a list item
 * together with its nested sub-items and wrapped continuation lines. A
 * blank line, or a new top-level (non-indented) bullet/heading, starts a new
 * block — so two adjacent list items are two different blocks, never one.
 */
export type AnchorCoverageScope = 'line' | 'block'

export type LocalAnchorCoverageOptions = {
  pattern: RegExp
  mustCoOccurWith: RegExp
  scope: AnchorCoverageScope
  /** Non-vacuity self-test (optional): `pattern` must match this string. */
  sample?: string
  /** Non-vacuity self-test (optional): `mustCoOccurWith` must match this string. */
  coOccurSample?: string
}

export type AnchorCoverageFinding = {
  file: string
  line: number
  match: string
}

export type LocalAnchorCoverageResult = {
  findings: AnchorCoverageFinding[]
  /**
   * Names of whichever supplied sample(s) failed to self-match —
   * `'pattern'` and/or `'mustCoOccurWith'`. A config bug reported loud
   * instead of silently returning clean, same discipline as
   * `vocabulary-citation.ts`'s `vacuousPatterns`.
   */
  vacuous: ('pattern' | 'mustCoOccurWith')[]
}

/** Strips `g`/`y` flags so a caller-supplied global/sticky regex can't leak `lastIndex` state into a one-shot `.test()`. */
function testFresh(re: RegExp, text: string): boolean {
  const flags = re.flags.replace(/[gy]/g, '')
  return new RegExp(re.source, flags).test(text)
}

/** Ensures the regex used to iterate every match carries the `g` flag, without mutating the caller's object. */
function toGlobalIterator(re: RegExp): RegExp {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  return new RegExp(re.source, flags)
}

function computeLineStarts(content: string): number[] {
  const starts = [0]
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return starts
}

/** 1-based line number containing character offset `index`, via binary search over `lineStarts`. */
function lineNumberAt(lineStarts: number[], index: number): number {
  let lo = 0
  let hi = lineStarts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if ((lineStarts[mid] as number) <= index) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

const BLANK_LINE = /^\s*$/
/** A top-level (non-indented) list marker — `-`/`*`/`+` or `N.` — starts a new block; an indented nested item does not. */
const TOP_LEVEL_BULLET = /^(?:[-*+]|[0-9]+\.)\s/
const HEADING_LINE = /^#{1,6}\s/

type Block = { startLine: number; endLine: number; text: string }

/**
 * Groups a file's lines into scope blocks: a blank line ends the current
 * block; a new top-level bullet or heading also ends it (and starts its
 * own); every other line — including an indented/nested bullet, or a
 * wrapped continuation line — extends the current block. This is what makes
 * "same paragraph/bullet" well-defined rather than a guess: two sibling
 * list items on adjacent lines with no blank line between them are still
 * two separate blocks (each starts its own on hitting the next top-level
 * marker), while a nested sub-bullet stays part of its parent's block (an
 * elaboration of the same anchor, not a separate one).
 */
function splitIntoBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let current: string[] = []
  let currentStartIdx = 0

  const flush = (): void => {
    if (current.length === 0) return
    blocks.push({
      startLine: currentStartIdx + 1,
      endLine: currentStartIdx + current.length,
      text: current.join('\n')
    })
    current = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string
    if (BLANK_LINE.test(line)) {
      flush()
      continue
    }
    const isHeading = HEADING_LINE.test(line)
    const startsNewBlock = TOP_LEVEL_BULLET.test(line) || isHeading
    if (startsNewBlock && current.length > 0) flush()
    if (current.length === 0) currentStartIdx = i
    current.push(line)
    // A heading is always a single-line block — it never absorbs the prose
    // that follows it (that prose's own citation does not clear an anchor
    // inside the heading's own text).
    if (isHeading) flush()
  }
  flush()
  return blocks
}

function blockTextForLine(blocks: readonly Block[], line: number): string {
  for (const block of blocks) {
    if (line >= block.startLine && line <= block.endLine) return block.text
  }
  return ''
}

/**
 * Flags every match of `pattern` that has no `mustCoOccurWith` match within
 * its scope. Pure — takes file contents, returns findings; performs no I/O
 * and knows nothing about what `pattern`/`mustCoOccurWith` mean.
 */
export function checkLocalAnchorCoverage(
  files: readonly AnchorSourceFile[],
  options: LocalAnchorCoverageOptions
): LocalAnchorCoverageResult {
  const vacuous: ('pattern' | 'mustCoOccurWith')[] = []
  if (options.sample !== undefined && !testFresh(options.pattern, options.sample)) vacuous.push('pattern')
  if (options.coOccurSample !== undefined && !testFresh(options.mustCoOccurWith, options.coOccurSample)) {
    vacuous.push('mustCoOccurWith')
  }

  const findings: AnchorCoverageFinding[] = []
  const iterPattern = toGlobalIterator(options.pattern)

  for (const file of files) {
    const lineStarts = computeLineStarts(file.content)
    const lines = file.content.split('\n')
    const blocks = options.scope === 'block' ? splitIntoBlocks(file.content) : null

    iterPattern.lastIndex = 0
    let match: RegExpExecArray | null = iterPattern.exec(file.content)
    while (match !== null) {
      const line = lineNumberAt(lineStarts, match.index)
      const scopeText = blocks ? blockTextForLine(blocks, line) : (lines[line - 1] ?? '')
      if (!testFresh(options.mustCoOccurWith, scopeText)) {
        findings.push({ file: file.path, line, match: match[0] })
      }
      // Guard against a zero-width match looping forever.
      if (match.index === iterPattern.lastIndex) iterPattern.lastIndex++
      match = iterPattern.exec(file.content)
    }
  }

  return { findings, vacuous }
}
