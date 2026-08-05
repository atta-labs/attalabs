// `vinaya demo break` — the productized belief moment.
//
// On an ISOLATED, DISCARDABLE branch of the CURRENT repo (never a separate
// temp-dir sandbox — Issue #387's Boundary corrects an earlier scratch doc on
// exactly this point): stage a deliberately malformed brief, attempt a real
// `git commit`, let the repo's REAL installed pre-commit hook refuse it with
// its real output, apply the minimal fix, commit again, then clean up.
//
// Why the malformed artifact is a brief body, fed via `PR_BODY`: the
// pre-commit hook runs `vinaya check --all --diff-only`. Four of the five
// core checks (`coherence`, `dispatch-readiness`) bypass on any branch that
// isn't `task/<tranche>/<n>`, and `doc-coverage` is dormant without a bound
// `.vinaya/doc-owners` entry — none of those can fire deterministically on a
// throwaway branch in an arbitrary repo. `brief-shape` is the one core check
// whose input (`PR_BODY`) this command can supply directly and honestly: the
// artifact staged for commit *is* the draft brief body, and the check that
// refuses it is the exact same `checkBriefSections` the CI brief-shape gate
// runs — real code, real output, not a scripted string.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { detectGitRepo, resolveHookDir } from '../lib/detect.js'

const DEMO_BRANCH_PREFIX = 'vinaya/demo-break-'
const FIXTURE_PATH = '.vinaya-demo-brief.md'
const STATE_FILENAME = 'vinaya-demo-state.json'

type DemoState = { originalBranch: string; demoBranch: string }

type CommitResult = { status: number; stdout: string; stderr: string }

function gitCapture(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function branchExists(repoRoot: string, name: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}

/** Collision-safe: retries with a fresh timestamp+random suffix if a name is somehow already taken. */
function createDemoBranch(repoRoot: string): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${DEMO_BRANCH_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (!branchExists(repoRoot, candidate)) {
      gitCapture(repoRoot, ['checkout', '-b', candidate])
      return candidate
    }
  }
  throw new Error('Could not generate a collision-free demo branch name after 5 attempts.')
}

/** The real gitdir for this checkout — a worktree's is private (`.git/worktrees/<name>`), never the shared `.git` of the main checkout, so state from concurrent worktrees never collides. */
function gitDirAbs(repoRoot: string): string {
  const raw = gitCapture(repoRoot, ['rev-parse', '--git-dir'])
  return isAbsolute(raw) ? raw : join(repoRoot, raw)
}

/**
 * Crash recovery: a state file left on disk means a prior run never reached
 * its own cleanup (a crash mid-demo). Never a prefix-glob sweep — only the
 * ONE demo branch this run's own state file names is ever touched (a real
 * branch a user happened to name with the reserved prefix must never be
 * force-deleted as collateral).
 *
 * If the process is currently sitting on that stray demo branch, its staged
 * fixture (the exact "commit refused, guided fix pending" window this
 * command's own demo lives in) is discarded with `reset --hard` + `clean -fd`
 * BEFORE switching away — `git checkout` alone carries a staged-but-uncommitted
 * change across branches, which would otherwise land the fixture on the
 * user's real original branch (the exact defect this fixes).
 */
