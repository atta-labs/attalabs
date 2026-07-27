// `vinaya doctor` — diagnose the full installation. Reads the records `init`
// wrote (see lib/artifacts.ts, lib/ops.ts) and reports drift against them.
//
// Contract (D-089): doctor NEVER mutates. Every code path in this file is
// read-only — no fs write, no `gh` write, no forge mutation. It exists
// precisely because a doctor that "fixes" silently destroys the support
// story; `vinaya upgrade` is the only sanctioned path back to a clean state
// (D-093).

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildInitOps, CONFIG_PATH, DOCTRINE_POINTER_PATH, type HookDir, type InitContext } from '../lib/artifacts.js'
import { type ManagedManifest, type VinayaConfig, VinayaConfigSchema } from '../lib/config.js'
import {
  branchProtectionConfigured,
  detectGitRepo,
  ghAuthStatus,
  type GhAuthStatus,
  hookDirFromManifest,
  type RepoInfo,
  resolveHookDir
} from '../lib/detect.js'
import { printJson } from '../lib/envelope.js'
import { markerLines, renderBlock } from '../lib/ops.js'

export type DoctorDeps = {
  detectRepo: () => Promise<RepoInfo | null>
  ghAuthStatus: () => Promise<GhAuthStatus>
  branchProtectionConfigured: (owner: string, repo: string) => Promise<boolean | null>
  hookDirFor: (repoRoot: string) => HookDir
  nodeVersion: () => string
  bunVersion: () => string | null
  packageVersion: () => string
}

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'))
  return pkg.version
}

