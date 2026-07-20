/**
 * The one enumeration of CommonMark fence shapes, shared by every test that
 * asserts code-blindness.
 *
 * Four successive false-greens in PR #617 each shipped a fix whose tests
 * covered only the axis just reported — double-backtick spans, then
 * tilde/run-length fences, then CRLF, then `maskCode` (which was never
 * hardened at all, because no finding had pointed at it while every finding
 * pointed at `stripCode`). The first three were a missing *dimension*; the
 * fourth was a missing *consumer*. So the shapes live here, and each consumer
 * iterates them — adding a dimension covers every consumer at once, and adding
 * a consumer covers every dimension at once. That is the property; a matrix
 * copied per test file has neither half.
 *
 * Consumers: `brief-validation.test.ts` (`checkClosesN`, via `stripCode`) and
 * `anchored-region.test.ts` (`anchoredRegion`/`extractClosesReferences`/
 * `readTierFromPrBody`, via `maskCode`). Add the next one here, not a local copy.
 */

/** Fence delimiter characters. GFM fences with backticks or tildes alike. */
export const FENCE_DELIMS = [
  ['backtick', '`'],
  ['tilde', '~']
] as const

/**
 * Opening-run lengths. 3 is the minimum; 6 is the case the original
 * `` /```[\s\S]*?```/g `` regex got wrong (opener and closer each eaten as two
 * paired triples, leaving the body bare); 4 failed safe by luck, not by rule.
 */
export const FENCE_LENGTHS = [3, 4, 6] as const

/**
 * Line endings. CRLF is the web-UI-authored shape — HTML normalises textarea
 * newlines to CRLF on submit — which is exactly the path the CI backstop
 * exists to cover, and exactly where the line-scanner rewrite regressed.
 */
export const EOLS = [
  ['LF', '\n'],
  ['CRLF', '\r\n']
] as const

export type FenceShape = {
  /** Human-readable case name, suitable for a test title. */
  name: string
  /** The opening fence line, including any info string. */
  open: string
  /** The closing fence line. */
  close: string
  /** The line separator to join body lines with. */
  eol: string
}

/**
 * The full cross product: delimiter × run length × line ending × info string.
 * A backtick fence's info string may not itself contain a backtick (that
 * ambiguity is what keeps ```` ```x``` ```` an inline span rather than a
 * fence), so the tilde variant carries a space to exercise the looser rule.
 */
export function fenceShapes(): FenceShape[] {
  const shapes: FenceShape[] = []
  for (const [eolName, eol] of EOLS) {
    for (const [delimName, ch] of FENCE_DELIMS) {
      for (const len of FENCE_LENGTHS) {
        const fence = ch.repeat(len)
        const info = ch === '`' ? 'js' : 'js x'
        shapes.push({ name: `${eolName}/${delimName}×${len}`, open: fence, close: fence, eol })
        shapes.push({ name: `${eolName}/${delimName}×${len} with info string`, open: fence + info, close: fence, eol })
      }
    }
  }
  return shapes
}
