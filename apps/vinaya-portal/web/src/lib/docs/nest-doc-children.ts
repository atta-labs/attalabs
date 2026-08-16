import type { Doc } from '@attalabs/aeg-core/docs'

function flattenDoc(doc: Doc): Doc[] {
  return [doc, ...(doc.children ?? []).flatMap(flattenDoc)]
}

export function nestDocChildren(docs: Doc[]): { topLevel: Doc[]; flat: Doc[] } {
  // Shallow-copy each doc so we never mutate the caller's objects
  const copies = new Map<string, Doc>(docs.map((d) => [d.slug, { ...d, children: undefined }]))

  for (const copy of copies.values()) {
    if (copy.parentSlug) {
      const parent = copies.get(copy.parentSlug)
      if (parent) {
        parent.children ??= []
        parent.children.push(copy)
      }
    }
  }

  const topLevel = [...copies.values()].filter((d) => !d.parentSlug)
  const flat = topLevel.flatMap(flattenDoc)
  return { topLevel, flat }
}
