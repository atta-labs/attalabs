// `vinaya init` + `vinaya init product` — the non-destructive installer.
//
// Contract: detect (git repo + gh auth) → build the typed op set
// → render the COMPLETE diff → confirm (unless --yes) → apply forward, and
// record ownership into the `managed` manifest so `vinaya eject` can reverse
// it exactly. `--dry-run` prints that same diff and writes nothing. Nothing
// runs on package install (no postinstall); PATH is never touched; branch
// protection is printed, never applied.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildInitOps, buildInitProductOps, CONFIG_PATH, type HookDir, type InitContext } from '../lib/artifacts.js'
import { detectVendoredVinaya } from '../lib/self-host.js'
import { type ManagedManifest, VinayaConfigSchema } from '../lib/config.js'
import {
  checkGhAuth,
  customHooksPath,
  detectGitRepo,
  ghLabelGateway,
  type RepoInfo,
  resolveHookDir
} from '../lib/detect.js'
import { applyInstall, type LabelGateway, planInstall, renderInstallDiff } from '../lib/ops.js'
import { closeStdin, promptYesNo } from '../lib/prompt.js'
import { applyRegistryRow, planRegistryRow, renderRegistryRowDiffLine } from '../lib/registry-write.js'

export type InitDeps = {
  detectRepo: () => Promise<RepoInfo | null>
  checkGhAuth: () => Promise<boolean>
  labelGateway: (repoRoot: string) => LabelGateway
  hookDirFor: (repoRoot: string) => HookDir
  customHooksPath: (repoRoot: string) => Promise<string | null>
  confirm: (question: string) => Promise<boolean>
}

function realDeps(): InitDeps {
  return {
    detectRepo: detectGitRepo,
    checkGhAuth,
    labelGateway: ghLabelGateway,
    hookDirFor: resolveHookDir,
    customHooksPath,
    confirm: async (q) => {
      const yes = await promptYesNo(q, false)
      closeStdin()
      return yes
    }
  }
}

type Flags = { dryRun: boolean; yes: boolean }
function flags(args: string[]): Flags {
  return { dryRun: args.includes('--dry-run'), yes: args.includes('--yes') }
}

/** A product name must be a safe slug — it becomes a path segment + a manifest record. */
const PRODUCT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/

/**
 * Read the manifest of a prior install directly from `<repoRoot>/
 * vinaya.config.json` — NOT via the cwd-walking loadConfig(), which would find
 * an ancestor repo's config when init runs against a nested fixture path.
 */
function readManifest(repoRoot: string): ManagedManifest | null {
  const p = join(repoRoot, CONFIG_PATH)
  if (!existsSync(p)) return null
  try {
    return VinayaConfigSchema.parse(JSON.parse(readFileSync(p, 'utf-8'))).managed ?? null
  } catch {
    return null
  }
}

/** Write vinaya.config.json's seed with the ownership manifest injected. */
function writeManifest(repoRoot: string, manifest: ManagedManifest): void {
  const configAbs = join(repoRoot, CONFIG_PATH)
  const seed = JSON.parse(readFileSync(configAbs, 'utf-8'))
  writeFileSync(configAbs, `${JSON.stringify({ ...seed, managed: manifest }, null, 2)}\n`, 'utf-8')
}

