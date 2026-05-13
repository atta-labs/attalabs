import { listPublicSpecs as engineListPublicSpecs, loadYamlFromCatalog } from '@atta/engine'
import type { Flow } from '@atta/engine'

// MCP-only: maps short caller-friendly aliases to canonical spec IDs.
// New YAMLs without aliases are callable by their full ID.
// Only short forms that differ from their canonical id need entries here.
// crucible / sparring / war-room are their own canonical ids now.
const ALIASES: Record<string, string> = {
  a0: 'a0-baseline',
  a1: 'a1-baseline'
}

export function lookupSpec(nameOrId: string): Flow {
  const id = ALIASES[nameOrId] ?? nameOrId
  try {
    return loadYamlFromCatalog(id)
  } catch {
    const available = [...Object.keys(ALIASES), ...Object.keys(ALIASES).map((a) => ALIASES[a])].join(', ')
    throw new Error(`Unknown spec: '${nameOrId}'. Available: ${available}`)
  }
}

export function listPublicSpecs(): Flow[] {
  return engineListPublicSpecs()
}

export function validateAllSpecs(): void {
  const specs = engineListPublicSpecs()
  console.error(`[spec-registry] Validated ${specs.length} public specs`)
}