function recoverFromCrash(repoRoot: string, statePath: string): void {
  const currentBranch = gitCapture(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'])
  let state: DemoState | null = null
  if (existsSync(statePath)) {
    try {
      state = JSON.parse(readFileSync(statePath, 'utf-8')) as DemoState
    } catch {
      state = null
    }
  }

  const onStrayBranch = currentBranch.startsWith(DEMO_BRANCH_PREFIX)
  if (!state) {
    if (onStrayBranch) {
      throw new Error(
        `On a leftover demo branch \`${currentBranch}\` with no recoverable state file. ` +
          'Checkout the branch you want manually, then re-run `vinaya demo break`.'
      )
    }
    return
  }

  process.stdout.write('→ Found a leftover demo branch from a previous run — cleaning it up first.\n')

  if (onStrayBranch) {
    gitCapture(repoRoot, ['reset', '--hard'])
    gitCapture(repoRoot, ['clean', '-fd'])
    if (!branchExists(repoRoot, state.originalBranch)) {
      throw new Error(
        `Recorded original branch \`${state.originalBranch}\` no longer exists. ` +
          'Checkout the branch you want manually, then re-run `vinaya demo break`.'
      )
    }
    gitCapture(repoRoot, ['checkout', state.originalBranch])
  }

  if (branchExists(repoRoot, state.demoBranch)) {
    gitCapture(repoRoot, ['branch', '-D', state.demoBranch])
  }
  rmSync(statePath, { force: true })
}

/**
 * `BRANCH` is set explicitly to the demo branch alongside `PR_BODY`. As of
 * Correction 2, `coherence`/`dispatch-readiness` no longer `chdir` — they
 * derive the branch from the caller's own inherited
 * cwd, which for this commit already correctly resolves to the demo branch
 * with no help needed. This override is now belt-and-suspenders rather than
 * load-bearing (it was the workaround for the pre-Correction-2 chdir bug,
 * which made a bare `git rev-parse` answer with whatever branch this source
 * tree's OWN dev checkout happened to be on, not the demo's): forcing it
 * explicitly still costs nothing and keeps this call site correct regardless
 * of how a future check resolves its own branch, rather than depending on
 * every check's cwd-derivation staying bug-free forever.
 */
function attemptCommit(repoRoot: string, demoBranch: string, prBody: string, message: string): CommitResult {
  const result = spawnSync('git', ['commit', '-m', message], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PR_BODY: prBody, BRANCH: demoBranch }
  })
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/** The staged artifact — a draft brief. Missing `Tier:` is the one deliberate defect; every other required section is present so the refusal is a single, legible finding. */
function briefFixture(opts: { includeTier: boolean }): string {
  const tierLine = opts.includeTier ? 'Tier: 1\n' : ''
  return `For: vinaya demo
Project: vinaya-demo-fixture
${tierLine}
## Summary
Fixture brief staged only by \`vinaya demo break\` — discarded with the demo branch.

## Technical surface map
None — fixture content only; no real files change.

## Documentation-update list
None — fixture content only.

## Test Plan
Test Plan: unit-tests-only

## Stop Conditions
Autonomy: Do not stop to ask clarifying questions — this is a scripted demo; proceed and clean up automatically.

Illustrative Step 0 (never actually run by this demo):
\`\`\`
git worktree add .worktrees/demo-fixture -b demo/fixture origin/main
\`\`\`

Closes #0 (fixture value — no real Issue; discarded with the demo branch)
`
}

/**
 * `reset --hard` + `clean -fd` run BEFORE `checkout`, on the demo branch,
 * every time — even on the plain success path, where they are a no-op
 * (nothing to discard once the fix commit lands) — for symmetry with the
 * failure paths that call this same function while the fixture is still
 * staged, uncommitted, on the demo branch. `git checkout` alone carries a
 * staged-but-uncommitted file across branches; skipping this step here is
 * exactly how the fixture would land on the user's real original branch.
 */
function cleanup(repoRoot: string, originalBranch: string, demoBranch: string, statePath: string): void {
  gitCapture(repoRoot, ['reset', '--hard'])
  gitCapture(repoRoot, ['clean', '-fd'])
  gitCapture(repoRoot, ['checkout', originalBranch])
  gitCapture(repoRoot, ['branch', '-D', demoBranch])
  if (existsSync(statePath)) rmSync(statePath, { force: true })
}

/**
 * The testable core — takes an explicit `repoRoot` rather than reading
 * `process.cwd()` internally (that indirection lives in `demoBreakCommand`),
 * so tests drive it against a disposable fixture repo directly.
 */
