/**
 * Reader-resolvable prose — classes 1 and 2 of the three-class analysis in
 * Issue #694: the two mechanizable classes of "words a reader cannot
 * resolve." Class 3 (register/slop — padding adjectives, first person,
 * narrating the work episode) is NOT here; it stays with the review role,
 * per the measurement below.
 *
 * **The measurement that disqualifies a phrase blacklist.** A phrase
 * blacklist tested against the real corpus (all of `aeg-root` plus 1,157
 * TypeScript files) scored 14 hits, 14 false positives, 0 true positives —
 * "a review was *requested*"; "could *this change* leak a secret"; "*I have*
 * X, Y, Z" inside a quoted example. The fix is not tuning the word list; it
 * is asking a different question:
 *
 *   - Class 1 (references): not "does this phrase appear" but "does this
 *     doctrine cite a forge number or tranche slug the reader has no forge to
 *     resolve." Reuses the same two pattern shapes proven in
 *     `retired-vocabulary.test.ts` (`FORGE_NUMBER_PATTERN`,
 *     `TRANCHE_SLUG_VN_PATTERN`, and the legacy-slug list derived — not
 *     guessed — from `aeg-root/tranches/completed/*.md` filenames), scoped to
 *     the reader-facing surfaces instead of banned repo-wide (the same digit
 *     shape is this product's own live `Closes #N`/PR-number grammar
 *     elsewhere, so a repo-wide ban would flag the mechanism, not the
 *     citation habit).
 *   - Class 2 (vocabulary): not "is this word forbidden" but "does this
 *     reader-facing file use a coined term while neither defining it inline
 *     nor linking a definition." The term list is derived from
 *     `aeg-root/glossary.md`'s own entry headings — never hard-coded — so it
 *     cannot drift the first time an entry is added.
 *
 * Zero I/O: every input (file paths + contents, the glossary's term list, the
 * legacy-slug list) is read by the adapter and passed in. POSIX-ERE-safe
 * patterns only — no `\d`/`\w`/`\s`/lookaheads, and no `\b` relied on after a
 * non-word character (the exact regression class `retired-vocabulary.test.ts`
 * already paid for) — even though these patterns run through native
 * `RegExp`, not `grep -E`, keeping them portable to either.
 */

export type ProseFileClass = 'ships' | 'reader-facing' | 'internal'

export type ProseSourceFile = { path: string; content: string }

export type ProseFinding = {
  file: string
  line: number
  message: string
}

/** `aeg-root/**` — what the package carries and `/docs` publishes. */
const SHIPS_PREFIX = 'aeg-root/'

/**
 * History, never rewritten — same exemption `retired-vocabulary.test.ts`
 * already carries for the identical reason: an archived tranche legitimately
 * cites the forge numbers and slugs it closed.
 */
const SHIPS_ARCHIVE_PREFIX = 'aeg-root/tranches/completed/'

/**
 * The public site's pages — reader-facing product copy, same vocabulary rule
 * as `aeg-root/**` because its reader has no forge at all. Scoped to
 * `page.tsx` itself, not the whole `(site)` route tree: a page's own body is
 * where reader-visible prose lives (JSX text, step copy); sibling
 * `_components/**` include non-textual/decorative surfaces (e.g. canvas
 * illustrations using fictional PR numbers as flavor text) that are not
 * prose in the sense this check means.
 */
const READER_FACING_PREFIX = 'apps/vinaya/web/src/app/(site)/'
const READER_FACING_SUFFIX = '/page.tsx'

/** A per-product specs file (`apps/<product>/specs/**`) — this reader has this forge; references are legitimate here. */
function isSpecFile(path: string): boolean {
  return path.startsWith('apps/') && path.includes('/specs/') && path.endsWith('.md')
}

/** Any `CLAUDE.md`, at any depth — same reasoning as specs: this reader has this forge. */
function isClaudeMdFile(path: string): boolean {
  return path === 'CLAUDE.md' || path.endsWith('/CLAUDE.md')
}

