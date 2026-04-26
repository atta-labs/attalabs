import { loadYamlFromCatalog } from '@atta/engine'
import type { DeliberationSpec } from '@atta/engine'

// Load all specs at module init — held in memory for the server lifetime.
// Fails fast if any YAML is malformed (startup error is preferable to runtime error).
const SPECS: Record<string, DeliberationSpec> = {
  'crucible-v1': loadYamlFromCatalog('crucible-v1'),
  'sparring-v1': loadYamlFromCatalog('sparring-v1'),
  'war-room-v1': loadYamlFromCatalog('war-room-v1'),
  'a0-baseline-v1': loadYamlFromCatalog('a0-baseline-v1'),
  'a1-baseline-v1': loadYamlFromCatalog('a1-baseline-v1'),
  'brokered-trio-v1': loadYamlFromCatalog('brokered-trio-v1'),
  'brokered-quartet-v1': loadYamlFromCatalog('brokered-quartet-v1')
}

// Name aliases: maps MCP-facing short names to spec IDs
const ALIASES: Record<string, string> = {
  sparring: 'sparring-v1',
  crucible: 'crucible-v1',
  'war-room': 'war-room-v1',
  a0: 'a0-baseline-v1',
  a1: 'a1-baseline-v1'
}

export function lookupSpec(nameOrId: string): DeliberationSpec {
  const id = ALIASES[nameOrId] ?? nameOrId
  const spec = SPECS[id]
  if (!spec) {
    const available = Object.keys(SPECS).concat(Object.keys(ALIASES)).join(', ')
    throw new Error(`Unknown spec: '${nameOrId}'. Available: ${available}`)
  }
  return spec
}

export function listPublicSpecs(): DeliberationSpec[] {
  return Object.values(SPECS).filter((s) => !s.experimental)
}
