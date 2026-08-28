import { readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DOCS_ROOT = join(process.cwd(), 'src/app/(site)/docs')
const BANNED_SOURCE_LINK_MARKERS = [
  'githubBlobUrl',
  'GITHUB_VINAYA_REPO',
  'Read the full reference on GitHub',
  'viewSourceHref',
  'View source'
]

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (entry.name.includes('.test.')) return []
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
  })
}

describe('public docs source links', () => {
  it('does not expose private-repository source affordances', () => {
    const findings = sourceFiles(DOCS_ROOT).flatMap((path) => {
      const source = readFileSync(path, 'utf8')
      return BANNED_SOURCE_LINK_MARKERS.filter((marker) => source.includes(marker)).map(
        (marker) => `${path.replace(`${DOCS_ROOT}/`, '')}: ${marker}`
      )
    })

    expect(findings).toEqual([])
  })
})