/**
 * The file-class map, encoded as data (not a rule buried in control flow).
 * Returns `null` for anything outside all three classes — out of this
 * check's scope entirely, not merely exempt.
 */
export function classifyProseFile(path: string): ProseFileClass | null {
  if (path.startsWith(SHIPS_PREFIX)) {
    return path.startsWith(SHIPS_ARCHIVE_PREFIX) ? 'internal' : 'ships'
  }
  if (path.startsWith(READER_FACING_PREFIX) && path.endsWith(READER_FACING_SUFFIX)) {
    return 'reader-facing'
  }
  if (isSpecFile(path) || isClaudeMdFile(path)) return 'internal'
  return null
}

/** The two classes this check actually sweeps — `internal` never is. */
const SWEPT_CLASSES: ReadonlySet<ProseFileClass> = new Set(['ships', 'reader-facing'])

/**
 * Strips the parts of a file that are never reader prose, per file kind — a
 * fenced/inline code example in a markdown doc, or a source comment in a
 * `.tsx` page (a page's own developer-facing comments, e.g. "same reasoning
 * as `/roadmap`", are not what a site visitor reads). Line count is
 * preserved (replacements keep their newlines) so reported line numbers stay
 * accurate against the original file.
 */
export function stripNonProse(path: string, content: string): string {
  if (path.endsWith('.md')) {
    return content
      .replace(/```.*?```/gs, (m) => m.replace(/[^\n]/g, ''))
      .replace(/`[^`\n]*`/g, (m) => m.replace(/[^\n]/g, ''))
  }
  if (path.endsWith('.tsx') || path.endsWith('.ts')) {
    return content
      .replace(/\/\*.*?\*\//gs, (m) => m.replace(/[^\n]/g, ''))
      .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ''))
  }
  return content
}

function lineAt(content: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++
  }
  return line
}

/** `#294`-shaped — a PR/Issue number cited bare, resolvable only inside this repo's own tracker. */
export const FORGE_NUMBER_PATTERN = /#[0-9]{2,4}/g

/** `aeg-forge-state-v1`-shaped — an internal tranche slug ending `-vN`. */
export const TRANCHE_SLUG_VN_PATTERN = /[a-z][a-z-]+-v[0-9]/g

/**
 * Builds the legacy-slug pattern from the real archived-tranche filenames
 * the adapter reads (mirrors `retired-vocabulary.test.ts`'s `legacySlugs()` —
 * derived from `aeg-root/tranches/completed/*.md`, never a shape guess).
 * Returns `null` when there is nothing left for it to catch (every archived
 * slug now ends `-vN`), matching that file's "no pattern with zero positive
 * samples" rule.
 */
export function legacySlugPattern(legacySlugs: readonly string[]): RegExp | null {
  if (legacySlugs.length === 0) return null
  const alternation = legacySlugs.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(`(${alternation})`, 'g')
}

/**
 * Class 1 — unresolvable references. Runs the reference patterns over every
 * swept file (`ships`/`reader-facing`), skipping code-fenced/commented-out
 * non-prose first.
 */
export function checkUnresolvableReferences(
  files: readonly ProseSourceFile[],
  legacySlugs: readonly string[] = []
): ProseFinding[] {
  const findings: ProseFinding[] = []
  const legacyPattern = legacySlugPattern(legacySlugs)
  const patterns: { pattern: RegExp; what: string }[] = [
    { pattern: FORGE_NUMBER_PATTERN, what: 'a forge number' },
    { pattern: TRANCHE_SLUG_VN_PATTERN, what: 'an internal tranche slug' },
    ...(legacyPattern ? [{ pattern: legacyPattern, what: 'an internal tranche slug' }] : [])
  ]

  for (const file of files) {
    const cls = classifyProseFile(file.path)
    if (!cls || !SWEPT_CLASSES.has(cls)) continue
    const scrubbed = stripNonProse(file.path, file.content)
    for (const { pattern, what } of patterns) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null = pattern.exec(scrubbed)
      while (match !== null) {
        findings.push({
          file: file.path,
          line: lineAt(scrubbed, match.index),
          message: `references ${what} ("${match[0]}") a reader outside this repo's tracker cannot resolve`
        })
        match = pattern.exec(scrubbed)
      }
    }
  }
  return findings
}

/** Escapes a glossary term for use inside a hand-built, boundary-checked pattern. */
function escapeTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whole-word (or whole-phrase), case-insensitive occurrence of `term` in
 * `text` — boundaries checked by character class rather than `\b`, per the
 * "do not rely on `\b` after a non-word character" lesson. Matches the exact
 * glossary heading only (no inflections): "briefly" must never match
 * "brief" the way a prefix match would — that exact shape (`let's` matching
 * `bullet's`) is what the disqualifying measurement caught.
 */
function containsWholeWord(text: string, term: string): boolean {
  const escaped = escapeTerm(term)
  const re = new RegExp(`(^|[^a-zA-Z])${escaped}([^a-zA-Z]|$)`, 'i')
  return re.test(text)
}

function findWholeWordLine(content: string, term: string): number | null {
  const lines = content.split('\n')
  let lineNo = 0
  for (const line of lines) {
    lineNo++
    if (containsWholeWord(line, term)) return lineNo
  }
  return null
}

/**
 * A file "defines" a term inline when it carries the same
 * `Term — definition` shape the glossary itself uses (an em-dash right after
 * the term), or links the glossary page/file directly.
 */
function definesOrLinksGlossary(content: string, term: string): boolean {
  const escaped = escapeTerm(term)
  const definesInline = new RegExp(`(^|[^a-zA-Z])${escaped}([^a-zA-Z]|$)[^\\n]{0,3}—`, 'i').test(content)
  if (definesInline) return true
  return /docs\/glossary|glossary\.md/i.test(content)
}

/**
 * Class 2 — undefined coined vocabulary. Not "is this word forbidden" — it
 * is "does this reader-facing file use a coined term while neither defining
 * it inline nor linking a definition." `glossaryTerms` is read by the
 * adapter from `aeg-root/glossary.md`'s own entry headings — never
 * hard-coded here, so the check cannot silently rot the first time an entry
 * is added.
 */
export function checkUndefinedVocabulary(
  files: readonly ProseSourceFile[],
  glossaryTerms: readonly string[]
): ProseFinding[] {
  const findings: ProseFinding[] = []

  for (const file of files) {
    const cls = classifyProseFile(file.path)
    if (!cls || !SWEPT_CLASSES.has(cls)) continue
    const scrubbed = stripNonProse(file.path, file.content)

    for (const term of glossaryTerms) {
      const line = findWholeWordLine(scrubbed, term)
      if (line === null) continue
      if (definesOrLinksGlossary(scrubbed, term)) continue
      findings.push({
        file: file.path,
        line,
        message: `uses coined term "${term}" without defining it inline or linking the glossary`
      })
    }
  }
  return findings
}

/** Runs both mechanizable classes over the given files in one pass. */
export function checkReaderResolvableProse(
  files: readonly ProseSourceFile[],
  glossaryTerms: readonly string[],
  legacySlugs: readonly string[] = []
): ProseFinding[] {
  return [...checkUnresolvableReferences(files, legacySlugs), ...checkUndefinedVocabulary(files, glossaryTerms)]
}

/** Parses `aeg-root/glossary.md`'s `**Term** — definition` entry headings into a bare term list. */
export function parseGlossaryTerms(glossaryContent: string): string[] {
  const terms: string[] = []
  const re = /^\*\*(.+?)\*\* —/gm
  let match: RegExpExecArray | null = re.exec(glossaryContent)
  while (match !== null) {
    if (match[1] !== undefined) terms.push(match[1])
    match = re.exec(glossaryContent)
  }
  return terms
}
