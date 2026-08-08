import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { z } from 'zod'

// Rings is the only schema surface this task ships — declarative
// booleans, no conditional logic. Ring 0 (git hooks) and the
// CI/branch-protection guarantee are never represented here, by design.
//
// `checks`: custom-check registration.
// Same discipline — globs (`include`) are permitted for SCOPING, conditionals
// (`if`/`unless`/`except`) are never part of this grammar. Any entry here
// produces the exact same `CheckSpec` shape the built-in registry does
// (`src/checks/registry.ts`) — no privileged field either side can carry.
// `env`: the per-check env-allowlist declaration (see `CheckSpec['env']` in
// `src/checks/contract.ts` for the full grammar). `anyOf` requires >= 2
// unique members — a single-member anyOf is just `true` under a different
// name and would only hide the simpler form. Load-time lint warnings (a
// literal `"true"`/`"false"` string, a high-entropy literal that looks like
// a leaked secret rather than a real config value) are the caller's
// responsibility (`loadConfigChecked`'s callers), not this schema — Zod
// validates SHAPE, never content heuristics.
const EnvEntrySchema = z.union([
  z.literal(true),
  z.object({ optional: z.literal(true) }),
  z.object({ anyOf: z.array(z.string()).min(2) }),
  z.string()
])

const CheckEntrySchema = z
  .object({
    run: z.string(),
    scope: z.enum(['diff', 'full']),
    include: z.array(z.string()).optional(),
    args: z.array(z.string()).optional(),
    timeoutMs: z.number().optional(),
    env: z.record(z.string(), EnvEntrySchema).optional()
  })
  // `anyOf` is keyed BY the variable name it expands to (`{"GITHUB_TOKEN":
  // {"anyOf":["GITHUB_TOKEN","GH_TOKEN"]}}`) — the key must be one of its own
  // members, or the declaration can never actually resolve to that key. Zod's
  // `record` validates each value's shape but has no cross-reference to its
  // own key, hence this refine pass on top.
  .superRefine((entry, ctx) => {
    if (!entry.env) return
    for (const [key, value] of Object.entries(entry.env)) {
      if (typeof value !== 'object' || value === null || !('anyOf' in value)) continue
      const members = value.anyOf
      if (new Set(members).size !== members.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `env.${key}.anyOf has duplicate members`,
          path: ['env', key, 'anyOf']
        })
      }
      if (!members.includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `env.${key}.anyOf must include "${key}" itself as a member`,
          path: ['env', key, 'anyOf']
        })
      }
    }
  })

export type CheckEntry = z.infer<typeof CheckEntrySchema>

const HIGH_ENTROPY_MIN_LENGTH = 20

/** Loose heuristic, not a secret scanner: a long literal mixing char classes with no whitespace reads more like a pasted token than a hand-typed config value. */
function looksHighEntropy(value: string): boolean {
  if (value.length < HIGH_ENTROPY_MIN_LENGTH) return false
  if (/\s/.test(value)) return false
  const classes = [/[a-z]/.test(value), /[A-Z]/.test(value), /[0-9]/.test(value)].filter(Boolean).length
  return classes >= 2
}

/**
 * Load-time lint warnings over `checks[*].env` literal-string forms — never
 * a schema-validation failure (a suspicious literal is still valid config;
 * this is advisory, surfaced by `vinaya check`'s warn output and `vinaya
 * doctor`, never a load-time refusal).
 */
export function lintEnvDeclarations(checks: Record<string, CheckEntry> | undefined): string[] {
  const warnings: string[] = []
  if (!checks) return warnings
  for (const [checkName, entry] of Object.entries(checks)) {
    if (!entry.env) continue
    for (const [key, value] of Object.entries(entry.env)) {
      if (typeof value !== 'string') continue
      if (value === 'true' || value === 'false') {
        warnings.push(
          `check "${checkName}" env.${key} is the literal string "${value}" — did you mean the boolean form \`${key}: true\` (forward the caller's value) rather than a hardcoded literal?`
        )
      } else if (looksHighEntropy(value)) {
        warnings.push(
          `check "${checkName}" env.${key} looks like a high-entropy literal (possible secret committed to config) — env declarations should reference variable NAMES the caller sets, not literal secret values.`
        )
      }
    }
  }
  return warnings
}

// briefSchema: the config-defined brief schema
// the forge-write commands validate a body against. WHICH sections a `pr`/
// `issue` body must carry is expressed HERE, never hardcoded in the command
// code — this repo's required-section set is just one instance (one
// derivation, N consumers). Declarative only: a section is either a named
// battle-tested built-in (backed by an `@atta/aeg-core` validator) or a
// generic heading/field/phrase matcher an adopter authors for their own
// required sections. No conditional grammar (no if/unless/except) —
// any diff-conditionality (lock-ack, premise coverage) lives inside the
// built-in validator's code, never in this config.
export const BRIEF_BUILTINS = [
  'tier',
  'testPlan',
  'testPlanExclusivity',
  'principalPlaceholder',
  'surfaceMap',
  'docUpdateList',
  'worktreeStep0',
  'stopConditions',
  'autonomyClause',
  'project',
  'for',
  'closesN',
  'premiseCoverage',
  'issueRationale'
] as const
export type BriefBuiltin = (typeof BRIEF_BUILTINS)[number]

