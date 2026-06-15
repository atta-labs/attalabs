import type { Doc, DocNav } from './types'

export function findDoc(nav: DocNav, slug: string): Doc | undefined {
  return nav.flat.find((d) => d.slug === slug)
}

export function getNextDoc(nav: DocNav, slug: string): Doc | undefined {
  const idx = nav.flat.findIndex((d) => d.slug === slug)
  if (idx === -1 || idx === nav.flat.length - 1) return undefined
  return nav.flat[idx + 1]
}

export function getPrevDoc(nav: DocNav, slug: string): Doc | undefined {
  const idx = nav.flat.findIndex((d) => d.slug === slug)
  if (idx <= 0) return undefined
  return nav.flat[idx - 1]
}
