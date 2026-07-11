import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { z } from 'zod'

// D-117: rings is the only schema surface this task ships — declarative
// booleans, no conditional logic (D-092/D-109). Ring 0 (git hooks) and the
// CI/branch-protection guarantee are never represented here, by design.
export const VinayaConfigSchema = z.object({
  rings: z
    .object({
      ring1_forgeWriteInterception: z.boolean(),
      ring2_asyncAudits: z.boolean()
    })
    .optional()
})

export type VinayaConfig = z.infer<typeof VinayaConfigSchema>

const GLOBAL_VINAYA_HOME = join(homedir(), '.vinaya')
const GLOBAL_CONFIG_PATH = join(GLOBAL_VINAYA_HOME, 'config.json')
const LOCAL_CONFIG_FILENAME = 'vinaya.config.json'

/**
 * Walk up from cwd looking for vinaya.config.json. Returns null if not found.
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
 * - Repo-local vinaya.config.json (if found in parent hierarchy)
 * - Global ~/.vinaya/config.json
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
 * 1. Repo-local vinaya.config.json (walk up from cwd)
 * 2. Global ~/.vinaya/config.json
 * 3. null if neither exists
 */
export function loadConfig(): VinayaConfig | null {
  const path = configPath()
  if (!path) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'))
    return VinayaConfigSchema.parse(raw)
  } catch {
    return null
  }
}

/**
 * Write config to local or global location.
 * - 'local': writes <cwd>/vinaya.config.json
 * - 'global': writes ~/.vinaya/config.json
 */
export function writeConfig(scope: 'local' | 'global', config: VinayaConfig, repoRoot?: string): void {
  let targetPath: string
  if (scope === 'local') {
    const base = repoRoot ?? process.cwd()
    targetPath = join(base, LOCAL_CONFIG_FILENAME)
  } else {
    if (!existsSync(GLOBAL_VINAYA_HOME)) {
      mkdirSync(GLOBAL_VINAYA_HOME, { recursive: true })
    }
    targetPath = GLOBAL_CONFIG_PATH
  }
  writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8')
}

export { GLOBAL_VINAYA_HOME, GLOBAL_CONFIG_PATH, LOCAL_CONFIG_FILENAME }
