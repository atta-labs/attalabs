import type { Doc } from '@atta/aeg-core/docs'

export function nestDocChildren(docs: Doc[]): { topLevel: Doc[]; flat: Doc[] } {
  const bySlug = new Map(docs.map((d) => [d.slug, d]))
  for (const doc of docs) {
    if (doc.parentSlug) {
      const parent = bySlug.get(doc.parentSlug)
      if (parent) {
        parent.children ??= []
        parent.children.push(doc)
      }
    }
  }
  const topLevel = docs.filter((d) => !d.parentSlug)
  const flat = [...topLevel, ...topLevel.flatMap((d) => d.children ?? [])]
  return { topLevel, flat }
}
