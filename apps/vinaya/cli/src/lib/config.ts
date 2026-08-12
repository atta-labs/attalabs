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
 * **Callers MUST pass `loadTrustAnchorConfig()`, never `loadConfig()`, and
 * never any config derived from local git or the working tree.** `principals`
 * names who is trusted to approve a merge; anything the PR being evaluated can
 * reach is something it can rewrite. See `loadTrustAnchorConfig`'s own doc
 * comment for the three failed attempts that established this rule, and for
 * why branch protection — not this function — is the actual boundary.
 */
export function resolvePrincipalAllowlist(config: VinayaConfig | null): string[] {
  return config?.principals ?? PRINCIPAL_ALLOWLIST
}

/**
 * ⚠️ **Read this before changing anything about how `principals` is
 * resolved.** Three consecutive attempts at this got it wrong, each fixing
 * the previous one's lever while leaving the same class open (PR #862's own
 * review rounds 1-3):
 *
 *   1. `loadConfig()` — read the PR's own working tree. A PR added its author
 *      to `principals` and self-approved.
 *   2. `git show ${BASE_SHA}:...` — `BASE_SHA` was an env var, and a
 *      `pull_request`-triggered workflow runs the PR's OWN copy of the
 *      workflow YAML, so the PR set `BASE_SHA` to its own head SHA.
 *   3. `git show origin/main:...` with a hardcoded ref — but `origin/main` is
 *      a LOCAL remote-tracking ref inside the job's own disk, and the PR's own
 *      workflow YAML can run `git update-ref refs/remotes/origin/main HEAD`
 *      before this check's step. Reproduced live; the doc comment claiming
 *      "only push access to `main` can move it" conflated that local ref with
 *      the real protected branch on GitHub.
 *
 * The lesson those three share: **inside a `pull_request`-triggered workflow,
 * NOTHING reachable from the job's own filesystem or environment is a trust
 * boundary against the PR author** — the workflow definition itself comes
 * from the PR. So the config CONTENT is read from **GitHub's API**, which
 * serves the repository's default-branch bytes from server-side state the PR
 * cannot touch, rather than from local git or the working tree.
 *
 * **Precisely scoped claim, because the previous two rounds were undone by
 * overclaiming:** the CONTENT is server-side; the repository IDENTITY used to
 * address that API call still comes from `trustAnchorRepo()`, which reads
 * `GITHUB_REPOSITORY` (set by the Actions runner) and falls back to the
 * `origin` remote URL. Both are PR-influenceable in principle. That is
 * deliberate and not a practical lever: where a PR controls the workflow YAML
 * it already holds a strictly stronger primitive (delete the step entirely),
 * and where the YAML is trusted the runner sets `GITHUB_REPOSITORY` correctly
 * so the remote fallback is never reached. The precedence order is therefore
 * load-bearing — runner value first, remote only as a local-dev fallback —
 * and must not be reordered.
 *
 * **This raises the bar; it is not, by itself, the boundary.** A PR can still
 * edit its own copy of the generated workflow to delete this step, `exit 0`,
 * or otherwise not run the gate at all. The thing that actually makes review
 * enforcement unbypassable is **GitHub branch protection with this check
 * marked as a required status check** — a required check that never reports
 * leaves the PR unmergeable, and that rule lives in repository settings,
 * outside any PR's reach. `vinaya init` prints the branch-protection
 * recommendation and `vinaya doctor` reports when it is missing; an adopter
 * setting `principals` without branch protection has a useful convention, not
 * a security control, and the docs must never imply otherwise.
 */
export type TrustAnchorFetcher = () => string

/**
 * Repo identity for the trust-anchor read. **Order is load-bearing:** the
 * Actions runner's own `GITHUB_REPOSITORY` first (correct and authoritative
 * in the only context where this is a trust decision), the `origin` remote
 * only as a local-dev fallback. See `loadTrustAnchorConfig`'s doc comment for
 * why neither is a practical attack lever.
 */
function trustAnchorRepo(): string | null {
  const fromRunner = process.env.GITHUB_REPOSITORY
  if (fromRunner && /^[^/]+\/[^/]+$/.test(fromRunner)) return fromRunner
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
    const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
    return m?.[1] && m[2] ? `${m[1]}/${m[2]}` : null
  } catch {
    return null
  }
}

/**
 * Fetches `vinaya.config.json` from the repository's DEFAULT BRANCH via the
 * GitHub API — no `ref` parameter, so GitHub itself picks the default branch
 * from server-side repo settings. The returned CONTENT never comes from local
 * git or the working tree; only the repo identity does (`trustAnchorRepo`).
 */
function ghFetchTrustAnchorConfig(): string {
  const repo = trustAnchorRepo()
  if (!repo) throw new Error('could not resolve repo identity for the trust-anchor read')
  return execFileSync('gh', ['api', `repos/${repo}/contents/${LOCAL_CONFIG_FILENAME}`, '--jq', '.content'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

/**
 * The trust-anchor config — `vinaya.config.json` as it exists on the
 * repository's default branch per GitHub's own API, never the PR's checkout.
 * The ONLY sanctioned input to `resolvePrincipalAllowlist` in any check.
 *
 * Every failure mode (no repo identity, `gh` unauthenticated or unreachable,
 * file absent on the default branch, malformed JSON, schema mismatch) returns
 * `null`, which `resolvePrincipalAllowlist` turns into the hardcoded
 * `PRINCIPAL_ALLOWLIST` — never into trusting unreviewed content. A local run
 * with no `gh` auth therefore behaves exactly as it did before `principals`
 * existed.
 *
 * That fallback announces itself rather than degrading silently: an adopter
 * whose `principals` failed to resolve would otherwise see their own
 * reviewers' verdicts ignored for no visible reason — precisely the baffling
 * gate failure this field exists to eliminate (review finding, PR #862 round
 * 4). Two deliberate constraints on that message:
 *
 *   - It goes to **stdout, never stderr.** A check bin's stderr IS the
 *     `CheckError` JSON channel (`checks/runner.ts` parses every non-blank
 *     stderr line and marks the check `status: 'error'` on anything that
 *     isn't a valid `CheckError`), so a plain-text warning there would turn
 *     every fetch hiccup into a spurious check failure. `contract.ts` reserves
 *     stdout for exactly this kind of human-readable chatter.
 *   - A **missing file is silent.** A repo whose default branch has no
 *     `vinaya.config.json` yet (a fresh adopter, or the very install PR that
 *     adds it) is an ordinary state, not a fault worth warning about.
 *
 * `fetcher` is injectable for tests ONLY; production callers pass nothing.
 */
function isMissingFileError(message: string): boolean {
  return /404|not found/i.test(message)
}

export function loadTrustAnchorConfig(fetcher: TrustAnchorFetcher = ghFetchTrustAnchorConfig): VinayaConfig | null {
  const warn = (why: string) =>
    process.stdout.write(
      `⚠ could not read \`principals\` from the default branch (${why}) — falling back to vinaya's built-in principal allowlist.\n`
    )

  let base64: string
  try {
    base64 = fetcher().trim()
  } catch (err) {
    const message = (err as Error).message.split('\n')[0] ?? 'unknown error'
    if (!isMissingFileError(message)) warn(message)
    return null
  }
  if (!base64) return null
  try {
    const raw = Buffer.from(base64, 'base64').toString('utf-8')
    const parsed = VinayaConfigSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
    warn('it did not satisfy the config schema')
    return null
  } catch {
    warn('it was not readable as JSON')
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
