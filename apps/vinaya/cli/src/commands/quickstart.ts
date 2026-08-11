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
import { existsSync, readFileSync } from 'node:fs'
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

// Color only when connected to a real terminal — inert (plain text, byte-
// identical to before) whenever stdout is piped/captured, which is exactly
// every test in tests/quickstart.test.ts and every CI run. Never gate a
// substring assertion on these; `useColor` guarantees they never fire there.
const useColor = process.stdout.isTTY === true
function paint(code: string, s: string): string {
  return useColor ? `\x1b[${code}m${s}\x1b[0m` : s
}
const bold = (s: string) => paint('1', s)
const cyan = (s: string) => paint('36', s)
const green = (s: string) => paint('32', s)
const red = (s: string) => paint('31', s)

// A small hand-rolled block font — just the letters "VINAYA HARNESS" needs —
// for the one-time banner at quickstart's start. Not a general-purpose
// figlet: every glyph is 5 rows tall, hand-authored, added on demand.
const BLOCK_FONT: Record<string, string[]> = {
  V: ['█   █', '█   █', '█   █', ' █ █ ', '  █  '],
  I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
  N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
  A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
  Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
  H: ['█   █', '█   █', '█████', '█   █', '█   █'],
  R: ['████ ', '█   █', '████ ', '█ █  ', '█  █ '],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
  S: [' ████', '█    ', ' ███ ', '    █', '████ ']
}
const BLANK_GLYPH = ['   ', '   ', '   ', '   ', '   ']

function blockBanner(text: string): string {
  const glyphs = text
    .toUpperCase()
    .split('')
    .map((ch) => (ch === ' ' ? BLANK_GLYPH : (BLOCK_FONT[ch] ?? ['     ', '     ', '     ', '     ', '     '])))
  const rows: string[] = []
  for (let r = 0; r < 5; r++) rows.push(glyphs.map((g) => g[r]).join(' '))
  return rows.join('\n')
}

const TOTAL_STEPS = 7
function stepHeader(n: number, title: string, caption: string): string {
  const rule = cyan('━'.repeat(56))
  return `\n${rule}\n${bold(cyan(`STEP ${n} of ${TOTAL_STEPS}`))} — ${bold(title)}\n${rule}\n${caption}\n`
}

const GLOB_INJECTION_RE = /[\s\r\n]/
const POINTER_INJECTION_RE = /[\r\n]/
// Mirrors `commands/init.ts`'s own `validPathFlag`/`PRODUCT_NAME_RE` — quickstart
// catches the same bad input a step earlier, before it ever reaches
// `runInitProduct`, for the same reason the doc-owners glob/pointer are
// pre-validated above rather than left entirely to the downstream writer.
const NAME_INJECTION_RE = /[\s|\r\n]/
const PATH_INJECTION_RE = /[|\r\n]/

/**
 * True when `pointer` is an in-repo path/anchor form (not a URL) and that
 * path does not exist on disk. Injection-safety (`POINTER_INJECTION_RE`)
 * only rejects newlines — it says nothing about whether the pointer is a
 * real doc, so a typo like `2121` was previously accepted and written
 * straight into `.vinaya/doc-owners` (found live). URL pointers are exempt
 * — `.vinaya/doc-owners`'s own doctrine allows an external pointer with no
 * local existence to check.
 */
