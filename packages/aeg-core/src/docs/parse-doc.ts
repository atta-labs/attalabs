import matter from 'gray-matter'
import type { DocFrontmatter } from './types'

export type ParsedDoc = {
  frontmatter: DocFrontmatter
  body: string
  firstH1?: string
}

const H1_PATTERN = /^\s*#\s+(.+?)\s*$/m

export function parseDocFrontmatter(raw: string): ParsedDoc {
  const { data, content } = matter(raw)
  const fm = data as Record<string, unknown>

  const frontmatter: DocFrontmatter = {}
  if (typeof fm.title === 'string') frontmatter.title = fm.title
  if (typeof fm.description === 'string') frontmatter.description = fm.description
  if (typeof fm.section === 'string') frontmatter.section = fm.section
  if (typeof fm.order === 'number') frontmatter.order = fm.order
  if (typeof fm.parent === 'string') frontmatter.parent = fm.parent

  const h1Match = content.match(H1_PATTERN)
  const firstH1 = h1Match?.[1]?.trim()

  return { frontmatter, body: content, firstH1 }
}

export function deriveTitle(parsed: ParsedDoc, fallbackFromPath: string): string {
  if (parsed.frontmatter.title) return parsed.frontmatter.title
  if (parsed.firstH1) return parsed.firstH1
  return fallbackFromPath
}

export function stripLeadingH1(body: string): string {
  return body.replace(/^\s*#\s+.*\n+/, '')
}
