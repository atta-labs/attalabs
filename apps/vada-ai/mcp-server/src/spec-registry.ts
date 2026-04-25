import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSpec } from '@atta/engine'
import type { DeliberationSpec } from '@atta/engine'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const YAMLS_DIR = join(__dirname, '../../../yamls')

function loadYaml(filename: string): DeliberationSpec {
  const content = readFileSync(join(YAMLS_DIR, filename), 'utf-8')
  return loadSpec(content)
}

// Load all specs at module init — held in memory for the server lifetime.
// Fails fast if any YAML is malformed (startup error is preferable to runtime error).
const SPECS: Record<string, DeliberationSpec> = {
  'crucible-v1': loadYaml('crucible-v1.yaml'),
  'sparring-v1': loadYaml('sparring-v1.yaml'),
  'war-room-v1': loadYaml('war-room-v1.yaml'),
  'a0-baseline-v1': loadYaml('a0-baseline-v1.yaml'),
  'a1-baseline-v1': loadYaml('a1-baseline-v1.yaml'),
  'brokered-trio-v1': loadYaml('brokered-trio-v1.yaml'),
  'brokered-quartet-v1': loadYaml('brokered-quartet-v1.yaml')
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
