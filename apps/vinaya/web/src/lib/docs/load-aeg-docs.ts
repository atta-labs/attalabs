import 'server-only'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { deriveDiagramModel } from '@atta/aeg-core'
import { buildDocNav, deriveTitle, isSurfacedDoc, modelBackedDocPaths, parseDocFrontmatter } from '@atta/aeg-core/docs'
import type { Doc, DocNav } from '@atta/aeg-core/docs'
import { createFileDoctrineSource } from '@atta/vinaya-sources'
import { nestDocChildren } from './nest-doc-children'

const SECTION_ORDER = ['Overview', 'Contracts', 'Roles', 'Diagrams', 'Skills']
const DOCS_BASE_PATH = '/docs'

const SECTION_BY_DIR: Record<string, string> = {
  contracts: 'Contracts',
  roles: 'Roles',
  diagrams: 'Diagrams',
  skills: 'Skills'
}

function findAegRoot(): string {
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'aeg-root')
    if (existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('aeg-root/ directory not found by walking up from cwd')
}

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

function defaultSectionFor(slug: string): string {
  const segments = slug.split('/')
  if (segments.length === 1) return 'Overview'
  const dir = segments[0]
  if (dir && SECTION_BY_DIR[dir]) return SECTION_BY_DIR[dir]
  return 'Overview'
}

function fallbackTitleFromSlug(slug: string): string {
  const last = slug.split('/').pop() ?? slug
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\.SKILL$/i, ' (skill)')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export type LoadedDocs = {
  nav: DocNav
  bodyBySlug: Map<string, string>
  basePath: string
}

let cache: LoadedDocs | null = null

export async function loadAegDocs(): Promise<LoadedDocs> {
  if (cache) return cache

  const root = findAegRoot()
  const files = await walkMarkdown(root)

  // The surfacing rule is model-backed (D-079, D-087): a doc publishes iff a
  // `DiagramModel` node points at it. Derive the same model `/the-harness`
  // renders, then let its node→doc mapping be the allowlist.
  const doctrine = await createFileDoctrineSource({ root }).getDoctrine()
  const surfacedPaths = modelBackedDocPaths(deriveDiagramModel(doctrine, null, null))

  const docs: Doc[] = []
  const bodyBySlug = new Map<string, string>()

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = parseDocFrontmatter(raw)
    const slug = slugFromFile(filePath, root)
    if (!isSurfacedDoc(`${slug}.md`, parsed.frontmatter, surfacedPaths)) continue
    const fallback = fallbackTitleFromSlug(slug)
    const title = deriveTitle(parsed, fallback)
    const section = parsed.frontmatter.section ?? defaultSectionFor(slug)
    const order = parsed.frontmatter.order ?? 0
    docs.push({
      slug,
      title,
      sidebarTitle: parsed.frontmatter.sidebarTitle,
      description: parsed.frontmatter.description,
      section,
      order,
      href: `${DOCS_BASE_PATH}/${slug}`,
      filePath,
      parentSlug: parsed.frontmatter.parent
    })
    bodyBySlug.set(slug, parsed.body)
  }

  const { topLevel, flat } = nestDocChildren(docs)
  const navSections = buildDocNav(topLevel, { sectionOrder: SECTION_ORDER })
  const nav: DocNav = { sections: navSections.sections, flat }
  cache = { nav, bodyBySlug, basePath: DOCS_BASE_PATH }
  return cache
}
