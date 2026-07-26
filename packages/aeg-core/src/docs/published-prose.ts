/**
 * C7 — the published-prose check. Pure and zero-I/O, shaped like
 * `docs-coherence.ts` (parsed entries plus the model-backed surfaced-path
 * allowlist in, `{ errors, notes }` out).
 *
 * A role or contract doc is read by two audiences with opposite needs: an
 * agent taking the role reads it end to end as its operating instruction, and
 * a person landing on `/docs/roles/<id>` reads the same file cold. The answer
 * is one short, binding section at the top of every role and contract — `##
 * The short version` — which is what publishes; everything under `##
 * Reference` explains it and stays in the repo. This check enforces two
 * properties of that section, over the published set only:
 *
 *   1. **Structure** — every surfaced `roles/*.md` and `contracts/*.md` opens
 *      with a `## The short version` section carrying all four bold-led
 *      blocks, in order, inside the word band. The blocks answer the same four
 *      questions for a role and for a seam (what it owns/carries, when it
 *      refuses, what it never does, how it physically runs), which is why the
 *      lead-ins differ by kind but the count and order never do.
 *   2. **Readability** — the text that actually reaches a reader carries no
 *      token a stranger cannot resolve from the page: no decision id, no
 *      section sign, no forge number, no retired public name, no iteration
 *      slug, no repo-internal path, and no label vocabulary (namespaced or
 *      retired alike — a published page should name neither, and flagging only
 *      the current grammar would leave every retired mention invisible).
 *
 * **What "published" means here is deliberately narrow.** For a role or
 * contract it is the short version, not the file. For `enforcement.md` it is
 * the introduction plus the four columns the page renders — the row's own
 * name, `Summary`, `Category`, `Description`. The enforcing columns (`Gate`,
 * `What must be true…`, `Re-verifies`, `Runs`, `Catches`, `implementation`,
 * `lock`) are never scanned: they never reach a page, and flagging them would
 * demand rewriting the gate registry to suit a website. Columns resolve by
 * HEADER NAME, never by index — the three ring tables have different shapes,
 * and `Summary`/`Category`/`Description` are the ones spelled identically in
 * all three, the same property `registry-parse.ts` relies on for
 * `Description`.
 *
 * **Protocol mechanics are published on purpose.** `.worktrees/task/<iteration>/<n>`
 * and the `task/<iteration>/<n>` branch convention are the method an adopter
 * must learn, not this repo's internals — they are masked out before scanning
 * so a path rule can never eat them, and that exemption is tested rather than
 * incidental.
 */

import { findHeadingLine, findTable } from '../markdown-table'
import { isSurfacedDoc } from './surfaced-manifest'
import type { DocFrontmatter } from './types'

export const SHORT_VERSION_HEADING = 'The short version'
export const REFERENCE_HEADING = 'Reference'

/** Words. Under the floor means something was dropped; over the ceiling means
 * the reference is being summarised instead of the rule being stated. */
export const SHORT_VERSION_MIN_WORDS = 150
export const SHORT_VERSION_MAX_WORDS = 450

/** The four blocks, in order, as a role answers them. */
export const ROLE_BLOCKS = ['You own', 'You refuse', 'You never', 'How it physically runs'] as const

/** The same four blocks, as a seam answers them. */
export const CONTRACT_BLOCKS = [
  'What crosses',
  'The hand-off is malformed',
  'What it does not carry',
  'How it physically runs'
] as const

/**
 * Protocol facts that must survive every readability rule. Masked out of the
 * text before scanning, longest first, so a repo-internal-path rule can never
 * claim the branch convention.
 */
export const ALLOWED_MECHANICS: readonly string[] = [
  '.worktrees/task/<iteration>/<n>',
  'task/<iteration>/<n>',
  '.worktrees/'
]

export type PublishedProseEntry = {
  /** Path relative to `aeg-root/`, e.g. `roles/developer.md`. */
  relPath: string
  frontmatter: Pick<DocFrontmatter, 'surfaced'>
  body: string
}

export type PublishedProseResult = { errors: string[]; notes: string[] }

type ProseRule = { id: string; what: string; pattern: RegExp }

/**
 * Every rule is case-sensitive on purpose where the token itself is: forge
 * labels are lower-case, so a lower-case-only match keeps a capitalized
 * English word ("Project:", the PR-body field) from being read as the deleted
 * `project:*` label family.
 */
