// `vinaya init` + `vinaya init product` — the non-destructive installer.
//
// Contract (D-084/D-089): detect (git repo + gh auth) → build the typed op set
// → render the COMPLETE diff → confirm (unless --yes) → apply forward, and
// record ownership into the `managed` manifest so `vinaya eject` can reverse
// it exactly. `--dry-run` prints that same diff and writes nothing. Nothing
// runs on package install (no postinstall); PATH is never touched; branch
// protection is printed, never applied (D-091).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildInitOps,
  buildInitProductOps,
  CONFIG_PATH,
  type HookDir,
  type InitContext,
  PROJECTS_PATH
} from '../lib/artifacts.js'
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

  // gh auth is required to create labels; a real install needs it. A dry run
  // shows the plan without touching the forge, so it does not.
  if (!dryRun) {
    const authed = await deps.checkGhAuth()
    if (!authed) {
      console.error('Error: GitHub CLI is not authenticated. Run `gh auth login` first (or use --dry-run to preview).')
      return 1
    }
  }

  const ctx: InitContext = { owner: repo.owner, repo: repo.repo, hookDir: deps.hookDirFor(repo.repoRoot) }
  const ops = buildInitOps(ctx)
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

  const manifest = await applyInstall(plan, repo.repoRoot, deps.labelGateway(repo.repoRoot))
  writeManifest(repo.repoRoot, manifest)

  process.stdout.write('\nVinaya installed. Next: run `vinaya demo break` to see a refusal-then-fix in action.\n')
  return 0
}

// ---------------------------------------------------------------------------
// vinaya init product <name>
// ---------------------------------------------------------------------------
export async function runInitProduct(args: string[], deps: InitDeps): Promise<number> {
  const { dryRun, yes } = flags(args)
  const name = args.filter((a) => !a.startsWith('--'))[0]
  if (!name) {
    console.error('Usage: vinaya init product <name>')
    return 2
  }

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya init product` from inside your repo.')
    return 1
  }

  // `init product` extends an already-initialized repo (monorepo only). The
  // projects registry is the marker that init has run.
  const existing = readManifest(repo.repoRoot)
  if (!existing?.files.includes(PROJECTS_PATH)) {
    console.error('Error: this repo is not Vinaya-initialized yet. Run `vinaya init` first.')
    return 1
  }

  const ops = buildInitProductOps(name)
  const plan = planInstall(ops, repo.repoRoot, new Set(existing.files))

  process.stdout.write(`vinaya init product ${name} — the full diff:\n\n`)
  process.stdout.write(`${renderInstallDiff(plan)}\n`)

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