export async function runDemoBreak(repoRoot: string, args: string[]): Promise<number> {
  const keep = args.includes('--keep')

  const hookDir = resolveHookDir(repoRoot)
  const hookPath = join(repoRoot, hookDir, 'pre-commit')
  if (!existsSync(hookPath)) {
    console.error('Vinaya hooks are not installed in this repo. Run `vinaya init` first.')
    return 1
  }

  const statePath = join(gitDirAbs(repoRoot), STATE_FILENAME)
  recoverFromCrash(repoRoot, statePath)

  const dirty = gitCapture(repoRoot, ['status', '--porcelain'])
  if (dirty.length > 0) {
    console.error(
      'Working tree has uncommitted changes. Commit or stash them before running `vinaya demo break` — ' +
        'the demo never touches a dirty tree.'
    )
    return 1
  }

  const originalBranch = gitCapture(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (originalBranch === 'HEAD') {
    console.error('Cannot run `vinaya demo break` from a detached HEAD — checkout a branch first.')
    return 1
  }

  const demoBranch = createDemoBranch(repoRoot)
  writeFileSync(statePath, JSON.stringify({ originalBranch, demoBranch } satisfies DemoState), 'utf-8')
  process.stdout.write(`\n→ Created isolated branch \`${demoBranch}\` off \`${originalBranch}\`.\n\n`)

  const fixturePath = join(repoRoot, FIXTURE_PATH)
  writeFileSync(fixturePath, briefFixture({ includeTier: false }), 'utf-8')
  gitCapture(repoRoot, ['add', FIXTURE_PATH])

  process.stdout.write(
    `Staged \`${FIXTURE_PATH}\` — a brief missing its required \`Tier:\` field.\nAttempting to commit…\n\n`
  )

  const badResult = attemptCommit(
    repoRoot,
    demoBranch,
    briefFixture({ includeTier: false }),
    'Chore(demo): stage a malformed brief'
  )
  if (badResult.status === 0) {
    console.error(
      'Expected the installed hook to refuse this commit, but it passed — the demo cannot show a real refusal here.'
    )
    cleanup(repoRoot, originalBranch, demoBranch, statePath)
    return 1
  }
  process.stdout.write('✗ Commit refused — the real installed hook output:\n\n')
  process.stdout.write(badResult.stdout)
  process.stdout.write(badResult.stderr)

  process.stdout.write('\n→ Fixing the brief: adding the missing `Tier:` field…\n\n')
  writeFileSync(fixturePath, briefFixture({ includeTier: true }), 'utf-8')
  gitCapture(repoRoot, ['add', FIXTURE_PATH])

  const goodResult = attemptCommit(
    repoRoot,
    demoBranch,
    briefFixture({ includeTier: true }),
    'Chore(demo): fix the brief and commit'
  )
  if (goodResult.status !== 0) {
    console.error('The fixed brief still failed the hook — this demo cannot proceed:\n')
    console.error(goodResult.stdout)
    console.error(goodResult.stderr)
    cleanup(repoRoot, originalBranch, demoBranch, statePath)
    return 1
  }
  process.stdout.write('✓ Commit passed — the fix worked.\n')

  if (keep) {
    if (existsSync(statePath)) unlinkSync(statePath)
    process.stdout.write(`\n--keep: leaving \`${demoBranch}\` checked out for you to inspect. Clean up with:\n\n`)
    process.stdout.write(`  git checkout ${originalBranch} && git branch -D ${demoBranch}\n`)
    return 0
  }

  cleanup(repoRoot, originalBranch, demoBranch, statePath)
  process.stdout.write(`\n✓ Cleaned up — back on \`${originalBranch}\`, \`${demoBranch}\` deleted.\n`)
  return 0
}

export async function demoBreakCommand(args: string[]): Promise<void> {
  const repo = await detectGitRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya demo break` from inside your repo.')
    process.exit(1)
  }
  const code = await runDemoBreak(repo.repoRoot, args)
  process.exit(code)
}