const PROSE_RULES: ProseRule[] = [
  { id: 'decision-id', what: 'a decision id', pattern: /\bD-\d{3,}\b/ },
  { id: 'section-ref', what: 'a section reference', pattern: /§/ },
  { id: 'forge-number', what: 'a forge number', pattern: /#\d+/ },
  { id: 'retired-name', what: 'the retired public name', pattern: /\bAEG\b/ },
  { id: 'iteration-slug', what: 'an iteration slug', pattern: /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+-v\d+\b/ },
  {
    id: 'label-vocabulary',
    what: 'forge label vocabulary',
    pattern: /(?:vinaya\/)?\b(?:iteration|tier|needs|waiver|project|aeg):(?![/\s]|$)/
  },
  { id: 'internal-path', what: 'a repo-internal path', pattern: /\b(?:packages|apps|aeg-root|tools|scripts)\// },
  { id: 'internal-path', what: 'a repo-internal path', pattern: /\.(?:claude|husky|github)\// },
  {
    id: 'internal-path',
    what: 'a repo-internal file',
    pattern: /(?:^|[\s(`"'[])[\w.-]+(?:\/[\w.-]+)*\.(?:ts|tsx|js|jsx|mjs|cjs|sh|ya?ml|json|md)\b/
  }
]

/** The doc kinds this check governs, and the block set each answers with. */
function blocksFor(relPath: string): readonly string[] | null {
  if (relPath.startsWith('roles/')) return ROLE_BLOCKS
  if (relPath.startsWith('contracts/')) return CONTRACT_BLOCKS
  return null
}

function sectionBody(body: string, heading: string): string | null {
  const lines = body.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^##\s/.test(line))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim()
}

/**
 * The section a role/contract page publishes, or null when the doc carries
 * none. The single extraction both the gate and Vinaya's `/docs` renderer
 * read, so the page and the check can never disagree about what "published"
 * means.
 */
export function extractShortVersion(body: string): string | null {
  return sectionBody(body, SHORT_VERSION_HEADING)
}

/**
 * What a role/contract page renders, with a degradation ladder that never
 * leaks the reference: the short version when present; otherwise the body
 * above `## Reference`; otherwise the whole body (a doc with neither heading
 * is not governed by C7's structure rule and has no reference to hide).
 */
export function publishedDoctrineBody(body: string): string {
  const short = extractShortVersion(body)
  if (short !== null) return short
  const lines = body.split('\n')
  const referenceAt = lines.findIndex((line) => line.trim() === `## ${REFERENCE_HEADING}`)
  return referenceAt === -1 ? body : lines.slice(0, referenceAt).join('\n').trim()
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function maskAllowedMechanics(text: string): string {
  let masked = text
  for (const literal of ALLOWED_MECHANICS) {
    masked = masked.split(literal).join(' ')
  }
  return masked
}

/**
 * The four columns `enforcement.md` actually renders — the row's own name plus
 * `Summary`, `Category`, `Description` — and the introduction above the first
 * ring. Everything else in those tables is enforcing text that never reaches a
 * page.
 */
export function enforcementPublishedText(content: string): string[] {
  const lines = content.split('\n')
  const out: string[] = []

  const firstRing = lines.findIndex((line) => /^##\s+Ring 0\b/.test(line))
  out.push((firstRing === -1 ? lines : lines.slice(0, firstRing)).join('\n'))

  const publishedHeaders = ['summary', 'category', 'description']
  for (const ring of [0, 1, 2]) {
    const headingLine = findHeadingLine(lines, new RegExp(`^##\\s+Ring ${ring}\\b`))
    if (headingLine === null) continue
    const table = findTable(lines, headingLine + 1)
    if (!table) continue
    const indices = publishedHeaders
      .map((name) => table.headers.findIndex((h) => h.trim().toLowerCase() === name))
      .filter((i) => i !== -1)
    for (const row of table.rows) {
      out.push(row.cells[0] ?? '')
      for (const i of indices) out.push(row.cells[i] ?? '')
    }
  }

  return out.filter((text) => text.trim().length > 0)
}

function checkReadability(where: string, texts: string[], errors: string[]): void {
  const seen = new Set<string>()
  for (const raw of texts) {
    const text = maskAllowedMechanics(raw)
    for (const rule of PROSE_RULES) {
      const match = text.match(rule.pattern)
      if (!match) continue
      const token = (match[0] ?? '').trim()
      const key = `${rule.id}:${token}`
      if (seen.has(key)) continue
      seen.add(key)
      errors.push(`C7: published text in "${where}" contains ${rule.what} a reader cannot resolve: "${token}"`)
    }
  }
}

function checkStructure(relPath: string, body: string, blocks: readonly string[], errors: string[]): void {
  const short = extractShortVersion(body)
  if (short === null) {
    errors.push(
      `C7: surfaced doc "${relPath}" has no "## ${SHORT_VERSION_HEADING}" section — the published page would have nothing binding to show a reader`
    )
    return
  }

  let cursor = 0
  for (const block of blocks) {
    const at = short.indexOf(`**${block}`, cursor)
    if (at === -1) {
      errors.push(`C7: "${relPath}" short version is missing the "${block}" block (all four blocks always appear)`)
      continue
    }
    cursor = at + block.length
  }

  const words = countWords(short)
  if (words < SHORT_VERSION_MIN_WORDS) {
    errors.push(
      `C7: "${relPath}" short version is ${words} words, under the ${SHORT_VERSION_MIN_WORDS}-word floor — something was dropped`
    )
  } else if (words > SHORT_VERSION_MAX_WORDS) {
    errors.push(
      `C7: "${relPath}" short version is ${words} words, over the ${SHORT_VERSION_MAX_WORDS}-word ceiling — state the rule, don't summarise the reference`
    )
  }
}

/**
 * Runs both checks over the published set only. `entries` may hold every doc
 * under `aeg-root/`; `surfacedPaths` (the model-backed allowlist) is what
 * narrows it, so this check can never publish-check a doc the site does not
 * publish, nor miss one it does.
 */
export function evaluatePublishedProse(
  entries: PublishedProseEntry[],
  surfacedPaths: ReadonlySet<string> = new Set()
): PublishedProseResult {
  const errors: string[] = []
  const notes: string[] = []

  const surfaced = entries.filter((e) => isSurfacedDoc(e.relPath, e.frontmatter, surfacedPaths))

  for (const entry of surfaced) {
    const blocks = blocksFor(entry.relPath)
    if (blocks) {
      checkStructure(entry.relPath, entry.body, blocks, errors)
      const short = extractShortVersion(entry.body)
      if (short !== null) checkReadability(entry.relPath, [short], errors)
      continue
    }
    if (entry.relPath === 'enforcement.md') {
      checkReadability(entry.relPath, enforcementPublishedText(entry.body), errors)
    }
  }

  if (surfaced.length === 0) notes.push('C7: no surfaced docs to check.')

  return { errors, notes }
}