function realDeps(): DoctorDeps {
  return {
    detectRepo: detectGitRepo,
    ghAuthStatus,
    branchProtectionConfigured,
    hookDirFor: resolveHookDir,
    nodeVersion: () => process.version,
    bunVersion: () => (typeof Bun === 'undefined' ? null : Bun.version),
    packageVersion: readVersion
  }
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
export type Severity = 'ok' | 'info' | 'warn' | 'error'
export type Finding = { check: string; severity: Severity; message: string }

const ok = (check: string, message: string): Finding => ({ check, severity: 'ok', message })
const info = (check: string, message: string): Finding => ({ check, severity: 'info', message })
const warn = (check: string, message: string): Finding => ({ check, severity: 'warn', message })
const error = (check: string, message: string): Finding => ({ check, severity: 'error', message })

// ---------------------------------------------------------------------------
// vinaya.config.json — read without the cwd-walking loadConfig(), same reason
// init.ts/eject.ts avoid it: doctor must diagnose <repoRoot>'s own file, never
// an ancestor repo's config.
// ---------------------------------------------------------------------------
type ConfigRead = { kind: 'missing' } | { kind: 'invalid'; error: string } | { kind: 'ok'; config: VinayaConfig }

function readConfig(repoRoot: string): ConfigRead {
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
  return { kind: 'ok', config: parsed.data }
}

function labelForPath(path: string): string {
  if (path === CONFIG_PATH) return 'config'
  if (path === DOCTRINE_POINTER_PATH) return 'doctrine-pointer'
  return 'workflows'
}

// ---------------------------------------------------------------------------
// Checks 1/2/3/4 — hooks, workflows, config, VINAYA.md — one pass over the
// SAME op list `vinaya init` builds (lib/artifacts.ts), classified against
// disk + the manifest instead of applied.
// ---------------------------------------------------------------------------
function diagnoseInstall(
  repoRoot: string,
  ctx: InitContext,
  manifest: ManagedManifest
): { findings: Finding[]; hasDrift: boolean } {
  const findings: Finding[] = []
  let hasDrift = false
  const ownedFiles = new Set(manifest.files)
  const blockKey = (path: string, marker: string) => `${path}::${marker}`
  const ownedBlocks = new Set(manifest.blocks.map((b) => blockKey(b.path, b.marker)))

  for (const op of buildInitOps(ctx)) {
    if (op.kind === 'create-file') {
      const check = labelForPath(op.path)
      const abs = join(repoRoot, op.path)
      const exists = existsSync(abs)
      const owned = ownedFiles.has(op.path)

      if (!exists) {
        findings.push(
          owned
            ? error(check, `${op.path} is recorded as vinaya-managed but missing on disk — run \`vinaya upgrade\`.`)
            : error(check, `${op.path} is not installed — run \`vinaya init\`.`)
        )
        continue
      }

      const content = readFileSync(abs, 'utf-8')
      if (!owned) {
        findings.push(
          content === op.content
            ? warn(check, `${op.path} has vinaya's own content but isn't recorded in the manifest.`)
            : info(check, `${op.path} exists but is foreign content — not vinaya-managed, left untouched.`)
        )
        continue
      }

      if (op.path === CONFIG_PATH) {
        // vinaya.config.json's semantic content (rings/checks/briefSchema) is
        // adopter-owned from day one — doctor never diffs it byte-for-byte.
        findings.push(ok(check, `${op.path} present and vinaya-managed.`))
        continue
      }

      if (content === op.content) {
        findings.push(ok(check, `${op.path} matches the installed package's generated content.`))
      } else {
        hasDrift = true
        findings.push(
          warn(check, `${op.path} has drifted from the installed package's generated content — run \`vinaya upgrade\`.`)
        )
      }
    } else if (op.kind === 'managed-block') {
      const check = 'hooks'
      const abs = join(repoRoot, op.path)
      const owned = ownedBlocks.has(blockKey(op.path, op.marker))

      if (!existsSync(abs)) {
        findings.push(
          owned
            ? error(
                check,
                `${op.path} is missing — likely a fresh clone (raw git hooks aren't tracked by git). Run \`vinaya upgrade\` to restore it.`
              )
            : info(check, `${op.path} is not installed.`)
        )
        continue
      }

      const content = readFileSync(abs, 'utf-8')
      const { begin, end } = markerLines(op.marker, op.comment)
      const hasMarkers = content.includes(begin) && content.includes(end)

      if (!hasMarkers) {
        findings.push(
          owned
            ? error(check, `${op.path}'s vinaya-managed block is missing or corrupted — run \`vinaya upgrade\`.`)
            : info(check, `${op.path} exists with no vinaya-managed block.`)
        )
        continue
      }

      if (!owned) {
        findings.push(warn(check, `${op.path} has a vinaya-managed block that isn't recorded in the manifest.`))
      } else if (content.includes(renderBlock(op))) {
        findings.push(ok(check, `${op.path}'s managed block matches the installed package's generator.`))
      } else {
        hasDrift = true
        findings.push(
          warn(
            check,
            `${op.path}'s managed block has drifted from the installed package's generator — run \`vinaya upgrade\`.`
          )
        )
      }

      if (op.mode !== undefined && (statSync(abs).mode & 0o111) === 0) {
        findings.push(error(check, `${op.path} is not executable.`))
      }
    }
  }

  return { findings, hasDrift }
}

// ---------------------------------------------------------------------------
// Check 7 — custom checks: every `checks` entry's `run` path exists.
// Registration shape itself is already enforced by the schema parse that
// produced `config` (loud failure surfaces at the top level, see runDoctor).
// ---------------------------------------------------------------------------
function diagnoseCustomChecks(repoRoot: string, config: VinayaConfig): Finding[] {
  const findings: Finding[] = []
  for (const [name, entry] of Object.entries(config.checks ?? {})) {
    const scriptAbs = join(repoRoot, entry.run)
    findings.push(
      existsSync(scriptAbs)
        ? ok('checks', `custom check '${name}' → ${entry.run}`)
        : error('checks', `custom check '${name}' points at a missing script: ${entry.run}`)
    )
  }
  return findings
}

// ---------------------------------------------------------------------------
// Check 5 — environment (gh auth + scope, Node/Bun, package-vs-artifact skew)
// ---------------------------------------------------------------------------
async function diagnoseEnvironment(deps: DoctorDeps, hasDrift: boolean): Promise<Finding[]> {
  const findings: Finding[] = []
  const auth = await deps.ghAuthStatus()
  const detail = auth.detail.replace(/\s*\n+\s*/g, '; ')
  findings.push(
    auth.authenticated ? info('environment', `gh: authenticated (${detail})`) : warn('environment', `gh: ${detail}`)
  )
  findings.push(info('environment', `node: ${deps.nodeVersion()}`))
  const bun = deps.bunVersion()
  if (bun) findings.push(info('environment', `bun: ${bun}`))

  const version = deps.packageVersion()
  findings.push(
    hasDrift
      ? warn(
          'environment',
          `vinaya@${version} — installed artifacts have drifted from this version's generator. Run \`vinaya upgrade\`.`
        )
      : info('environment', `vinaya@${version} — installed artifacts match this version's generator.`)
  )
  return findings
}

// ---------------------------------------------------------------------------
// Check 6 — branch protection, report-only, never applied.
// ---------------------------------------------------------------------------
async function diagnoseBranchProtection(deps: DoctorDeps, owner: string, repo: string): Promise<Finding> {
  const configured = await deps.branchProtectionConfigured(owner, repo)
  if (configured === true) return info('branch-protection', 'main branch protection is configured.')
  if (configured === false) {
    return info(
      'branch-protection',
      "main branch protection is not configured — vinaya never applies it; see `vinaya init`'s printed recommendation."
    )
  }
  return info(
    'branch-protection',
    'main branch protection could not be determined (no gh auth, no remote, or a permission gap).'
  )
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------
function symbolFor(severity: Severity): string {
  switch (severity) {
    case 'ok':
      return '✓'
    case 'info':
      return '·'
    case 'warn':
      return '⚠'
    case 'error':
      return '✗'
  }
}

function printReport(findings: Finding[], healthy: boolean): void {
  process.stdout.write('vinaya doctor\n\n')
  for (const f of findings) {
    process.stdout.write(`${symbolFor(f.severity)} [${f.check}] ${f.message}\n`)
  }
  process.stdout.write(
    `\n${healthy ? 'Healthy — no findings.' : 'Findings above. vinaya doctor never mutates — nothing was changed.'}\n`
  )
}

// ---------------------------------------------------------------------------
// vinaya doctor
// ---------------------------------------------------------------------------
export async function runDoctor(args: string[], deps: DoctorDeps): Promise<number> {
  const jsonOutput = args.includes('--json')

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya doctor` from inside your repo.')
    return 1
  }

  const configRead = readConfig(repo.repoRoot)
  const findings: Finding[] = []
  let hasDrift = false

  if (configRead.kind === 'invalid') {
    findings.push(error('config', `vinaya.config.json is invalid — ${configRead.error}`))
  } else if (configRead.kind === 'missing' || !configRead.config.managed) {
    findings.push(error('install', 'vinaya is not initialized in this repo — run `vinaya init`.'))
  } else {
    const manifest = configRead.config.managed
    const hookDir = hookDirFromManifest(manifest, deps.hookDirFor(repo.repoRoot))
    const ctx: InitContext = { owner: repo.owner, repo: repo.repo, hookDir }
    const install = diagnoseInstall(repo.repoRoot, ctx, manifest)
    findings.push(...install.findings)
    hasDrift = install.hasDrift
    findings.push(...diagnoseCustomChecks(repo.repoRoot, configRead.config))
  }

  findings.push(...(await diagnoseEnvironment(deps, hasDrift)))
  findings.push(await diagnoseBranchProtection(deps, repo.owner, repo.repo))

  const healthy = findings.every((f) => f.severity === 'ok' || f.severity === 'info')

  if (jsonOutput) {
    printJson({ healthy, findings })
  } else {
    printReport(findings, healthy)
  }

  return healthy ? 0 : 1
}

export async function doctorCommand(args: string[]): Promise<void> {
  process.exit(await runDoctor(args, realDeps()))
}
