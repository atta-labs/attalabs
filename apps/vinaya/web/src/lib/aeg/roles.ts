import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { deriveTitle, parseDocFrontmatter } from '@atta/aeg-core/docs'
import { findAegRoot, githubBlobUrl, toRepoRelative } from '../github-links'

export type RoleDoc = {
  slug: string
  title: string
  /** The doc's own "**Audience:**" line, verbatim — falls back to the first
   *  paragraph after the H1 when a doc doesn't use that convention (e.g.
   *  `planner.md`). Never rewritten into new prose. */
  audience: string
  relPath: string
  href: string
}

const AUDIENCE_LINE_PATTERN = /^\*\*Audience:\*\*\s*(.+)$/m

function firstParagraphAfterH1(body: string): string {
  const withoutH1 = body.replace(/^\s*#\s+.*\n+/, '')
  const paragraph = withoutH1.split(/\n\s*\n/)[0]?.trim()
  return paragraph ?? ''
}

function extractAudience(body: string): string {
  const match = body.match(AUDIENCE_LINE_PATTERN)
  if (match?.[1]) return match[1].trim()
  return firstParagraphAfterH1(body)
}

/**
 * Reads every file in `aeg-root/roles/*.md` — real read + frontmatter/H1
 * extraction (`@atta/aeg-core/docs`), not a hand-transcribed list. Whatever
 * files exist on disk today are exactly what renders; adding, removing, or
 * renaming a role file changes this page's output on the next build with no
 * code change here.
 */
export async function loadRoles(): Promise<RoleDoc[]> {
  const rolesDir = path.join(findAegRoot(), 'roles')
  const entries = await fs.readdir(rolesDir, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name)

  const roles = await Promise.all(
    files.map(async (file) => {
      const absPath = path.join(rolesDir, file)
      const raw = await fs.readFile(absPath, 'utf8')
      const parsed = parseDocFrontmatter(raw)
      const slug = file.replace(/\.md$/, '')
      const relPath = toRepoRelative(absPath)
      return {
        slug,
        title: deriveTitle(parsed, slug),
        audience: extractAudience(parsed.body),
        relPath,
        href: githubBlobUrl(relPath)
      }
    })
  )

  return roles.sort((a, b) => a.title.localeCompare(b.title))
}
