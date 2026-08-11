// `vinaya upgrade` — regenerate vinaya-owned artifacts to the installed
// package's current generators. The only sanctioned migration path: the
// same detect → plan → render diff → confirm → apply engine `init` uses, but
// inverted in intent — where init never touches an already-owned file,
// upgrade's whole job is bringing an owned-but-stale artifact current.
//
// Adopter-owned content is NEVER touched: `vinaya.config.json`'s semantic
// fields (rings/checks/briefSchema) are the adopter's own and are preserved
// verbatim; only the `managed` ownership manifest inside it is regenerated.
// A file/block vinaya does not own (foreign content, or never installed) is
// left exactly alone — upgrade regenerates what init already owns, it does
// not perform a fresh install.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOC_OWNERS_PATH } from '@atta/aeg-core'
import { buildInitOps, CONFIG_PATH, type HookDir, type InitContext } from '../lib/artifacts.js'
import { MANAGED_MANIFEST_VERSION, type ManagedManifest, VinayaConfigSchema } from '../lib/config.js'
import { detectGitRepo, hookDirFromManifest, type RepoInfo, resolveHookDir } from '../lib/detect.js'
import {
  appendBlock,
  createHost,
  indent,
  markerLines,
  type CreateFileOp,
  type ManagedBlockOp,
  type Op,
  renderBlock,
  stripBlockFromContent,
  writeFileWithDirs
} from '../lib/ops.js'
import { closeStdin, promptYesNo } from '../lib/prompt.js'

export type UpgradeDeps = {
  detectRepo: () => Promise<RepoInfo | null>
  hookDirFor: (repoRoot: string) => HookDir
  confirm: (question: string) => Promise<boolean>
}

function realDeps(): UpgradeDeps {
  return {
    detectRepo: detectGitRepo,
    hookDirFor: resolveHookDir,
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

// ---------------------------------------------------------------------------
// vinaya.config.json — read repoRoot-scoped (never the cwd-walking loader),
// same reasoning as init.ts/eject.ts/doctor.ts.
// ---------------------------------------------------------------------------
type ConfigRead =
  | { kind: 'missing' }
  | { kind: 'invalid'; error: string }
  | { kind: 'not-initialized' }
  | { kind: 'ok'; manifest: ManagedManifest }

function readManifest(repoRoot: string): ConfigRead {
  const p = join(repoRoot, CONFIG_PATH)
  if (!existsSync(p)) return { kind: 'missing' }
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(p, 'utf-8'))
  } catch (err) {
    return { kind: 'invalid', error: `invalid JSON: ${(err as Error).message}` }
  }
  const parsed = VinayaConfigSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      kind: 'invalid',
      error: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    }
  }
  if (!parsed.data.managed) return { kind: 'not-initialized' }
  return { kind: 'ok', manifest: parsed.data.managed }
}

/** Rewrite ONLY the `managed.version` field, preserving every other
 * top-level key (rings/checks/briefSchema — adopter-owned) and the recorded
 * files/blocks/labels arrays (ownership doesn't change from a content
 * regeneration) exactly as they were. */