function pointerIsMissingLocalFile(repoRoot: string, pointer: string): boolean {
  if (/^https?:\/\//i.test(pointer)) return false
  const path = pointer.split('#')[0] ?? pointer
  return !existsSync(join(repoRoot, path))
}

/**
 * Loops the doc-owners bind prompt on bad input instead of silently
 * skipping (review finding, live) — empty answers still skip immediately
 * (that's an intentional "nothing to bind" opt-out, not a mistake to
 * recover from), but a validation failure now offers a retry before giving
 * up. Also loops across MULTIPLE bindings (review finding, live: the
 * one-shot flow only ever let a guest bind a single doc→code pair, no path
 * to a second) — `any` tracks whether at least one binding has already
 * landed, so "Bind another?" is offered only after a real success, never
 * layered onto the initial skip/decline messages.
 */
async function bindDocOwnerLoop(deps: QuickstartDeps, repoRoot: string): Promise<void> {
  let any = false
  for (;;) {
    if (any && !(await deps.confirm('Bind another doc→code pair?', false))) return
    const glob = (await deps.ask('Code glob to bind (e.g. apps/foo/src/**): ')).trim()
    const pointer = (await deps.ask('Doc pointer (in-repo path, path#anchor, or URL): ')).trim()
    if (!glob || !pointer) {
      if (!any) process.stdout.write(red('✗ Skipped — no glob/pointer provided, no doc-owners binding created.\n'))
      return
    }
    if (GLOB_INJECTION_RE.test(glob) || POINTER_INJECTION_RE.test(pointer)) {
      console.error(red('Error: glob must not contain whitespace, and the pointer must not contain a newline.'))
    } else if (pointerIsMissingLocalFile(repoRoot, pointer)) {
      console.error(red(`✗ "${pointer}" does not exist in this repo (and isn't a URL).`))
    } else {
      const plan = planDocOwnersBinding(repoRoot, glob, pointer)
      applyDocOwnersBinding(repoRoot, plan, glob, pointer)
      process.stdout.write(`${green(renderDocOwnersBindingDiffLine(plan))}\n`)
      any = true
      continue
    }
    if (!(await deps.confirm('Try again?', true))) {
      if (!any) process.stdout.write(red('✗ Skipped — no doc-owners binding created.\n'))
      return
    }
  }
}

/** Same retry-on-bad-input AND loop-across-multiple shape as `bindDocOwnerLoop` — see its doc comment. */
async function registerProjectLoop(deps: QuickstartDeps): Promise<void> {
  let any = false
  for (;;) {
    if (any && !(await deps.confirm('Register another project?', false))) return
    const name = (await deps.ask('Project name (lower-case slug): ')).trim()
    const rawPath = (await deps.ask('Project path (relative to repo root) [.]: ')).trim()
    const path = rawPath || '.'
    if (!name) {
      if (!any) process.stdout.write(red('✗ Skipped — no project name provided, no project registered.\n'))
      return
    }
    if (NAME_INJECTION_RE.test(name) || PATH_INJECTION_RE.test(path)) {
      console.error(
        red(
          'Error: project name must not contain whitespace or a pipe, and the path must not contain a pipe or a newline.'
        )
      )
    } else {
      const rc = await runInitProduct([name, '--path', path, '--yes'], deps.initDeps)
      if (rc !== 0) console.error(red(`\`vinaya init product\` exited with code ${rc}.`))
      any = true
      continue
    }
    if (!(await deps.confirm('Try again?', true))) {
      if (!any) process.stdout.write(red('✗ Skipped — no project registered.\n'))
      return
    }
  }
}

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
    process.stdout.write(`${cyan(blockBanner('VINAYA HARNESS'))}\n\n${bold('Quickstart')} — guided install\n`)

    process.stdout.write(
      stepHeader(
        1,
        'Install',
        'Runs `vinaya init` — shows the full diff of what would be installed (config, workflows, git hooks, doctrine pointer), then asks you to confirm before writing anything.'
      )
    )
    await deps.ask('Press Enter to see the diff and continue: ')
    const initRc = await runInit([], deps.initDeps)
    if (initRc !== 0) {
      console.error(red(`\n\`vinaya init\` exited with code ${initRc} — quickstart cannot continue.`))
      return initRc
    }

    process.stdout.write(
      stepHeader(
        2,
        'Bind a doc → code pair',
        "Optional. Tells Vinaya which code maps to which doc, so the doc-coverage check can enforce it later. Skip with N — you'll be asked to bind another after each one."
      )
    )
    const bindDoc = await deps.confirm('Bind a doc→code pair now?', false)
    if (bindDoc) await bindDocOwnerLoop(deps, repo.repoRoot)

    process.stdout.write(
      stepHeader(
        3,
        'Register a project',
        "Optional. Writes `.vinaya/projects.md` so Studio's board can resolve this project. Skip with N — you'll be asked to register another after each one."
      )
    )
    const registerProject = await deps.confirm('Register this as a tracked project?', false)
    if (registerProject) await registerProjectLoop(deps)

    process.stdout.write(
      stepHeader(
        4,
        'Review and commit',
        'Shows `git status` for the full working tree, then commits everything as one `Chore: install Vinaya` commit. Not gated by a prompt — always runs, no-ops if there is genuinely nothing to commit.'
      )
    )
    const status = gitStatusShort(repo.repoRoot)
    process.stdout.write('Working tree before commit (review before it lands — `git add -A` runs next):\n')
    process.stdout.write(status ? `${status}\n` : '(clean)\n')

    process.stdout.write(`\n${bold('→ Committing the install…')}\n`)
    const commitResult = commitInstall(repo.repoRoot)
    process.stdout.write(`${commitResult.committed ? green(commitResult.message) : commitResult.message}\n`)

    process.stdout.write(
      stepHeader(
        5,
        'Refusal-then-fix proof',
        'Runs a real broken commit through the hook just installed, shows it get refused, fixes it, and cleans up — proves the install actually works. Recommended, defaults to Y.'
      )
    )
    const ranDemoBreak = await deps.confirm(
      'Run the refusal-then-fix proof now? (recommended — proves the install actually works)',
      true
    )
    if (ranDemoBreak) {
      const rc = await runDemoBreak(repo.repoRoot, [])
      if (rc !== 0) console.error(red(`\`vinaya demo break\` exited with code ${rc}.`))
    }

    process.stdout.write(
      stepHeader(
        6,
        'Doctor',
        'Runs `vinaya doctor` — confirms every installed artifact matches what should be there. Read-only, mutates nothing.'
      )
    )
    await runDoctor([], deps.doctorDeps)

    process.stdout.write(
      stepHeader(7, 'Push', 'Pushes the install commit to your remote, if you have one. Recommended, defaults to Y.')
    )
    let pushed = false
    const wantsPush = await deps.confirm('Push to the remote now?', true)
    if (wantsPush) {
      const pushResult = pushInstall(repo.repoRoot)
      process.stdout.write(`\n${pushResult.pushed ? green(pushResult.message) : red(pushResult.message)}\n`)
      pushed = pushResult.pushed
    }

    process.stdout.write(`\n${bold('Next steps:')}\n`)
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
