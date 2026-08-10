// `vinaya quickstart` — the guided wizard. Orchestrates the EXISTING,
// UNMODIFIED `init`, `init product`, `demo break`, and `doctor` entry points
// in sequence with Y/n prompts between them, so a guest can go from a bare
// repo to a fully installed, committed, verified, pushed Vinaya install in
// one command. Never reimplements or inlines any of those commands' own
// internals — it calls them.
//
// Prompt-chaining hazard (found live, not in the brief): `lib/prompt.ts`'s
// `closeStdin()` calls `process.stdin.destroy()`, which permanently closes
// the underlying stream — a SECOND `prompt()`/`promptYesNo()` call after a
// `closeStdin()` hangs forever waiting on data that can never arrive again
// (reproduced directly: a piped 3-answer script hangs on the second prompt
// once the first closes stdin). Every other command in this file prompts at
// most once per invocation, so this never surfaced before. `quickstart` is
// the first command to chain multiple prompts in one process, so its own
// `confirm`/`ask` deps deliberately do NOT call `closeStdin` per-call — only
// once, in a `finally` block wrapping the whole flow, on every exit path.
// This means quickstart's own `InitDeps.confirm` (used for the wrapped
// `runInit` call) must ALSO skip the per-call `closeStdin` `initCommand`'s
// own `realDeps()` uses — deliberately NOT the literal same closure, despite
// carrying the same `InitDeps` shape.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runDemoBreak } from './demo.js'
import type { DoctorDeps } from './doctor.js'
import { runDoctor } from './doctor.js'
import type { InitDeps } from './init.js'
import { runInit, runInitProduct } from './init.js'
import { applyDocOwnersBinding, planDocOwnersBinding, renderDocOwnersBindingDiffLine } from '../lib/doc-owners-write.js'
import {
  branchProtectionConfigured,
  checkGhAuth,
  customHooksPath,
  detectGitRepo,
  ghAuthStatus,
  ghLabelGateway,
  resolveHookDir,
  type RepoInfo
} from '../lib/detect.js'
import { packageRoot } from '../lib/package-root.js'
import { closeStdin, prompt as promptAsk, promptYesNo } from '../lib/prompt.js'

export type QuickstartDeps = {
  detectRepo: () => Promise<RepoInfo | null>
  initDeps: InitDeps
  doctorDeps: DoctorDeps
  /** Y/n prompt. Does NOT close stdin per-call — see this file's header comment. */
  confirm: (question: string, defaultYes: boolean) => Promise<boolean>
  /** Free-text prompt. Does NOT close stdin per-call — see this file's header comment. */
  ask: (question: string) => Promise<string>
  /** Called exactly once, after every prompt in the flow is done (or on early exit). */
  closeStdin: () => void
}

const GLOB_INJECTION_RE = /[\s\r\n]/
const POINTER_INJECTION_RE = /[\r\n]/
// Mirrors `commands/init.ts`'s own `validPathFlag`/`PRODUCT_NAME_RE` — quickstart
// catches the same bad input a step earlier, before it ever reaches
// `runInitProduct`, for the same reason the doc-owners glob/pointer are
// pre-validated above rather than left entirely to the downstream writer.
const NAME_INJECTION_RE = /[\s|\r\n]/
const PATH_INJECTION_RE = /[|\r\n]/

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(join(packageRoot(import.meta.url), 'package.json'), 'utf-8'))
  return pkg.version
}

function realDeps(): QuickstartDeps {
  return {
    detectRepo: detectGitRepo,
    initDeps: {
      detectRepo: detectGitRepo,
      checkGhAuth,
      labelGateway: ghLabelGateway,
      hookDirFor: resolveHookDir,
      customHooksPath,
      // No closeStdin here — see this file's header comment.
      confirm: async (q) => promptYesNo(q, false)
    },
    doctorDeps: {
      detectRepo: detectGitRepo,
      ghAuthStatus,
      branchProtectionConfigured,
      hookDirFor: resolveHookDir,
      nodeVersion: () => process.version,
      bunVersion: () => (typeof Bun === 'undefined' ? null : Bun.version),
      packageVersion: readPackageVersion
    },
    confirm: async (q, defaultYes) => promptYesNo(q, defaultYes),
    ask: async (q) => promptAsk(q),
    closeStdin
  }
}