function writeManifestVersion(repoRoot: string, manifest: ManagedManifest): void {
  const configAbs = join(repoRoot, CONFIG_PATH)
  const seed = JSON.parse(readFileSync(configAbs, 'utf-8'))
  const updated: ManagedManifest = { ...manifest, version: MANAGED_MANIFEST_VERSION }
  writeFileSync(configAbs, `${JSON.stringify({ ...seed, managed: updated }, null, 2)}\n`, 'utf-8')
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------
type FileAction = 'current' | 'regenerate' | 'recreate' | 'refuse-foreign' | 'not-installed' | 'keep'
type BlockAction = 'current' | 'regenerate-block' | 'recreate-append' | 'recreate-host' | 'not-installed'

type UpgradeEntry =
  | { kind: 'create-file'; op: CreateFileOp; action: FileAction }
  | { kind: 'managed-block'; op: ManagedBlockOp; action: BlockAction }

export type UpgradePlan = {
  entries: UpgradeEntry[]
  /** null when the manifest is already at the package's current version. */
  versionMigration: { from: number; to: number } | null
  hasChanges: boolean
}

export function planUpgrade(ops: Op[], repoRoot: string, manifest: ManagedManifest): UpgradePlan {
  const entries: UpgradeEntry[] = []
  let hasChanges = false
  const ownedFiles = new Set(manifest.files)
  const blockKey = (path: string, marker: string) => `${path}::${marker}`
  const ownedBlocks = new Set(manifest.blocks.map((b) => blockKey(b.path, b.marker)))

  for (const op of ops) {
    if (op.kind === 'create-file') {
      const abs = join(repoRoot, op.path)
      const exists = existsSync(abs)
      const owned = ownedFiles.has(op.path)
      let action: FileAction
      if (op.path === CONFIG_PATH || op.path === DOC_OWNERS_PATH) {
        // CONFIG_PATH: semantic content (rings/checks/briefSchema) is
        // adopter-owned; only the `managed` sub-object is regenerated,
        // separately below. DOC_OWNERS_PATH: real bindings are adopter-owned
        // the same way — without this exemption, upgrade would classify any
        // added binding as drift from the pristine empty starter and
        // silently regenerate the file back to empty, destroying it (found
        // live, doctor.ts carries the matching fix).
        action = 'keep'
      } else if (!owned) {
        action = exists ? 'refuse-foreign' : 'not-installed'
      } else if (!exists) {
        action = 'recreate'
        hasChanges = true
      } else if (readFileSync(abs, 'utf-8') !== op.content) {
        action = 'regenerate'
        hasChanges = true
      } else {
        action = 'current'
      }
      entries.push({ kind: 'create-file', op, action })
    } else if (op.kind === 'managed-block') {
      const abs = join(repoRoot, op.path)
      const owned = ownedBlocks.has(blockKey(op.path, op.marker))
      let action: BlockAction
      if (!owned) {
        action = 'not-installed'
      } else if (!existsSync(abs)) {
        action = 'recreate-host'
        hasChanges = true
      } else {
        const content = readFileSync(abs, 'utf-8')
        const { begin, end } = markerLines(op.marker, op.comment)
        if (!(content.includes(begin) && content.includes(end))) {
          action = 'recreate-append'
          hasChanges = true
        } else if (!content.includes(renderBlock(op))) {
          action = 'regenerate-block'
          hasChanges = true
        } else {
          action = 'current'
        }
      }
      entries.push({ kind: 'managed-block', op, action })
    }
    // create-label / print ops are outside upgrade's surface: labels are
    // already create-if-absent idempotent, branch protection is print-only.
  }

  const versionMigration =
    manifest.version === MANAGED_MANIFEST_VERSION ? null : { from: manifest.version, to: MANAGED_MANIFEST_VERSION }
  return { entries, versionMigration, hasChanges: hasChanges || versionMigration !== null }
}

// ---------------------------------------------------------------------------
// Diff rendering
// ---------------------------------------------------------------------------
export function renderUpgradeDiff(plan: UpgradePlan): string {
  const lines: string[] = []

  if (plan.versionMigration) {
    lines.push('── Manifest ─────────────────────────────')
    lines.push(`  ~ migrate manifest version ${plan.versionMigration.from} → ${plan.versionMigration.to}`)
    lines.push('')
  }

  for (const e of plan.entries) {
    if (e.kind === 'create-file') {
      switch (e.action) {
        case 'regenerate':
          lines.push(`  ~ regenerate ${e.op.path}`)
          lines.push(indent(e.op.content))
          break
        case 'recreate':
          lines.push(`  + recreate   ${e.op.path} (recorded as owned but missing on disk)`)
          lines.push(indent(e.op.content))
          break
        case 'current':
          lines.push(`  = current    ${e.op.path}`)
          break
        case 'keep':
          lines.push(`  = keep       ${e.op.path} (adopter-owned content; only the ownership manifest is regenerated)`)
          break
        case 'refuse-foreign':
          lines.push(`  ✖ REFUSE    ${e.op.path} — foreign content at a vinaya path not owned by vinaya; not touched`)
          break
        case 'not-installed':
          lines.push(`  · skip      ${e.op.path} (not installed — that's \`vinaya init\`'s job, not upgrade's)`)
          break
      }
    } else {
      switch (e.action) {
        case 'regenerate-block':
          lines.push(`  ~ regenerate managed block in ${e.op.path}`)
          lines.push(indent(renderBlock(e.op)))
          break
        case 'recreate-append':
          lines.push(`  + restore    managed block in ${e.op.path} (your other lines untouched)`)
          lines.push(indent(renderBlock(e.op)))
          break
        case 'recreate-host':
          lines.push(`  + recreate   ${e.op.path} (recorded as owned but missing on disk — e.g. a fresh clone)`)
          lines.push(indent(`${e.op.hostPreamble ?? ''}${renderBlock(e.op)}`))
          break
        case 'current':
          lines.push(`  = current    ${e.op.path}`)
          break
        case 'not-installed':
          lines.push(`  · skip      ${e.op.path} (not installed — that's \`vinaya init\`'s job, not upgrade's)`)
          break
      }
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
function regenerateBlock(repoRoot: string, op: ManagedBlockOp): void {
  const abs = join(repoRoot, op.path)
  const content = readFileSync(abs, 'utf-8')
  const stripped = stripBlockFromContent(content, op.marker, op.comment)
  if (stripped !== null) {
    writeFileSync(abs, stripped.endsWith('\n') ? stripped : `${stripped}\n`, 'utf-8')
  }
  appendBlock(repoRoot, op)
}

export function applyUpgrade(plan: UpgradePlan, repoRoot: string): void {
  for (const e of plan.entries) {
    if (e.kind === 'create-file') {
      if (e.action === 'regenerate' || e.action === 'recreate') {
        writeFileWithDirs(join(repoRoot, e.op.path), e.op.content, e.op.mode)
      }
    } else {
      if (e.action === 'recreate-host') createHost(repoRoot, e.op)
      else if (e.action === 'recreate-append') appendBlock(repoRoot, e.op)
      else if (e.action === 'regenerate-block') regenerateBlock(repoRoot, e.op)
    }
  }
}

// ---------------------------------------------------------------------------
// vinaya upgrade
// ---------------------------------------------------------------------------
export async function runUpgrade(args: string[], deps: UpgradeDeps): Promise<number> {
  const { dryRun, yes } = flags(args)

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya upgrade` from inside your repo.')
    return 1
  }

  const read = readManifest(repo.repoRoot)
  if (read.kind === 'missing' || read.kind === 'not-initialized') {
    console.error('Error: vinaya is not initialized in this repo. Run `vinaya init` first.')
    return 1
  }
  if (read.kind === 'invalid') {
    console.error(`Error: vinaya.config.json is invalid — ${read.error}`)
    console.error('Fix it before upgrading (upgrade never guesses at a corrupt manifest).')
    return 1
  }

  const { manifest } = read
  if (manifest.version > MANAGED_MANIFEST_VERSION) {
    console.error(
      `Error: this repo's vinaya manifest is version ${manifest.version}, newer than the installed vinaya ` +
        `package understands (version ${MANAGED_MANIFEST_VERSION}). Upgrade the vinaya package itself first, ` +
        'then re-run `vinaya upgrade`.'
    )
    return 1
  }

  const hookDir = hookDirFromManifest(manifest, deps.hookDirFor(repo.repoRoot))
  const ctx: InitContext = { owner: repo.owner, repo: repo.repo, hookDir }
  const ops = buildInitOps(ctx)
  const plan = planUpgrade(ops, repo.repoRoot, manifest)

  if (!plan.hasChanges) {
    process.stdout.write('vinaya upgrade — already current. Nothing to do.\n')
    return 0
  }

  process.stdout.write('vinaya upgrade — the full diff of every intended change:\n\n')
  process.stdout.write(`${renderUpgradeDiff(plan)}\n`)

  if (dryRun) {
    process.stdout.write('\n--dry-run: nothing was written.\n')
    return 0
  }

  if (!yes) {
    const ok = await deps.confirm('Regenerate these vinaya-owned artifacts?')
    if (!ok) {
      process.stdout.write('Aborted. Nothing was written.\n')
      return 0
    }
  }

  applyUpgrade(plan, repo.repoRoot)
  writeManifestVersion(repo.repoRoot, manifest)

  process.stdout.write('\nVinaya upgraded.\n')
  return 0
}

export async function upgradeCommand(args: string[]): Promise<void> {
  process.exit(await runUpgrade(args, realDeps()))
}
