import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { z } from 'zod'

// D-117: rings is the only schema surface this task ships — declarative
// booleans, no conditional logic (D-092/D-109). Ring 0 (git hooks) and the
// CI/branch-protection guarantee are never represented here, by design.
//
// `checks` (vinaya-cli-v1 task 3, D-092/D-109): custom-check registration.
// Same discipline — globs (`include`) are permitted for SCOPING, conditionals
// (`if`/`unless`/`except`) are never part of this grammar. Any entry here
// produces the exact same `CheckSpec` shape the built-in registry does
// (`src/checks/registry.ts`) — no privileged field either side can carry.
const CheckEntrySchema = z.object({
  run: z.string(),
  scope: z.enum(['diff', 'full']),
  include: z.array(z.string()).optional(),
  args: z.array(z.string()).optional(),
  timeoutMs: z.number().optional()
})

export const VinayaConfigSchema = z.object({
  rings: z
    .object({
      ring1_forgeWriteInterception: z.boolean(),
      ring2_asyncAudits: z.boolean()
    })
    .optional(),
  checks: z.record(z.string(), CheckEntrySchema).optional()
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

export type ConfigLoadResult = { ok: true; config: VinayaConfig | null } | { ok: false; path: string; error: string }

/**
 * Same hierarchical resolution as `loadConfig()`, but surfaces parse/
 * validation failures instead of swallowing them to `null`. `loadConfig()`
 * itself is UNCHANGED — its existing null-on-failure contract has other
 * callers relying on it, and this task does not alter that signature.
 *
 * Used only by the `check` command path: a typo'd `checks` key silently
 * meaning "no custom checks ran" would make `vinaya check --all` print
 * green over a broken registration — this is the loud alternative.
 */
export function loadConfigChecked(): ConfigLoadResult {
  const path = configPath()
  if (!path) return { ok: true, config: null }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    return { ok: false, path, error: `invalid JSON: ${(err as Error).message}` }
  }

  const parsed = VinayaConfigSchema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    return { ok: false, path, error: detail }
  }
  return { ok: true, config: parsed.data }
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
