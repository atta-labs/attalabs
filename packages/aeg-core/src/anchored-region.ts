/**
 * AEG anchored-region grammar (aeg-governance-hardening task 30, #393). Pure —
 * no `fs`, no `gh`/`git`.
 *
 * One anchor syntax for every gate-read field: an HTML comment pair
 * `<!-- AEG:<FIELD>:START -->` … `<!-- AEG:<FIELD>:END -->` delimiting the
 * field's one canonical home inside a PR/Issue body. HTML comments render
 * invisibly on the forge, survive inside `<details>` blocks, and can never be
 * produced accidentally by freeform prose — which is exactly the failure class
 * this closes (PR #392's pasted reference brief duplicated its own Test Plan
 * inside the PR body; #363/#377 were the same shape as real bugs).
 *
 * Recognition semantics, shared by every consumer
 * (`pr-tier.ts`, `test-plan-section.ts`, `premise-check.ts`,
 * `brief-validation.ts`/`archive-task.ts`'s Project read, and the `Closes #N`
 * reads in `coherence-checks.ts`/`archive-task.ts`):
 *
 *   - **Anchors are additive, never required.** A body with no anchor pair for
 *     a field parses byte-identically to the pre-anchor behavior — every
 *     already-merged PR/Issue keeps reading exactly as today.
 *   - **When a pair is present, it is authoritative.** The consumer reads the
 *     field exclusively from inside the pair and ignores identical-looking
 *     text anywhere else in the body — there is deliberately no fallback to
 *     body-wide search, since falling back would resurrect the decoy problem
 *     the anchor exists to solve.
 *   - **First pair wins** when a field is (incorrectly) anchored twice —
 *     mirroring the first-match-wins philosophy of the existing prose parsers.
 *   - **A `START` with no following `END` is treated as no anchor at all**
 *     (prose fallback) — a malformed half-pair must not be able to hide a
 *     field from the gates.
 *   - **Markers inside fenced code blocks or inline code spans do not count**
 *     — example/quoted anchor syntax in documentation or evidence output is
 *     never mistaken for a real anchor (same code-stripping philosophy as
 *     `archive-task.ts`'s `stripCode`, #311 regression).
 *
 * The field line/block goes on its own line(s) INSIDE the pair — e.g.
 *
 *     <!-- AEG:TIER:START -->
 *     **Tier:** 1
 *     <!-- AEG:TIER:END -->
 *
 * Deliberately minimal: five field names, one shape. This is a delimiting
 * convention, not a metadata DSL; resist adding structure to it.
 */

/** The five gate-read fields with an anchored home. */
export const ANCHOR_FIELDS = ['CLOSES', 'PROJECT', 'TIER', 'PREMISE', 'TEST-PLAN'] as const

export type AnchorField = (typeof ANCHOR_FIELDS)[number]

/**
 * Replaces fenced code blocks, indented code blocks, and inline code spans with
 * same-length filler so marker *positions* can be searched code-blind while
 * every index still maps 1:1 onto the original body (the returned region is
 * always sliced from the original, never from the mask).
 *
 * **This is the same code recognition as `stripCode`, and must stay so.** It ran
 * on the naive `` /```[\s\S]*?```/g `` + single-backtick regexes long after
 * `stripCode` was hardened off them, 27 lines below in this same file — so a
 * decoy `AEG:CLOSES` anchor inside a tilde fence, a ≥4-backtick fence, or a
 * double-backtick span was invisible to the mask, won `anchoredRegion`, and
 * `extractClosesReferences`/`extractIssue` then resolved a *wrong* Issue number
 * (PR #617 review). That is worse than the strandings this PR exists to fix: the
 * post-merge Archivist reads `extractIssue` to explicitly close the Issue, so
 * the failure mode is closing an unrelated Issue, not failing to close one. The
 * two functions differ **only** in what they emit for a code line — filler here,
 * nothing in `stripCode` — which is why both delegate to the same scanners
 * rather than each carrying a copy of the grammar. A divergence between them is
 * a bug by construction, not a style difference.
 *
 * Unlike `stripCode`, this one **must not normalise line endings**: doing so
 * would change the body's length and break the 1:1 index mapping that is this
 * function's entire purpose. The fence patterns therefore tolerate a trailing
 * `\r` themselves, and the filler covers it (a masked `\r` becomes a space —
 * same length, and the mask is never read as text, only searched for marker
 * positions).
 */