// ---------------------------------------------------------------------------
// vinaya init
// ---------------------------------------------------------------------------
export async function runInit(args: string[], deps: InitDeps): Promise<number> {
  const { dryRun, yes } = flags(args)

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya init` from inside your repo.')
    return 1
  }

  // A non-standard core.hooksPath is the one hook shape we refuse to guess at
  // (Section 10 stop condition — do not invent a hook manager).
  const custom = await deps.customHooksPath(repo.repoRoot)
  if (custom) {
    console.error(`Error: this repo routes git hooks through a custom core.hooksPath (${custom}).`)
    console.error(
      'Vinaya will not guess at a non-standard hook layout. Set core.hooksPath to .husky or unset it, then re-run.'
    )
    return 1
  }

  // No `origin` remote (or it isn't a GitHub URL) — `detectGitRepo` already
  // tried and left owner/repo blank. Labels are the only op that reaches the
  // forge, so a remoteless repo can install everything else; warn and skip
  // label creation (and the gh-auth requirement it exists for) instead of
  // crashing mid-run on the first `gh label create` (spec D3).
  const noRemote = !repo.owner || !repo.repo
  if (noRemote) {
    console.warn(
      'Warning: no `origin` remote (or it is not a GitHub URL) — skipping label creation. ' +
        'Re-run `vinaya init` after adding a GitHub remote to create the recommended labels.'
    )
  }

  // gh auth is required to create labels; a real install needs it. A dry run
  // shows the plan without touching the forge, and a remoteless repo has no
  // labels to create, so neither needs it.
  if (!dryRun && !noRemote) {
    const authed = await deps.checkGhAuth()
    if (!authed) {
      console.error('Error: GitHub CLI is not authenticated. Run `gh auth login` first (or use --dry-run to preview).')
      return 1
    }
  }

  const ctx: InitContext = {
    owner: repo.owner,
    repo: repo.repo,
    hookDir: deps.hookDirFor(repo.repoRoot),
    selfHost: detectVendoredVinaya(repo.repoRoot)
  }
  const allOps = buildInitOps(ctx)
  const ops = noRemote ? allOps.filter((op) => op.kind !== 'create-label') : allOps
  const owned = new Set(readManifest(repo.repoRoot)?.files ?? [])
  const plan = planInstall(ops, repo.repoRoot, owned)

  process.stdout.write('vinaya init — the full diff of every intended change:\n\n')
  process.stdout.write(`${renderInstallDiff(plan)}\n`)

  if (dryRun) {
    process.stdout.write('--dry-run: nothing was written.\n')
    return 0
  }

  if (!yes) {
    const ok = await deps.confirm('Install these changes?')
    if (!ok) {
      process.stdout.write('Aborted. Nothing was written.\n')
      return 0
    }
  }

  // Persist the files+blocks manifest as soon as they are on disk (before the
  // network-bound label creation), so a label-create failure can never orphan
  // the written files with no ownership record.
  const manifest = await applyInstall(plan, repo.repoRoot, deps.labelGateway(repo.repoRoot), (m) =>
    writeManifest(repo.repoRoot, m)
  )
  writeManifest(repo.repoRoot, manifest)

  process.stdout.write('\nVinaya installed. Next: run `vinaya demo break` to see a refusal-then-fix in action.\n')
  return 0
}

// ---------------------------------------------------------------------------
// vinaya init product <name>
// ---------------------------------------------------------------------------
/** `--path <value>` — the product's home folder, declared not derived (matches `aeg-root/projects.md`'s own doctrine). Defaults to repo root. */
function pathFlag(args: string[]): string {
  const i = args.indexOf('--path')
  return i !== -1 && args[i + 1] ? (args[i + 1] as string) : '.'
}

/**
 * Unlike `name` (checked against the strict `PRODUCT_NAME_RE` slug before
 * use), `--path` is written raw into a `.vinaya/projects.md` markdown table
 * row (`registry-write.ts`'s `rowLine`) — a `|` or newline in it would
 * corrupt the table or splice in an extra fake row. Not a trust-boundary
 * issue (local CLI, operator-supplied input, same trust level as
 * hand-editing the file), but cheap to reject outright.
 */
const PATH_INJECTION_RE = /[|\r\n]/
function validPathFlag(path: string): boolean {
  return !PATH_INJECTION_RE.test(path)
}

export async function runInitProduct(args: string[], deps: InitDeps): Promise<number> {
  const { dryRun, yes } = flags(args)
  const name = args.filter((a) => !a.startsWith('--'))[0]
  if (!name) {
    console.error('Usage: vinaya init product <name> [--path <path>]')
    return 2
  }
  const productPath = pathFlag(args)
  if (!validPathFlag(productPath)) {
    console.error("Error: --path must not contain '|' or a newline (it is written into a markdown table row).")
    return 2
  }
  const specsPath = productPath === '.' ? 'specs/' : `${productPath}/specs/`
  // Strict slug — the name becomes a filesystem path segment
  // (governance/products/<name>/…) and a manifest record, so a `..` or path
  // separator would let user input escape the intended directory.
  if (!PRODUCT_NAME_RE.test(name)) {
    console.error(
      `Error: invalid product name '${name}'. Use a lower-case slug: letters, digits, and hyphens (e.g. mobile, web-app).`
    )
    return 2
  }

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya init product` from inside your repo.')
    return 1
  }

  // `init product` extends an already-initialized repo. `vinaya.config.json`
  // in the ownership manifest is the marker that init has run (the governance/
  // projects registry that used to serve as the marker is cut — minimal
  // manifest re-ruling).
  const existing = readManifest(repo.repoRoot)
  if (!existing?.files.includes(CONFIG_PATH)) {
    console.error('Error: this repo is not Vinaya-initialized yet. Run `vinaya init` first.')
    return 1
  }

  // A missing/non-GitHub remote only blocks the LABEL (the one forge-reaching
  // op) — the `.vinaya/projects.md` row is a pure local write, so it still
  // happens (spec D3 was scoped to "the only op here is a label", which
  // stopped being true once this command started writing the registry too).
  const noRemote = !repo.owner || !repo.repo
  if (noRemote) {
    console.warn(
      'Warning: no `origin` remote (or it is not a GitHub URL) — skipping label creation. ' +
        `Re-run 'vinaya init product ${name}' after adding a GitHub remote to create it.`
    )
  }

  const ops = noRemote ? [] : buildInitProductOps(name)
  const plan = planInstall(ops, repo.repoRoot, new Set(existing.files))
  const registryPlan = planRegistryRow(repo.repoRoot, name, productPath, specsPath)

  process.stdout.write(`vinaya init product ${name} — the full diff:\n\n`)
  process.stdout.write(`${renderInstallDiff(plan)}\n`)
  process.stdout.write('── Project registry ─────────────────────────────\n')
  process.stdout.write(`${renderRegistryRowDiffLine(registryPlan)}\n\n`)

  if (dryRun) {
    process.stdout.write('--dry-run: nothing was written.\n')
    return 0
  }

  if (!yes) {
    const ok = await deps.confirm(`Scaffold governed product area '${name}'?`)
    if (!ok) {
      process.stdout.write('Aborted. Nothing was written.\n')
      return 0
    }
  }

  applyRegistryRow(repo.repoRoot, registryPlan, name, productPath, specsPath)
  const added = await applyInstall(plan, repo.repoRoot, deps.labelGateway(repo.repoRoot))
  const merged: ManagedManifest = {
    version: existing.version,
    files: [...new Set([...existing.files, ...added.files])],
    blocks: dedupeBlocks([...existing.blocks, ...added.blocks]),
    labels: [...new Set([...existing.labels, ...added.labels])]
  }
  writeManifest(repo.repoRoot, merged)

  process.stdout.write(`\nGoverned product area '${name}' scaffolded.\n`)
  return 0
}

function dedupeBlocks<T extends { path: string; marker: string }>(bs: T[]): T[] {
  const seen = new Set<string>()
  return bs.filter((b) => {
    const k = `${b.path}::${b.marker}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function initCommand(args: string[]): Promise<void> {
  process.exit(await runInit(args, realDeps()))
}

export async function initProductCommand(args: string[]): Promise<void> {
  process.exit(await runInitProduct(args, realDeps()))
}
