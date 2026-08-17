/**
 * C6 — the docs-coherence check (state-machine.md Section 15c). Pure: given
 * every parsed doc entry from `aeg-root/` and the model-backed surfaced-path
 * allowlist (`modelBackedDocPaths`, passed in because deriving
 * it requires reading doctrine, which this pure module never does), asserts:
 *   (a) every surfaced doc is reachable in the doc-nav tree the docs engine
 *       (`buildDocNav`) would build for the surfaced set;
 *   (b) no surfaced doc's `parent:` reference points at a doc that doesn't
 *       exist, or exists but isn't itself surfaced;
 *   (c) every relative `.md` link between two surfaced docs resolves to
 *       another surfaced doc.
 *
 * (a) and (b) mirror the real parent/child resolution
 * `apps/vinaya-portal/web/src/lib/docs/nest-doc-children.ts` performs when
 * building Vinaya Portal's live `/docs` nav (that file is read-only
 * reference here, never imported): a doc whose
 * `parent:` frontmatter points at
 * a nonexistent (or excluded) slug is silently dropped from that nav's flat
 * list — reachable neither at the top level nor as anyone's child. That
 * silent-drop is the exact defect this check exists to catch.
 */

import { deriveTitle, type ParsedDoc } from './parse-doc'
import { isSurfacedDoc } from './surfaced-manifest'
import type { Doc, DocFrontmatter } from './types'

export type DocsCoherenceEntry = {
  /** Path relative to `aeg-root/`, e.g. `roles/developer.md`. */
  relPath: string
  frontmatter: DocFrontmatter
  body: string
  firstH1?: string
}

export type DocsCoherenceResult = { errors: string[]; notes: string[] }

function slugOf(relPath: string): string {
  return relPath.replace(/\.md$/, '')
}

function relPathOf(slug: string): string {
  return `${slug}.md`
}

function defaultSectionFor(relPath: string): string {
  const segments = relPath.split('/')
  return segments.length === 1 ? 'Overview' : (segments[0] ?? 'Overview')
}

function toDoc(entry: DocsCoherenceEntry): Doc {
  const slug = slugOf(entry.relPath)
  const parsed: ParsedDoc = { frontmatter: entry.frontmatter, body: entry.body, firstH1: entry.firstH1 }
  return {
    slug,
    title: deriveTitle(parsed, slug),
    sidebarTitle: entry.frontmatter.sidebarTitle,
    description: entry.frontmatter.description,
    section: entry.frontmatter.section ?? defaultSectionFor(entry.relPath),
    order: entry.frontmatter.order ?? 0,
    href: `/docs/${slug}`,
    filePath: `aeg-root/${entry.relPath}`,
    parentSlug: entry.frontmatter.parent
  }
}

function isReachable(doc: Doc, bySlug: Map<string, Doc>, seen: Set<string> = new Set()): boolean {
  if (!doc.parentSlug) return true
  if (seen.has(doc.slug)) return false // cycle guard
  const parent = bySlug.get(doc.parentSlug)
  if (!parent) return false
  seen.add(doc.slug)
  return isReachable(parent, bySlug, seen)
}

const MD_LINK_PATTERN = /\]\(([^)]+)\)/g

/** Resolves `target` relative to the directory of `fromRelPath`. Returns null if it escapes `aeg-root/`. */
function resolveRelativeMdLink(fromRelPath: string, target: string): string | null {
  const fromDir = fromRelPath.includes('/') ? fromRelPath.slice(0, fromRelPath.lastIndexOf('/')) : ''
  const combined = target.startsWith('/') ? target.slice(1) : fromDir ? `${fromDir}/${target}` : target

  const stack: string[] = []
  for (const part of combined.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (stack.length === 0) return null
      stack.pop()
    } else {
      stack.push(part)
    }
  }
  return stack.join('/')
}

export function evaluateDocsCoherence(
  entries: DocsCoherenceEntry[],
  surfacedPaths: ReadonlySet<string> = new Set()
): DocsCoherenceResult {
  const errors: string[] = []
  const notes: string[] = []

  const surfacedEntries = entries.filter((e) => isSurfacedDoc(e.relPath, e.frontmatter, surfacedPaths))
  const surfacedRelPaths = new Set(surfacedEntries.map((e) => e.relPath))
  const docs = surfacedEntries.map(toDoc)
  const bySlug = new Map(docs.map((d) => [d.slug, d]))

  for (const doc of docs) {
    if (!isReachable(doc, bySlug)) {
      errors.push(`C6: surfaced doc "${relPathOf(doc.slug)}" is not reachable in the doc nav`)
    }
    if (doc.parentSlug && !bySlug.has(doc.parentSlug)) {
      errors.push(
        `C6: nav entry "${relPathOf(doc.slug)}" points at a non-existent/excluded doc "${relPathOf(doc.parentSlug)}"`
      )
    }
  }

  for (const entry of surfacedEntries) {
    for (const match of entry.body.matchAll(MD_LINK_PATTERN)) {
      const raw = (match[1] ?? '').trim()
      const target = (raw.split('#')[0] ?? '').trim()
      if (!target) continue // pure same-doc anchor, e.g. `(#some-heading)`
      if (/^https?:\/\//.test(target) || target.startsWith('mailto:')) continue
      if (!target.endsWith('.md')) continue

      const resolved = resolveRelativeMdLink(entry.relPath, target)
      if (resolved === null) continue // escapes aeg-root/ — out of scope for this check

      if (!surfacedRelPaths.has(resolved)) {
        errors.push(`C6: link "${target}" in "${entry.relPath}" resolves to no surfaced doc`)
      }
    }
  }

  return { errors, notes }
}
