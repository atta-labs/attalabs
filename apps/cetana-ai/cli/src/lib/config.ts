import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { z } from 'zod'

// CLI config schema — superset of the coordinator's schema.
// Uses the same field names so configs are interchangeable.
export const CliConfigSchema = z.object({
  github: z.object({
    owner: z.string(),
    repo: z.string(),
    token: z.string().optional()
  }),
  defaults: z
    .object({
      claudeModel: z.string().default('anthropic/balanced'),
      permissionMode: z.enum(['default', 'acceptEdits']).default('acceptEdits')
    })
    .default({}),
  paths: z
    .object({
      worktreeBase: z.string().optional(),
      cetanaHome: z.string().optional()
    })
    .optional(),
  repoPath: z.string().optional()
})

export type CliConfig = z.infer<typeof CliConfigSchema>

const GLOBAL_CETANA_HOME = join(homedir(), '.cetana')
const GLOBAL_CONFIG_PATH = join(GLOBAL_CETANA_HOME, 'config.json')
const LOCAL_CONFIG_FILENAME = '.cetana.json'

/**
 * Walk up from cwd looking for .cetana.json. Returns null if not found.
 */
function findLocalConfig(): string | null {
  let dir = process.cwd()
  while (true) {
    const candidate = join(dir, LOCAL_CONFIG_FILENAME)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Returns the path to the active config file:
 * - Repo-local .cetana.json (if found in parent hierarchy)
 * - Global ~/.cetana/config.json
 * - null if neither exists
 */
export function configPath(): string | null {
  const local = findLocalConfig()
  if (local) return local
  if (existsSync(GLOBAL_CONFIG_PATH)) return GLOBAL_CONFIG_PATH
  return null
}

/**
 * Hierarchical config loader:
 * 1. Repo-local .cetana.json (walk up from cwd)
 * 2. Global ~/.cetana/config.json
 * 3. null if neither exists
 */
export function loadConfig(): CliConfig | null {
  const path = configPath()
  if (!path) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'))
    return CliConfigSchema.parse(raw)
  } catch {
    return null
  }
}

/**
 * Write config to local or global location.
 * - 'local': writes <cwd>/.cetana.json
 * - 'global': writes ~/.cetana/config.json
 */
export function writeConfig(scope: 'local' | 'global', config: CliConfig, repoRoot?: string): void {
  let targetPath: string
  if (scope === 'local') {
    const base = repoRoot ?? process.cwd()
    targetPath = join(base, LOCAL_CONFIG_FILENAME)
  } else {
    if (!existsSync(GLOBAL_CETANA_HOME)) {
      mkdirSync(GLOBAL_CETANA_HOME, { recursive: true })
    }
    targetPath = GLOBAL_CONFIG_PATH
  }
  writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8')
}

export { GLOBAL_CETANA_HOME, GLOBAL_CONFIG_PATH, LOCAL_CONFIG_FILENAME }
