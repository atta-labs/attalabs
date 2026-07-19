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
 * Replaces fenced code blocks and inline code spans with same-length filler so
 * marker *positions* can be searched code-blind while every index still maps
 * 1:1 onto the original body (the returned region is always sliced from the
 * original, never from the mask).
 */
function maskCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length)).replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length))
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
 * blocks (```` ``` ````) are stripped first so a fence line is never mis-read as
 * an inline span. NOT covered: 4-space **indented** code blocks — distinguishing
 * a genuine indented block from list-continuation text needs a real CommonMark
 * parser, and a wrong guess would blank a legitimately bare `Closes` (the brief's
 * over-strip stop condition), so that rare form is left to prose recognition.
 */
export function stripCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/(`+)[^\n]*?\1/g, '')
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
