import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { PRINCIPAL_ALLOWLIST } from '@atta/aeg-core'

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
    env: z.record(z.string(), EnvEntrySchema).optional(),
    requiresOpenPr: z.boolean().optional()
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
  managed: ManagedManifestSchema.optional(),
  // GitHub logins trusted as this repo's own principals for review-gate
  // verdict-author verification and actor-verified waiver labels
  // (`vinaya/waiver:docs`, `vinaya/waiver:review`) — overrides the hardcoded
  // `PRINCIPAL_ALLOWLIST` (this monorepo's own principal) when set. Repo-local
  // only, same as `checks` — stripped from a global config below, since who
  // counts as a trusted approver must come from the reviewed, committed
  // per-repo file, never a machine-wide personal config.
  principals: z.array(z.string()).min(1).optional()
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
 * Shared with `vinaya doctor`'s permanent diagnostic (Part 4) so the
 * stderr-at-load-time warning and the doctor finding can never say something
 * different about the same fact.
 */
export function globalChecksIgnoredWarning(path: string): string {
  return `${path}: "checks" registration in the global config is ignored — checks may only be registered from a repo-local vinaya.config.json.`
}

/** Same reasoning as `globalChecksIgnoredWarning` — a trust decision must come from the reviewed, committed repo file, never a machine-wide personal config. */
export function globalPrincipalsIgnoredWarning(path: string): string {
  return `${path}: "principals" in the global config is ignored — principals may only be declared from a repo-local vinaya.config.json.`
}

/**
 * `checks` and `principals` from the global config are both explicitly out
 * of scope for it (`checks`: spec chapter, "Explicitly out of scope for this
 * design"; `principals`: a trust decision, same reasoning as
 * `globalPrincipalsIgnoredWarning`) — both stripped at config-*loading* time,
 * never resolved, each with its own loud warning naming the file. This is
 * what keeps the resolver itself source-blind: it takes one `config`
 * parameter with no notion of "this came from global vs. local," because
 * every caller already sees an already-stripped config.
 *
 * There is no `roles` key to strip yet — `VinayaConfigSchema` has no `roles`
 * field, so a global config's hypothetical `roles` key is already silently
 * dropped by Zod's default parse behavior (unknown keys are stripped, no
 * `.passthrough()` on `VinayaConfigSchema`). A `roles` field belongs to a
 * later task, not this one.
 */
function stripGlobalOnlyKeys(config: VinayaConfig, path: string): VinayaConfig {
  if (path !== GLOBAL_CONFIG_PATH) return config
  let result = config
  if (result.checks && Object.keys(result.checks).length > 0) {
    console.error(`⚠ ${globalChecksIgnoredWarning(path)}`)
    result = { ...result, checks: undefined }
  }
  if (result.principals && result.principals.length > 0) {
    console.error(`⚠ ${globalPrincipalsIgnoredWarning(path)}`)
    result = { ...result, principals: undefined }
  }
  return result
}

/**
 * Resolves the trusted-principal allowlist for this repo: the repo-local
 * `principals` field when set, else `PRINCIPAL_ALLOWLIST` (this monorepo's
 * own hardcoded default — unaffected when no config sets `principals`, the
 * every-existing-install-stays-identical case). Shared by every check bin
 * that verifies a review verdict or a waiver-label actor, so they can never
 * resolve this differently from each other.
 *
 * **Callers MUST pass a config loaded from the base ref (`loadConfigFromRef`),
 * never `loadConfig()`/the PR branch's own working tree.** `principals` names
 * who is trusted to approve a merge — reading it from the PR being evaluated
 * lets that same PR redefine its own trust anchor and then self-approve
 * (security finding, PR #862 review: a PR that edits `vinaya.config.json` to
 * add its own author, then posts its own `VERDICT: APPROVE`/`PASS` comment,
 * passed review-gate against itself). Reading from the base ref instead means
 * changing who is trusted still requires an EXISTING principal's approval —
 * the change only takes effect for PRs opened after it merges.
 */
export function resolvePrincipalAllowlist(config: VinayaConfig | null): string[] {
  return config?.principals ?? PRINCIPAL_ALLOWLIST
}

/**
 * The ONLY ref every trust-anchor read (`resolvePrincipalAllowlist` via
 * `loadConfigFromRef`) may use. A literal constant, never taken from an env
 * var, CLI flag, or anything else a workflow's own YAML could set.
 *
 * **Security finding, second pass on PR #862's own fix:** the first cut of
 * `loadConfigFromRef` accepted a `BASE_SHA` env var as an override (mirroring
 * `check-doc-coverage.ts`'s pre-existing, legitimate diff-scoping use of
 * `BASE_SHA`). That reopened the exact hole it closed, one layer removed:
 * `checksWorkflow()`/`reviewWorkflow()` run on the plain `pull_request`
 * trigger (not `pull_request_target`), so GitHub executes the workflow YAML
 * AS IT EXISTS IN THE PR'S OWN HEAD — a PR can add `BASE_SHA:
 * ${{ github.event.pull_request.head.sha }}` to its own copy of the
 * generated workflow file, in the same diff that edits `principals`, and
 * `loadConfigFromRef` would then read the attacker's own head instead of the
 * real base — full self-approval bypass again, just moved one indirection
 * later. The fix is not a smarter default; it is that trust-anchor
 * resolution must never accept a caller-supplied ref AT ALL. `origin/main`
 * (the literal git ref, fetched via `actions/checkout@v4`'s `fetch-depth: 0`
 * from GitHub's own protected remote state) cannot be rewritten by a PR —
 * only someone with actual push access to `main` can move it, a completely
 * different privilege boundary than "can open a PR."
 *
 * `check-doc-coverage.ts`/`check-doc-coverage-push.ts` keep their own,
 * separate, still-overridable `BASE_SHA` for diff-SCOPING (which files count
 * as "changed") — that is not a trust decision, and conflating the two was
 * the mistake. Never reuse that variable for a principals/trust read.
 */
export const TRUST_ANCHOR_REF = 'origin/main'

/**
 * Reads `vinaya.config.json` as committed at `ref` — via `git show`, never
 * the working tree — so a trust-anchor read (`resolvePrincipalAllowlist`)
 * can be pinned to the base branch regardless of what the PR being evaluated
 * has changed locally. Malformed/unparseable content, or the file simply not
 * existing at that ref (a fresh repo whose first PR adds `vinaya.config.json`
 * for the first time), both resolve to `null` — the safe direction: a
 * caller combining this with `resolvePrincipalAllowlist` falls back to the
 * hardcoded `PRINCIPAL_ALLOWLIST`, never to trusting unreviewed content.
 *
 * `ref` must be `TRUST_ANCHOR_REF` for every principals-resolution caller —
 * this function stays generic (any ref) because `config.test.ts` also uses
 * it to exercise an arbitrary SHA, but no CheckSpec may ever forward an env
 * var into it. See `TRUST_ANCHOR_REF`'s own doc comment for why.
 */
export function loadConfigFromRef(ref: string): VinayaConfig | null {
  try {
    const raw = execFileSync('git', ['show', `${ref}:${LOCAL_CONFIG_FILENAME}`], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const parsed = VinayaConfigSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
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
    return stripGlobalOnlyKeys(VinayaConfigSchema.parse(raw), path)
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
  return { ok: true, config: stripGlobalOnlyKeys(parsed.data, path) }
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
