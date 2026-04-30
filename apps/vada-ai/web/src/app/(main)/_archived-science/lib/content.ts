import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { getScienceIcon } from './icons'
import type { LucideIcon } from 'lucide-react'

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'science')

type Frontmatter = {
  title: string
  description?: string
  slug: string
  section?: string
  order: number
}

export type ScienceDoc = {
  slug: string
  title: string
  description?: string
  section: string
  order: number
  href: string
  icon: LucideIcon
  filePath: string
}

export type ScienceGroup = {
  id: string
  label: string
  items: ScienceDoc[]
}

const SECTION_ORDER: string[] = [
  'The Science of Vāda',
  'Foundations',
  'Architecture',
  'Engine',
  'Validation',
  'Ecosystem'
]

const SECTION_IDS: Record<string, string> = {
  'The Science of Vāda': 'intro',
  Foundations: 'foundations',
  Architecture: 'architecture',
  Engine: 'engine',
  Validation: 'validation',
  Ecosystem: 'ecosystem'
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      if (entry.isFile() && entry.name.endsWith('.md')) return [full]
      return []
    })
  )
  return files.flat()
}

function slugFromFullPath(fullSlug: string): string {
  return fullSlug.replace(/^\/science\//, '')
}

let cache: ScienceDoc[] | null = null

export async function getAllScienceDocs(): Promise<ScienceDoc[]> {
  if (cache) return cache
  const files = await walk(CONTENT_ROOT)
  const docs: ScienceDoc[] = []
  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8')
    const { data } = matter(raw)
    const fm = data as Frontmatter
    const slug = slugFromFullPath(fm.slug)
    const section = fm.section ?? 'The Science of Vāda'
    docs.push({
      slug,
      title: fm.title,
      description: fm.description,
      section,
      order: fm.order,
      href: fm.slug.replace('/science/', '/autonomous/science/'),
      icon: getScienceIcon(slug),
      filePath
    })
  }
  cache = docs
  return docs
}

export async function getScienceIndex(): Promise<ScienceGroup[]> {
  const docs = await getAllScienceDocs()
  const bySection = new Map<string, ScienceDoc[]>()
  for (const doc of docs) {
    const list = bySection.get(doc.section) ?? []
    list.push(doc)
    bySection.set(doc.section, list)
  }

  const groups: ScienceGroup[] = []
  for (const sectionLabel of SECTION_ORDER) {
    const items = bySection.get(sectionLabel)
    if (!items || items.length === 0) continue
    items.sort((a, b) => a.order - b.order)
    groups.push({ id: SECTION_IDS[sectionLabel] ?? sectionLabel, label: sectionLabel, items })
  }
  return groups
}

export async function getFlatScienceDocs(): Promise<ScienceDoc[]> {
  const groups = await getScienceIndex()
  return groups.flatMap((g) => g.items)
}

export async function getScienceDocBySlug(slug: string): Promise<ScienceDoc | undefined> {
  const docs = await getAllScienceDocs()
  return docs.find((doc) => doc.slug === slug)
}

export async function getScienceDocContent(slug: string): Promise<{ doc: ScienceDoc; content: string } | undefined> {
  const doc = await getScienceDocBySlug(slug)
  if (!doc) return undefined
  const raw = await fs.readFile(doc.filePath, 'utf8')
  const { content } = matter(raw)
  return { doc, content }
}

export async function getNextScienceDoc(slug: string): Promise<ScienceDoc | undefined> {
  const flat = await getFlatScienceDocs()
  const idx = flat.findIndex((d) => d.slug === slug)
  if (idx === -1 || idx === flat.length - 1) return undefined
  return flat[idx + 1]
}

export async function getPrevScienceDoc(slug: string): Promise<ScienceDoc | undefined> {
  const flat = await getFlatScienceDocs()
  const idx = flat.findIndex((d) => d.slug === slug)
  if (idx <= 0) return undefined
  return flat[idx - 1]
}
