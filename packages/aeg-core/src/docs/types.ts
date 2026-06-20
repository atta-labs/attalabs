export type DocFrontmatter = {
  title?: string
  sidebarTitle?: string
  description?: string
  section?: string
  order?: number
  parent?: string
}

export type Doc = {
  slug: string
  title: string
  sidebarTitle?: string
  description?: string
  section: string
  order: number
  href: string
  filePath: string
  children?: Doc[]
  parentSlug?: string
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
