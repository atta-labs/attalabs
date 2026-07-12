import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DoctrineContent, DoctrineSource } from '@atta/aeg-core'
import { DEFAULT_GOVERNANCE_ROOT } from './file-adapter'

export type DoctrineFileSourceConfig = {
  /** Governance root to read doctrine from. Defaults to `DEFAULT_GOVERNANCE_ROOT`. */
  root?: string
}

/** Reads every `.md` file in `<root>/<dir>`, sorted by filename for
 * deterministic order, returning path + raw content per file. */
function readMarkdownDir(root: string, dir: string): Array<{ path: string; content: string }> {
  const dirPath = join(root, dir)
  return readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const path = join(dir, file)
      return { path, content: readFileSync(join(root, path), 'utf-8') }
    })
}

/**
 * File-backed `DoctrineSource` over a configurable governance root. Reads
 * `<root>/enforcement.md`, `<root>/roles/*.md`, and `<root>/contracts/*.md`.
 * The default root is `DEFAULT_GOVERNANCE_ROOT`; adapter logic never hardcodes
 * a literal path — same rule as `file-adapter.ts`, so relocating this repo's
 * governance data is a config flip, not a rewrite. This is the I/O boundary
 * for the `DoctrineSource` contract, which stays I/O-free in `@atta/aeg-core`.
 */
export function createFileDoctrineSource(config: DoctrineFileSourceConfig = {}): DoctrineSource {
  const root = config.root ?? DEFAULT_GOVERNANCE_ROOT
  return {
    async getDoctrine(): Promise<DoctrineContent> {
      const enforcement = readFileSync(join(root, 'enforcement.md'), 'utf-8')
      const roles = readMarkdownDir(root, 'roles')
      const contracts = readMarkdownDir(root, 'contracts')
      return { enforcement, roles, contracts }
    }
  }
}
