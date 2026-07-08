import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { deriveTitle, parseDocFrontmatter } from '@atta/aeg-core/docs'
import { findAegRoot, githubBlobUrl, toRepoRelative } from './repo'

export type ContractDoc = {
  slug: string
  title: string
  status: string
  seam: string
  /** The "## Why this file exists" section's own text, verbatim. */
  why: string
  relPath: string
  href: string
}

const STATUS_PATTERN = /^\*\*Status:\*\*\s*(.+)$/m
const SEAM_PATTERN = /^\*\*Seam:\*\*\s*(.+)$/m
const WHY_SECTION_PATTERN = /##\s*Why this file exists\s*\n+([\s\S]*?)(?=\n##\s|\n---\s*\n|$)/

function extractWhy(body: string): string {
  const match = body.match(WHY_SECTION_PATTERN)
  return match?.[1]?.trim() ?? ''
}

/**
 * Reads every file in `aeg-root/contracts/*.md` — real read + extraction,
 * not a hand-transcribed list. Whichever files exist on disk at build time
 * are exactly what renders, so a contract added/removed/renamed since
 * planning time shows up here automatically.
 */
export async function loadContracts(): Promise<ContractDoc[]> {
  const contractsDir = path.join(findAegRoot(), 'contracts')
  const entries = await fs.readdir(contractsDir, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name)

  const contracts = await Promise.all(
    files.map(async (file) => {
      const absPath = path.join(contractsDir, file)
      const raw = await fs.readFile(absPath, 'utf8')
      const parsed = parseDocFrontmatter(raw)
      const slug = file.replace(/\.md$/, '')
      const relPath = toRepoRelative(absPath)
      return {
        slug,
        title: deriveTitle(parsed, slug),
        status: parsed.body.match(STATUS_PATTERN)?.[1]?.trim() ?? 'unknown',
        seam: parsed.body.match(SEAM_PATTERN)?.[1]?.trim() ?? '',
        why: extractWhy(parsed.body),
        relPath,
        href: githubBlobUrl(relPath)
      }
    })
  )

  return contracts.sort((a, b) => a.title.localeCompare(b.title))
}
