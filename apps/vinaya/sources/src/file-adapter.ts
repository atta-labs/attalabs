import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseIteration } from '@atta/aeg-core'
import type { StateSource } from './contract'

/** Default governance root when no config value is supplied. Never read
 * directly by adapter logic below — always through `config.root`, so a
 * relocation of this repo's governance data (`vinaya-finding-aeg-root-into-
 * aeg-core`) is a config flip, not a rewrite (2026-07-05 Planner amendment). */
export const DEFAULT_GOVERNANCE_ROOT = 'aeg-root'

export type FileSourceConfig = {
  /** Governance root to read from. Defaults to `DEFAULT_GOVERNANCE_ROOT`. */
  root?: string
}

/**
 * Transitional StateSource design — wraps the existing `parseIteration`
 * reader over a configurable governance root. Deliberate throwaway: deleted
 * by the future migration iteration once every consumer is forge-backed.
 * Tries the active-iteration path first (`<root>/iterations/<slug>.md`),
 * then the completed path (`<root>/iterations/completed/<slug>.md`) — this
 * repo's own governance root currently holds no active `.md` files (they
 * moved to forge-only reads), so the completed path is the live case today.
 */
export function createFileSource(config: FileSourceConfig = {}): StateSource {
  const root = config.root ?? DEFAULT_GOVERNANCE_ROOT
  return {
    async getIteration(slug: string) {
      const activePath = join(root, 'iterations', `${slug}.md`)
      const completedPath = join(root, 'iterations', 'completed', `${slug}.md`)
      const path = existsSync(activePath) ? activePath : completedPath
      if (!existsSync(path)) {
        throw new Error(`No iteration file found for slug "${slug}" under ${root}/iterations`)
      }
      return parseIteration(readFileSync(path, 'utf-8'))
    }
  }
}
