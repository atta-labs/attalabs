import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { deriveDiagramModel } from '@attalabs/aeg-core'
import type { DiagramModel } from '@attalabs/aeg-core'
import { deriveTitle, isSurfacedDoc, modelBackedDocPaths, parseDocFrontmatter } from '@attalabs/aeg-core/docs'
import type { Doc, DocNav, DocSection } from '@attalabs/aeg-core/docs'
import { createFileDoctrineSource } from '@attalabs/vinaya-sources'
import { findAegRoot } from '@/lib/github-links'

const DOCS_BASE_PATH = '/docs'

async function walkMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return walkMarkdown(full)
      if (entry.isFile() && entry.name.endsWith('.md')) return [full]
      return []
    })
  )
  return nested.flat()
}

function slugFromFile(filePath: string, root: string): string {
  const rel = path.relative(root, filePath).replace(/\\/g, '/')
  return rel.replace(/\.md$/, '')
}

function fallbackTitleFromSlug(slug: string): string {
  const last = slug.split('/').pop() ?? slug
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\.SKILL$/i, ' (skill)')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** The ring node's own doctrine-derived label (`enforcement.md`'s summary
 * table — "Hooks"/"Branch Rules"/"Audits"), model-sourced like everything on
 * this surface. */
function ringLabel(model: DiagramModel, ringIndex: 0 | 1 | 2): string {
  return model.nodes.find((n) => n.kind === 'ring' && n.ringIndex === ringIndex)?.label ?? `Ring ${ringIndex}`
}

export type LoadedDocs = {
  nav: DocNav
  bodyBySlug: Map<string, string>
  basePath: string
}

let cache: LoadedDocs | null = null

/**
 * The `/docs` data spine, built from the HARNESS MODEL TREE, not the file tree
 * (`vinaya-pages-v1` task 12). The nav is Roles / Contracts / Actions / The
 * Rings, at a granularity that follows content size: roles and contracts are
 * file-sized, so each keeps its own page; gates and actions are row-sized, so
 * they render as `#`-anchored sections inside the ring/action pages and carry
 * no sidebar entry of their own. `The Rings` is a parent whose three children
 * are Ring 0/1/2.
 *
 * `bodyBySlug` still holds the raw `aeg-root/**.md` bodies for the file-sized
 * pages (roles, contracts) plus `enforcement.md` — whose intro renders as the
 * `/docs/rings` landing. The file allowlist deciding which raw bodies are
 * readable stays `modelBackedDocPaths` — this changes nav construction,
 * not the allowlist.
 */
export async function loadAegDocs(): Promise<LoadedDocs> {
  if (cache) return cache

  const root = findAegRoot()
  const files = await walkMarkdown(root)

  const doctrine = await createFileDoctrineSource({ root }).getDoctrine()
  const model = deriveDiagramModel(doctrine, null, null)
  const surfacedPaths = modelBackedDocPaths(model)

  // Raw bodies for the file-sized pages + enforcement.md (the rings landing).
  const bodyBySlug = new Map<string, string>()
  const roleDocs: Doc[] = []
  const contractDocs: Doc[] = []
  const glossaryDocs: Doc[] = []

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = parseDocFrontmatter(raw)
    const slug = slugFromFile(filePath, root)
    if (!isSurfacedDoc(`${slug}.md`, parsed.frontmatter, surfacedPaths)) continue

    bodyBySlug.set(slug, parsed.body)

    const isRole = slug.startsWith('roles/')
    const isContract = slug.startsWith('contracts/')
    const isGlossary = slug === 'glossary'
    if (!isRole && !isContract && !isGlossary) continue // enforcement.md: body kept, no nav entry

    const doc: Doc = {
      slug,
      title: deriveTitle(parsed, fallbackTitleFromSlug(slug)),
      sidebarTitle: parsed.frontmatter.sidebarTitle,
      description: parsed.frontmatter.description,
      section: isRole ? 'Roles' : isContract ? 'Contracts' : 'Glossary',
      order: parsed.frontmatter.order ?? 0,
      href: `${DOCS_BASE_PATH}/${slug}`,
      filePath
    }
    if (isRole) roleDocs.push(doc)
    else if (isContract) contractDocs.push(doc)
    else glossaryDocs.push(doc)
  }

  const byTitle = (a: Doc, b: Doc) => a.order - b.order || a.title.localeCompare(b.title)
  roleDocs.sort(byTitle)
  contractDocs.sort(byTitle)
  glossaryDocs.sort(byTitle)

  // Synthetic, model-derived nav entries. The three rings are flat sidebar
  // items (each its own page) under the "The Rings" section — not a collapsible
  // parent. `ringsDoc` is the `/docs/rings` intro route (redirect target for
  // `/docs/enforcement`), routable but not itself a sidebar item.
  const ringChildren: Doc[] = ([0, 1, 2] as const).map((i) => ({
    slug: `rings/ring-${i}`,
    title: `Ring ${i} · ${ringLabel(model, i)}`,
    sidebarTitle: `Ring ${i} · ${ringLabel(model, i)}`,
    section: 'The Rings',
    order: i,
    href: `${DOCS_BASE_PATH}/rings/ring-${i}`,
    filePath: 'aeg-root/enforcement.md'
  }))

  const ringsDoc: Doc = {
    slug: 'rings',
    title: 'The Rings',
    section: 'The Rings',
    order: 0,
    href: `${DOCS_BASE_PATH}/rings`,
    filePath: 'aeg-root/enforcement.md'
  }

  // The Actions page (`/docs/actions`, one route) split into two sidebar
  // entries by GitHub crossing — the two `#`-anchored groups on that page.
  const actionsDoc: Doc = {
    slug: 'actions',
    title: 'Actions',
    section: 'Actions',
    order: 0,
    href: `${DOCS_BASE_PATH}/actions`,
    filePath: 'packages/aeg-core/src/actions.ts'
  }
  const actionNavItems: Doc[] = [
    {
      slug: 'actions-reaches-github',
      title: 'Reaches GitHub',
      sidebarTitle: 'Reaches GitHub',
      section: 'Actions',
      order: 0,
      href: `${DOCS_BASE_PATH}/actions#reaches-github`,
      filePath: 'packages/aeg-core/src/actions.ts'
    },
    {
      slug: 'actions-stays-local',
      title: 'Stays local',
      sidebarTitle: 'Stays local',
      section: 'Actions',
      order: 1,
      href: `${DOCS_BASE_PATH}/actions#stays-local`,
      filePath: 'packages/aeg-core/src/actions.ts'
    }
  ]

  // Order: The Rings first (below the sidebar title), then Roles, Contracts,
  // Actions, Glossary. `flat` carries only the routable docs — the
  // anchor-only Action items are sidebar chrome, not routes. Glossary is a
  // one-doc section of its own rather than folded into Roles/Contracts: it
  // is neither, and giving it a section keeps the nav's section→doc-kind
  // mapping exhaustive rather than adding a silent exception.
  const sections: DocSection[] = [
    { id: 'the-rings', label: 'The Rings', docs: ringChildren },
    { id: 'roles', label: 'Roles', docs: roleDocs },
    { id: 'contracts', label: 'Contracts', docs: contractDocs },
    { id: 'actions', label: 'Actions', docs: actionNavItems },
    { id: 'glossary', label: 'Glossary', docs: glossaryDocs }
  ]

  const flat: Doc[] = [...roleDocs, ...contractDocs, actionsDoc, ringsDoc, ...ringChildren, ...glossaryDocs]

  cache = { nav: { sections, flat }, bodyBySlug, basePath: DOCS_BASE_PATH }
  return cache
}