function maskCode(body: string): string {
  const fill = (line: string) => ' '.repeat(line.length)
  return maskIndentedCode(maskFencedCode(body, fill), fill).replace(/(`+)[^\n]*?\1/g, (m) => ' '.repeat(m.length))
}

/**
 * Removes fenced code blocks and inline code spans entirely, so example/quoted
 * text (a Test Plan's `Closes #123` fixture, a pasted reference brief) is never
 * parsed as a real field. This mirrors GitHub's own auto-close parser, which
 * ignores `Closes #N` inside code — a gate that strips the same way can never
 * pass a body GitHub then refuses to auto-close (#311 regression, #608/#611
 * strandings). Unlike `maskCode`, indices are NOT preserved: use this when you
 * only test/scan the stripped text, `maskCode` when you must map positions back
 * onto the original body. Shared by `archive-task.ts` (provenance Issue read),
 * `brief-validation.ts` (`checkClosesN`), and `coherence-checks.ts`
 * (`extractClosesReferences`) — one stripper, never a duplicated regex.
 *
 * Inline spans are matched by CommonMark's rule: an opening run of N backticks
 * is closed by the next run of exactly N backticks on the same line. The
 * `(`+)…\1` backreference is what makes a **double**-backtick span
 * (`` ``Closes #5`` ``) strip as one unit — an earlier `` `[^`\n]*` `` form
 * instead peeled the outer backticks as two empty spans and left the inner
 * `Closes #5` surviving as bare text (a false-green: passed the gate, but
 * GitHub, seeing a code span, refused to auto-close — PR #617 review). Fenced
 * blocks are stripped first (see `maskFencedCode`) so a fence line is never
 * mis-read as an inline span; 4-space **indented** code blocks are stripped in
 * between (see `maskIndentedCode`).
 */
export function stripCode(body: string): string {
  // Normalise line endings FIRST. The line scanners below anchor per line, and
  // JS's `.`/`[ \t]` never match `\r`, so a CRLF body would open no fence at all
  // and let a fenced `Closes #N` walk free (PR #617 security re-pass). Doing it
  // once here keeps every sub-stripper line-ending agnostic, rather than
  // teaching each individual regex about `\r` and missing the next one. (The
  // fence patterns tolerate a trailing `\r` anyway, for `maskCode`, which cannot
  // normalise without breaking its index mapping — belt and braces, not dead
  // code: `maskIndentedCode`'s blank-line and indent reads also want LF here.)
  const normalised = body.replace(/\r\n?/g, '\n')
  const blank = () => ''
  return maskIndentedCode(maskFencedCode(normalised, blank), blank).replace(/(`+)[^\n]*?\1/g, '')
}

/**
 * What a scanner emits in place of one code line: `''` for `stripCode` (removal),
 * same-length filler for `maskCode` (index-preserving). The single knob the two
 * differ on — everything else about code recognition is shared.
 */
type LineFill = (line: string) => string

/**
 * An opening code fence: ≤3 leading spaces, then a run of ≥3 backticks or ≥3
 * tildes, then an info string. `[^\r\n]*` + `\r?$` rather than `.*$` so a CRLF
 * body opens a fence for `maskCode`, which cannot normalise (`stripCode`
 * normalises first, so this is redundant there and load-bearing here).
 */
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?$/
/** A candidate closing fence: ≤3 leading spaces, a bare run of fence chars, nothing but whitespace after. */
const FENCE_CLOSE = /^ {0,3}(`+|~+)[ \t]*\r?$/

/**
 * Blanks (`stripCode`) or same-length-masks (`maskCode`) CommonMark **fenced
 * code blocks**, matching a fence to its own closer
 * by character *and* run length.
 *
 * Replaces an earlier `` /```[\s\S]*?```/g `` regex that got three cases wrong
 * (PR #617 security pass):
 *
 *   - **Tilde fences** (`~~~`) were not recognised at all. GFM fences with `~`
 *     exactly as with backticks.
 *   - **Runs longer than three** leaked: against a six-backtick fence the old
 *     regex matched the first three, treated the rest of the opening run as a
 *     complete empty block, and let the body walk free — the same run-length
 *     bug already fixed on the inline-span half, never carried over here.
 *   - An **info string** (```` ```js ````) was only incidentally handled.
 *
 * Per CommonMark the closing fence must use the same character and be **at
 * least as long** as the opening one; a backtick fence's info string may not
 * itself contain a backtick (that ambiguity is what makes ```` ```x``` ```` an
 * inline span, not a fence). An unclosed fence runs to end of body — as GitHub
 * also renders it, so a `Closes #N` after a stray fence is genuinely inside
 * code and must not count.
 */
function maskFencedCode(body: string, fill: LineFill): string {
  let fenceChar: string | null = null
  let fenceLen = 0

  return body
    .split('\n')
    .map((line) => {
      if (fenceChar === null) {
        const open = line.match(FENCE_OPEN)
        if (!open) return line
        const marker = open[1] as string
        // A backtick fence's info string cannot contain a backtick.
        if (marker[0] === '`' && (open[2] as string).includes('`')) return line
        fenceChar = marker[0] as string
        fenceLen = marker.length
        return fill(line)
      }
      const close = line.match(FENCE_CLOSE)
      if (close && (close[1] as string)[0] === fenceChar && (close[1] as string).length >= fenceLen) {
        fenceChar = null
        fenceLen = 0
      }
      return fill(line)
    })
    .join('\n')
}

/** A list marker (`-`, `*`, `+`, `1.`, `1)`) indented 0–3 spaces — opens list context. */
const LIST_MARKER = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/

/** Leading-whitespace width, counting a tab as 4 columns (CommonMark tab stop). */
function indentWidth(line: string): number {
  let width = 0
  for (const ch of line) {
    if (ch === ' ') width += 1
    else if (ch === '\t') width += 4
    else break
  }
  return width
}

/**
 * Blanks (`stripCode`) or same-length-masks (`maskCode`) CommonMark **indented
 * code blocks** (a run of ≥4-column-indented lines
 * that begins after a blank line), so an indented `Closes #N` is ignored exactly
 * as GitHub's auto-close parser ignores it.
 *
 * Deliberately conservative — it is far worse to blank a *legitimately bare*
 * `Closes` (a false-red, and the brief's explicit over-strip stop condition)
 * than to miss an unusual indented one. Two guards enforce that asymmetry:
 *
 *   - **Must follow a blank line.** An indented code block cannot interrupt a
 *     paragraph, so an indented continuation line of running prose is never
 *     touched.
 *   - **Never inside a list.** Within a list item, 4-space indentation is the
 *     item's own content indent, not code — `- item` + blank + `    Closes #5`
 *     is a list paragraph GitHub *would* auto-close. List context opens on a
 *     list marker and closes on the next column-0 non-blank line. The cost is
 *     that a genuine indented code block nested inside a list is left unstripped
 *     (a false-green in that rare shape) — the safe direction of the trade.
 */
function maskIndentedCode(body: string, fill: LineFill): string {
  const lines = body.split('\n')
  let inList = false
  let inCode = false
  let prevBlank = true // start-of-body behaves like "preceded by a blank line"

  const out = lines.map((line) => {
    if (line.trim() === '') {
      prevBlank = true
      return line // a blank line neither opens nor closes a code run
    }
    const indent = indentWidth(line)

    if (indent >= 4 && (inCode || (prevBlank && !inList))) {
      inCode = true
      prevBlank = false
      return fill(line) // blank/mask the code line, keeping line count stable
    }

    inCode = false
    if (indent < 4 && LIST_MARKER.test(line)) inList = true
    else if (indent === 0) inList = false
    prevBlank = false
    return line
  })

  return out.join('\n')
}

/**
 * The text between the first `<!-- AEG:<field>:START -->` and the first
 * `<!-- AEG:<field>:END -->` after it, or `null` when the body carries no
 * (well-formed, non-code) pair for this field. `null` is the signal for
 * consumers to run their unchanged prose/heading recognition.
 */
export function anchoredRegion(body: string, field: AnchorField): string | null {
  const masked = maskCode(body)
  const start = new RegExp(`<!--\\s*AEG:${field}:START\\s*-->`).exec(masked)
  if (!start) return null
  const afterStart = start.index + start[0].length
  const end = new RegExp(`<!--\\s*AEG:${field}:END\\s*-->`).exec(masked.slice(afterStart))
  if (!end) return null
  return body.slice(afterStart, afterStart + end.index)
}
