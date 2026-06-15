export type DocFrontmatter = {
  title?: string
  description?: string
  section?: string
  order?: number
}

export type Doc = {
  slug: string
  title: string
  description?: string
  section: string
  order: number
  href: string
  filePath: string
}

export type DocSection = {
  id: string
  label: string
  docs: Doc[]
}

export type DocNav = {
  sections: DocSection[]
  flat: Doc[]
}
