// `vinaya eject` — the inverse of `vinaya init`.
//
// Reads the ownership records `init` wrote (the `managed` manifest inside
// vinaya.config.json + the in-file block markers) and applies each op's
// inverse: delete vinaya-created files, strip managed blocks while keeping the
// adopter's own lines, and REPORT created labels for manual removal (never
// auto-delete — a label may be in use elsewhere). Un-owned state is never
// touched. Same diff-and-confirm / --dry-run / --yes contract as init,
// inverted. No-op on an untouched repo. Round-trips clean: init→eject returns
// the repo to its exact pre-init state.
//
// If ownership cannot be determined (the manifest is gone or corrupt while
// vinaya.config.json is present), eject STOPS short of any delete, reports the
// orphans, and exits non-zero — never a destructive guess (Section 10).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG_PATH } from '../lib/artifacts.js'
import { type ManagedManifest, VinayaConfigSchema } from '../lib/config.js'
import { detectGitRepo, type RepoInfo } from '../lib/detect.js'
import { applyEject, planEject, renderEjectDiff } from '../lib/ops.js'
import { closeStdin, promptYesNo } from '../lib/prompt.js'

export type EjectDeps = {
  detectRepo: () => Promise<RepoInfo | null>
  confirm: (question: string) => Promise<boolean>
}

function realDeps(): EjectDeps {
  return {
    detectRepo: detectGitRepo,
    confirm: async (q) => {
      const yes = await promptYesNo(q, false)
      closeStdin()
      return yes
    }
  }
}

type Parsed = { dryRun: boolean; yes: boolean }
function parse(args: string[]): Parsed {
  return { dryRun: args.includes('--dry-run'), yes: args.includes('--yes') }
}

type ManifestRead =
  | { kind: 'none' } // no vinaya.config.json — untouched repo
  | { kind: 'ok'; manifest: ManagedManifest }
  | { kind: 'orphan'; reason: string } // config present but ownership unreadable

function readManifest(repoRoot: string): ManifestRead {
  const p = join(repoRoot, CONFIG_PATH)
  if (!existsSync(p)) return { kind: 'none' }
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(p, 'utf-8'))
  } catch (err) {
    return { kind: 'orphan', reason: `vinaya.config.json is not valid JSON: ${(err as Error).message}` }
  }
  const parsed = VinayaConfigSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      kind: 'orphan',
      reason: `vinaya.config.json failed schema validation: ${parsed.error.issues.map((i) => i.message).join('; ')}`
    }
  }
  if (!parsed.data.managed) {
    return {
      kind: 'orphan',
      reason: 'vinaya.config.json has no `managed` ownership manifest — cannot determine what to remove.'
    }
  }
  return { kind: 'ok', manifest: parsed.data.managed }
}

export async function runEject(args: string[], deps: EjectDeps): Promise<number> {
  const parsed = parse(args)

  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya eject` from inside your repo.')
    return 1
  }

  const read = readManifest(repo.repoRoot)
  if (read.kind === 'none') {
    process.stdout.write('Nothing to eject — this repo is not Vinaya-initialized.\n')
    return 0
  }
  if (read.kind === 'orphan') {
    console.error(`Error: ${read.reason}`)
    console.error(
      'Refusing to remove anything without a valid ownership record. Restore or fix vinaya.config.json, then re-run.'
    )
    return 1
  }

  const plan = planEject(read.manifest, repo.repoRoot)

  // A recorded path that resolves outside the repo means the manifest is
  // corrupt or hostile — refuse the whole eject rather than run a partial
  // destructive pass (Section 10: never a destructive guess). Belt-and-
  // suspenders with the schema refinement (which already rejects `..` at parse)
  // and applyEject's per-op containment recheck.
  if (plan.escapes.length > 0) {
    console.error('Error: the ownership manifest records paths that resolve OUTSIDE this repo:')
    for (const p of plan.escapes) console.error(`  ${p}`)
    console.error(
      'Refusing to remove anything. This manifest is corrupt or hand-edited — fix vinaya.config.json, then re-run.'
    )
    return 1
  }

  process.stdout.write('vinaya eject — the full diff of every removal:\n\n')
  process.stdout.write(`${renderEjectDiff(plan)}\n`)

  if (parsed.dryRun) {
    process.stdout.write('\n--dry-run: nothing was removed.\n')
    return 0
  }

  if (!parsed.yes) {
    const ok = await deps.confirm('Remove these vinaya-installed artifacts?')
    if (!ok) {
      process.stdout.write('Aborted. Nothing was removed.\n')
      return 0
    }
  }

  const { removedLabelsToReport } = applyEject(plan, repo.repoRoot)

  process.stdout.write('\nVinaya ejected.\n')
  if (removedLabelsToReport.length > 0) {
    process.stdout.write('These labels were created by vinaya and left in place — remove them manually if unused:\n')
    for (const name of removedLabelsToReport) process.stdout.write(`  gh label delete ${name}\n`)
  }
  return 0
}

export async function ejectCommand(args: string[]): Promise<void> {
  const code = await runEject(args, realDeps())
  process.exit(code)
}