// A single required section. Discriminated by which key is present:
//   { "builtin": "tier" }             — run the named aeg-core validator
//   { "heading": "Rollback Plan" }    — require a matching `## …` heading
//   { "field": "Ticket" }             — require a `Ticket:` header field
//   { "phrase": "signed-off-by" }     — require a literal phrase anywhere
// `name` is an optional human label for the custom-matcher forms.
const BriefSectionSchema = z.union([
  z.object({ builtin: z.enum(BRIEF_BUILTINS) }),
  z.object({ heading: z.string().min(1), name: z.string().optional() }),
  z.object({ field: z.string().min(1), name: z.string().optional() }),
  z.object({ phrase: z.string().min(1), name: z.string().optional() })
])
export type BriefSection = z.infer<typeof BriefSectionSchema>

const BriefSchemaSchema = z.object({
  pr: z.object({ sections: z.array(BriefSectionSchema) }).optional(),
  issue: z.object({ sections: z.array(BriefSectionSchema) }).optional()
})
export type BriefSchema = z.infer<typeof BriefSchemaSchema>

// `managed`: the ownership manifest
// `vinaya init` writes and `vinaya eject` reads. It records exactly what the
// installer created so eject reverses it precisely — deleting only files it
// created, stripping only blocks it wrote (leaving adopter content), and
// reporting created labels for manual removal (never auto-deleting a label
// that may be in use elsewhere). `files` are whole-file paths vinaya owns;
// `blocks` are marker-delimited managed regions inside adopter-owned files;
// `labels` are the forge labels vinaya created-if-absent. Paths are
// repo-root-relative, forward-slashed. If this manifest is absent or corrupt
// at eject time, eject refuses rather than guessing at ownership.
export const MANAGED_MANIFEST_VERSION = 1

// A recorded ownership path must be a repo-root-relative path that cannot
// escape the repo — no absolute path, no `..` segment. This is the parse-layer
// half of the eject-safety guarantee: a hand-edited or malicious manifest
// carrying `../OUTSIDE` fails validation here, so `eject`'s readManifest sees a
// corrupt manifest and refuses rather than deleting outside the repo. The
// runtime containment check in lib/ops.ts is the belt-and-suspenders half.
export function isSafeRepoRelPath(p: string): boolean {
  if (p.length === 0) return false
  if (p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p)) return false // absolute
  return p.split(/[\\/]/).every((seg) => seg !== '..' && seg !== '')
}
const SafeRepoRelPath = z.string().refine(isSafeRepoRelPath, {
  message: 'must be a repo-root-relative path with no `..` segment or absolute root'
})

const ManagedBlockRecordSchema = z.object({
  path: SafeRepoRelPath,
  marker: z.string(),
  comment: z.enum(['hash', 'html'])
})
export type ManagedBlockRecord = z.infer<typeof ManagedBlockRecordSchema>
// `version` is a plain positive integer, NOT `z.literal(MANAGED_MANIFEST_VERSION)`:
// `vinaya upgrade` must be able to READ a manifest recorded by an older
// package version to migrate it forward, or refuse with a self-explaining
// message when the manifest is NEWER than the installed package understands —
// an exact-literal pin would make either case a schema-parse failure instead
// of a real, diagnosable comparison.
const ManagedManifestSchema = z.object({
  version: z.number().int().positive(),
  files: z.array(SafeRepoRelPath),
  blocks: z.array(ManagedBlockRecordSchema),
  labels: z.array(z.string())
})
export type ManagedManifest = z.infer<typeof ManagedManifestSchema>

export const VinayaConfigSchema = z.object({
  rings: z
    .object({
      ring1_forgeWriteInterception: z.boolean(),
      ring2_asyncAudits: z.boolean()
    })
    .optional(),
  checks: z.record(z.string(), CheckEntrySchema).optional(),
  briefSchema: BriefSchemaSchema.optional(),
  managed: ManagedManifestSchema.optional()
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
 * `checks` registration from the global config is explicitly out of scope
 * (spec chapter, "Explicitly out of scope for this design") — stripped at
 * config-*loading* time, never resolved, with a loud warning naming the
 * file. This is what keeps the resolver itself source-blind: it takes one
 * `config` parameter with no notion of "this came from global vs. local,"
 * because every caller already sees an already-stripped config.
 *
 * There is no `roles` key to strip yet — `VinayaConfigSchema` has no `roles`
 * field, so a global config's hypothetical `roles` key is already silently
 * dropped by Zod's default parse behavior (unknown keys are stripped, no
 * `.passthrough()` on `VinayaConfigSchema`). A `roles` field belongs to a
 * later task, not this one.
 */
function stripGlobalChecks(config: VinayaConfig, path: string): VinayaConfig {
  if (path !== GLOBAL_CONFIG_PATH || !config.checks || Object.keys(config.checks).length === 0) return config
  console.error(
    `⚠ ${path}: "checks" registration in the global config is ignored — checks may only be registered from a repo-local vinaya.config.json.`
  )
  return { ...config, checks: undefined }
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
    return stripGlobalChecks(VinayaConfigSchema.parse(raw), path)
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
  return { ok: true, config: stripGlobalChecks(parsed.data, path) }
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
