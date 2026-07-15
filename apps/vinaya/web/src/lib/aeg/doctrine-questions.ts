import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { deriveDiagramModel, type DoctrineContent } from '@atta/aeg-core'
import { findAegRoot } from './repo'

/** Reads every `.md` file directly in `<root>/<dir>` — same file-reading shape
 * `loadRoles`/`loadContracts` already use, just returning raw content instead
 * of parsed frontmatter (that parsing is `deriveDiagramModel`'s own job). */
async function readMarkdownDir(root: string, dir: string): Promise<Array<{ path: string; content: string }>> {
  const dirPath = path.join(root, dir)
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort()
  return Promise.all(
    files.map(async (file) => ({
      path: path.join(dir, file),
      content: await fs.readFile(path.join(root, dir, file), 'utf8')
    }))
  )
}

/** Builds a `DoctrineContent` straight from `aeg-root/` — the same three reads
 * `@atta/vinaya-sources`' `createFileDoctrineSource` does, inlined here rather
 * than adding that package as a dependency just for this one call site. */
async function readDoctrineContent(): Promise<DoctrineContent> {
  const root = findAegRoot()
  const [enforcement, roles, contracts] = await Promise.all([
    fs.readFile(path.join(root, 'enforcement.md'), 'utf8'),
    readMarkdownDir(root, 'roles'),
    readMarkdownDir(root, 'contracts')
  ])
  return { enforcement, roles, contracts }
}

/**
 * Every role/contract/action node's `summary` field, doctrine-wide — written as
 * a rhetorical question by convention (e.g. "Ever had someone review their own
 * work?"). Derived at build/module time via the same pure `deriveDiagramModel`
 * every diagram consumer (Studio, this page) reads, never hand-transcribed.
 */
export async function loadDoctrineQuestions(): Promise<string[]> {
  const doctrine = await readDoctrineContent()
  const model = deriveDiagramModel(doctrine, null, null)
  const summaries = model.nodes.map((node) => node.summary).filter((summary) => summary !== undefined)
  return Array.from(new Set(summaries))
}
