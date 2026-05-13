import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadFlow } from './flow-loader'
import type { Flow } from './flow-types'

// Anchor: this file lives at packages/engine/src/
// Going up 3 levels reaches the repo root; yamls live at apps/vada-ai/yamls/
const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_CATALOG_DIR = join(__dirname, '../../../apps/vada-ai/yamls')

function catalogDir(): string {
  return process.env.VADA_YAMLS_DIR ?? DEFAULT_CATALOG_DIR
}

/**
 * Load a Flow by ID from the YAML catalog.
 * ID is the filename without the .yaml extension (e.g. 'crucible').
 * Throws with the full resolved path on failure for easy debugging.
 */
export function loadYamlFromCatalog(id: string): Flow {
  const filePath = join(catalogDir(), `${id}.yaml`)
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    throw new Error(`loadYamlFromCatalog: cannot read spec '${id}' — tried: ${filePath}`)
  }
  return loadFlow(content)
}

/**
 * Returns all non-experimental flows from the catalog, sorted alphabetically by id.
 * Flows with `experimental: true` are excluded.
 */
export function listPublicSpecs(): Flow[] {
  const dir = catalogDir()
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''))
    .sort()
  return ids.map((id) => loadYamlFromCatalog(id)).filter((s) => !s.experimental)
}
