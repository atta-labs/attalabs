import type { Doc, DocNav, DocSection } from './types'

export type BuildDocNavOptions = {
  sectionOrder?: string[]
}

function sectionIdOf(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildDocNav(docs: Doc[], opts: BuildDocNavOptions = {}): DocNav {
  const bySection = new Map<string, Doc[]>()
  for (const doc of docs) {
    const list = bySection.get(doc.section) ?? []
    list.push(doc)
    bySection.set(doc.section, list)
  }

  const ordered: string[] = []
  if (opts.sectionOrder) {
    for (const label of opts.sectionOrder) if (bySection.has(label)) ordered.push(label)
  }
  for (const label of bySection.keys()) if (!ordered.includes(label)) ordered.push(label)

  const sections: DocSection[] = ordered.map((label) => {
    const items = (bySection.get(label) ?? []).slice().sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      return a.title.localeCompare(b.title)
    })
    return { id: sectionIdOf(label), label, docs: items }
  })

  const flat = sections.flatMap((s) => s.docs)
  return { sections, flat }
}