function execGit(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function errorDetail(err: unknown): string {
  const stderr = (err as { stderr?: Buffer | string }).stderr
  if (stderr) return stderr.toString().trim()
  return err instanceof Error ? err.message : String(err)
}

/**
 * `git status --short` of the FULL working tree, before anything is staged —
 * printed ahead of the commit (review finding, PR #838): `quickstart` targets
 * a bare/first-run repo, exactly the profile most likely to still carry an
 * ungitignored secret file, and `git add -A` below stages everything with no
 * per-file review. `vinaya init`'s own diff-and-confirm only covers Vinaya's
 * generated artifacts, not the rest of the tree, so this is the one point in
 * the flow that surfaces what else is about to be committed.
 */
function gitStatusShort(repoRoot: string): string {
  return execGit(repoRoot, ['status', '--short'])
}

/** `git add -A` then commit, unless there is genuinely nothing staged — never gated by a prompt. */
function commitInstall(repoRoot: string): { committed: boolean; message: string } {
  execGit(repoRoot, ['add', '-A'])
  const staged = execGit(repoRoot, ['diff', '--cached', '--stat'])
  if (!staged) return { committed: false, message: 'Nothing to commit — working tree already clean.' }
  try {
    execGit(repoRoot, ['commit', '-m', 'Chore: install Vinaya'])
    return { committed: true, message: '✓ Committed `Chore: install Vinaya`.' }
  } catch (err) {
    return { committed: false, message: `git commit failed: ${errorDetail(err)}` }
  }
}

function pushInstall(repoRoot: string): { pushed: boolean; message: string } {
  try {
    const branch = execGit(repoRoot, ['symbolic-ref', '--short', 'HEAD'])
    let hasUpstream = true
    try {
      execGit(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
    } catch {
      hasUpstream = false
    }
    execGit(repoRoot, hasUpstream ? ['push'] : ['push', '-u', 'origin', branch])
    return { pushed: true, message: '✓ Pushed.' }
  } catch (err) {
    return { pushed: false, message: `git push failed: ${errorDetail(err)}` }
  }
}

export async function runQuickstart(_args: string[], deps: QuickstartDeps): Promise<number> {
  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya quickstart` from inside your repo.')
    return 1
  }

  try {
    process.stdout.write('vinaya quickstart — guided install\n\n')

    const initRc = await runInit([], deps.initDeps)
    if (initRc !== 0) {
      console.error(`\n\`vinaya init\` exited with code ${initRc} — quickstart cannot continue.`)
      return initRc
    }

    const bindDoc = await deps.confirm('Bind a doc→code pair now?', false)
    if (bindDoc) {
      const glob = (await deps.ask('Code glob to bind (e.g. apps/foo/src/**): ')).trim()
      const pointer = (await deps.ask('Doc pointer (in-repo path, path#anchor, or URL): ')).trim()
      if (!glob || !pointer) {
        process.stdout.write('No glob/pointer provided — skipping the doc-owners binding.\n')
      } else if (GLOB_INJECTION_RE.test(glob) || POINTER_INJECTION_RE.test(pointer)) {
        console.error('Error: glob must not contain whitespace, and the pointer must not contain a newline — skipping.')
      } else {
        const plan = planDocOwnersBinding(repo.repoRoot, glob, pointer)
        applyDocOwnersBinding(repo.repoRoot, plan, glob, pointer)
        process.stdout.write(`${renderDocOwnersBindingDiffLine(plan)}\n`)
      }
    }

    const registerProject = await deps.confirm('Register this as a tracked project?', false)
    if (registerProject) {
      const name = (await deps.ask('Project name (lower-case slug): ')).trim()
      const rawPath = (await deps.ask('Project path (relative to repo root) [.]: ')).trim()
      const path = rawPath || '.'
      if (!name) {
        process.stdout.write('No project name provided — skipping project registration.\n')
      } else if (NAME_INJECTION_RE.test(name) || PATH_INJECTION_RE.test(path)) {
        console.error(
          'Error: project name must not contain whitespace or a pipe, and the path must not contain a pipe or a newline — skipping.'
        )
      } else {
        const rc = await runInitProduct([name, '--path', path, '--yes'], deps.initDeps)
        if (rc !== 0) console.error(`\`vinaya init product\` exited with code ${rc}.`)
      }
    }

    const status = gitStatusShort(repo.repoRoot)
    process.stdout.write('\nWorking tree before commit (review before it lands — `git add -A` runs next):\n')
    process.stdout.write(status ? `${status}\n` : '(clean)\n')

    process.stdout.write('\n→ Committing the install…\n')
    const commitResult = commitInstall(repo.repoRoot)
    process.stdout.write(`${commitResult.message}\n`)

    const ranDemoBreak = await deps.confirm(
      'Run the refusal-then-fix proof now? (recommended — proves the install actually works)',
      true
    )
    if (ranDemoBreak) {
      const rc = await runDemoBreak(repo.repoRoot, [])
      if (rc !== 0) console.error(`\`vinaya demo break\` exited with code ${rc}.`)
    }

    process.stdout.write('\n→ Running `vinaya doctor`…\n')
    await runDoctor([], deps.doctorDeps)

    let pushed = false
    const wantsPush = await deps.confirm('Push to the remote now?', true)
    if (wantsPush) {
      const pushResult = pushInstall(repo.repoRoot)
      process.stdout.write(`\n${pushResult.message}\n`)
      pushed = pushResult.pushed
    }

    process.stdout.write('\nNext steps:\n')
    process.stdout.write('  vinaya studio\n')
    if (!ranDemoBreak) process.stdout.write('  vinaya demo break\n')
    process.stdout.write('  vinaya check --all\n')
    if (!pushed) process.stdout.write('  git push\n')

    return 0
  } finally {
    deps.closeStdin()
  }
}

export async function quickstartCommand(args: string[]): Promise<void> {
  process.exit(await runQuickstart(args, realDeps()))
}
