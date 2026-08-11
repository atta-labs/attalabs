#!/usr/bin/env bun
/**
 * Installs `@attalabs/vinaya` from the PUBLIC npm registry into a scratch
 * directory outside this repo and exercises the full shipped-command
 * lifecycle against the real published artifact — never this workspace's
 * local source. The coverage set is derived from `@atta/vinaya-sources`'
 * `COMMANDS` registry (current source), not hand-maintained here.
 *
 * `PACKAGE_SPEC` pins the version under test — bump it as part of each
 * publish's release discipline, then run this script green before calling
 * the release verified. A red row here after a version bump means the
 * published artifact genuinely diverges from what current source promises
 * (the 0.1.0-era run of this script caught exactly that four ways at once:
 * `demo break`/`waiver` missing, a stale check count, and a missing
 * `.vinaya/doc-owners` — all one root cause, source ahead of publish).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { COMMANDS } from '@atta/vinaya-sources'

const PACKAGE_SPEC = '@attalabs/vinaya@0.4.2'
const PUBLISHED_VERSION = PACKAGE_SPEC.slice(PACKAGE_SPEC.lastIndexOf('@') + 1)

// ---------------------------------------------------------------------------
// Workspace-root guard — the whole point is testing the PUBLISHED artifact in
// isolation, never accidentally resolving this monorepo's local source. Run
// against the mkdtemp'd scratch root the instant it exists, before anything
// else touches it. A `vinaya.config.json` or a `package.json` carrying a
// `workspaces` field anywhere above the scratch root means TMPDIR (or the
// platform default) resolved somewhere it should not have.
// ---------------------------------------------------------------------------
function assertOutsideWorkspace(dir: string): void {
  let cur = dir
  for (;;) {
    const configPath = join(cur, 'vinaya.config.json')
    if (existsSync(configPath)) {
      throw new Error(
        `refusing to run: found ${configPath} above the scratch directory — this would test local ` +
          'workspace/adopter config instead of the isolated published artifact.'
      )
    }
    const pkgPath = join(cur, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { workspaces?: unknown }
        if (pkg.workspaces) {
          throw new Error(
            `refusing to run: found a workspace root at ${pkgPath} above the scratch directory — this script ` +
              'must run against an isolated published-artifact install, never inside a monorepo workspace.'
          )
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('refusing to run')) throw err
        // malformed package.json above the scratch dir — not this script's concern, keep walking up.
      }
    }
    const parent = dirname(cur)
    if (parent === cur) return
    cur = parent
  }
}

// ---------------------------------------------------------------------------
// Snapshot + hash-diff (Part 4 — eject byte-identity proof)
// ---------------------------------------------------------------------------
type Snapshot = Map<string, string>

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

/**
 * Walks `root` recursively. `.git` is skipped except `.git/hooks` — the one
 * `.git`-internal path `vinaya init`/`eject` ever touches (the raw-hooks
 * fallback when no `.husky` is present); everything else under `.git`
 * (objects, index, refs) churns for reasons unrelated to vinaya and would
 * make the diff noisy rather than meaningful.
 */
function walk(dir: string, relBase: string, out: Snapshot): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (rel === '.git') {
        const hooksAbs = join(abs, 'hooks')
        if (existsSync(hooksAbs)) walk(hooksAbs, '.git/hooks', out)
        continue
      }
      walk(abs, rel, out)
    } else if (entry.isFile()) {
      out.set(rel, sha256(readFileSync(abs)))
    }
  }
}

function snapshot(root: string): Snapshot {
  const out: Snapshot = new Map()
  walk(root, '', out)
  return out
}

function diffSnapshots(pre: Snapshot, post: Snapshot): { added: string[]; removed: string[]; changed: string[] } {
  const added: string[] = []
  const removed: string[] = []
  const changed: string[] = []
  for (const [path, hash] of post) {
    if (!pre.has(path)) added.push(path)
    else if (pre.get(path) !== hash) changed.push(path)
  }
  for (const path of pre.keys()) {
    if (!post.has(path)) removed.push(path)
  }
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() }
}

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------
type RunResult = { status: number; stdout: string; stderr: string }

function run(bin: string, args: string[], cwd: string): RunResult {
  const result = spawnSync(bin, args, { cwd, encoding: 'utf8' })
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

// ---------------------------------------------------------------------------
// Per-command exercises. Every `status: 'shipped'` entry in `COMMANDS` must
// have a matching key here OR in `EXEMPTIONS` below — checked at start,
// before any network/filesystem work, so a registry that grows silently
// under-covered fails loudly instead of quietly passing fewer commands.
// ---------------------------------------------------------------------------
type Outcome = { status: 'pass' | 'fail'; detail: string }
type Ctx = { bin: string; fixtureDir: string }

// The 5 (of 6) manifest artifacts every downstream exercise needs `init` to
// have written — `.vinaya/doc-owners` is deliberately excluded: it is the
// known, tracked gap (published predates #665), never a blocker for the rest
// of the lifecycle proof.
const CORE_INIT_ARTIFACTS = [
  'vinaya.config.json',
  'VINAYA.md',
  '.github/workflows/vinaya-checks.yml',
  '.github/workflows/vinaya-review.yml'
]
const DOC_OWNERS_PATH = '.vinaya/doc-owners'

// This script's OWN scratch files, written by the exercises that run between
// the pre-init and post-eject snapshots (`pr create`/`issue create` fixture
// bodies, `new check`'s scaffold). Never vinaya-owned, never touched by
// `eject` — real byte-identity noise unrelated to the question "does eject
// reverse init exactly", so excluded from the Part 4 diff.
const SCRATCH_FIXTURE_PATHS = new Set([
  '.pr-body-fixture.md',
  '.issue-body-fixture.md',
  'scripts/vinaya-checks/proof-check.ts'
])

const PR_BODY_FIXTURE = `Tier: 1
Project: vinaya
Closes #705

## Summary
Fixture body used only by verify-published-lifecycle.ts's \`pr create --validate-only\`
exercise — never actually opened as a PR (--validate-only, no network write).

## Test Plan
- [ ] **[agent]** N/A — fixture only, not a real change.
`

const ISSUE_BODY_FIXTURE = `Project: vinaya

**Boundary** — Fixture body used only by verify-published-lifecycle.ts's \`issue create --validate-only\`
exercise; never actually opened (--validate-only, no network write).
**Sizing** — trivial (fixture only).
**Project(s) + blast radius** — vinaya only; no shared package touched.
**Dependency rationale** — none; no depends-on edge.
**Traps to avoid** — none; fixture content only.
**Suggested agent-class** — n/a (fixture).
**Stop-and-escalate** — n/a (fixture; never actually filed).
**Docs to keep coherent** — no-doc-surface
`

const EXEMPTIONS: Record<string, string> = {
  archive:
    '`archive` is a ring-2 post-merge mechanism: it resolves merged PRs and their associated Issues from the ' +
    'live forge (`gh` reads against real merge history) UNCONDITIONALLY — there is no dry-run path that skips ' +
    'the forge. Exercising it genuinely would require a real repo with real merged task PRs and real `gh` ' +
    "credentials reaching the network beyond the npm install, which this script's boundary forbids (same " +
    "reasoning as `issue edit`'s exemption).",
  audit:
    '`audit` is a ring-2 scheduled mechanism: dead-branch drift and direct-main-push detection both derive ' +
    'from live forge state (`gh` branch/PR reads) UNCONDITIONALLY — no offline path exists. Same forge/' +
    'credential boundary as `archive` above; exempt for the same reason as `issue edit`.',
  'issue edit':
    "`issue edit` fetches the target Issue's real labels from the forge (`gh issue view`) UNCONDITIONALLY, " +
    'even under --validate-only — there is no code path that skips it. Exercising it genuinely would require a ' +
    'real target Issue and real `gh` credentials reaching the network beyond the npm install, which the boundary ' +
    "this script runs under forbids (same reasoning as the brief's own network/credential stop condition). " +
    '`pr edit` avoids this: passing only `--title` (no `--body-file`) skips its forge fetch entirely, so it is ' +
    'exercised for real below.'
}

const EXERCISES: Record<string, (ctx: Ctx) => Outcome> = {
  help: ({ bin, fixtureDir }) => {
    const r = run(bin, ['help'], fixtureDir)
    const ok = r.status === 0 && /vinaya/i.test(r.stdout)
    return {
      status: ok ? 'pass' : 'fail',
      detail: `exit ${r.status}, ${r.stdout.split('\n').length} lines of help text`
    }
  },

  version: ({ bin, fixtureDir }) => {
    const plain = run(bin, ['version'], fixtureDir)
    const json = run(bin, ['version', '--json'], fixtureDir)
    let jsonOk = false
    try {
      const parsed = JSON.parse(json.stdout) as { schema?: number; data?: { version?: string } }
      jsonOk = parsed.schema === 1 && parsed.data?.version === PUBLISHED_VERSION
    } catch {
      jsonOk = false
    }
    const ok = plain.status === 0 && plain.stdout.trim() === PUBLISHED_VERSION && json.status === 0 && jsonOk
    return { status: ok ? 'pass' : 'fail', detail: `plain: "${plain.stdout.trim()}", --json schema/version: ${jsonOk}` }
  },

  init: ({ bin, fixtureDir }) => {
    const r = run(bin, ['init', '--yes'], fixtureDir)
    const coreWritten = CORE_INIT_ARTIFACTS.every((p) => existsSync(join(fixtureDir, p)))
    const hookInstalled = existsSync(join(fixtureDir, '.git', 'hooks', 'pre-commit'))
    const docOwnersWritten = existsSync(join(fixtureDir, DOC_OWNERS_PATH))
    const coreOk = r.status === 0 && coreWritten && hookInstalled
    return {
      status: coreOk && docOwnersWritten ? 'pass' : 'fail',
      detail: coreOk
        ? docOwnersWritten
          ? `exit ${r.status}, all 6 manifest artifacts written, hook installed`
          : `exit ${r.status}, ${DOC_OWNERS_PATH} missing from published output`
        : `exit ${r.status}, core artifacts written: ${coreWritten}, hook installed: ${hookInstalled}`
    }
  },

  'init product': ({ bin, fixtureDir }) => {
    const r = run(bin, ['init', 'product', 'demo-product', '--yes'], fixtureDir)
    // No `origin` remote (by design, §11) — the only op is a label, so this is
    // the graceful no-op path, not a crash.
    const ok = r.status === 0 && /Nothing to scaffold/.test(r.stdout)
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}: ${r.stdout.trim().split('\n').pop()}` }
  },

  check: ({ bin, fixtureDir }) => {
    const r = run(bin, ['check', '--all', '--json'], fixtureDir)
    let count = -1
    try {
      const parsed = JSON.parse(r.stdout) as { data?: { checks?: unknown[] } }
      count = parsed.data?.checks?.length ?? -1
    } catch {
      count = -1
    }
    const ok = count === 15
    return {
      status: ok ? 'pass' : 'fail',
      detail: `expected 15 registered core checks (reader-resolvable-prose excluded), published reports ${count}`
    }
  },

  'new check': ({ bin, fixtureDir }) => {
    const r = run(bin, ['new', 'check', 'proof-check'], fixtureDir)
    const created = existsSync(join(fixtureDir, 'scripts', 'vinaya-checks', 'proof-check.ts'))
    const ok = r.status === 0 && created
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}, scaffold created: ${created}` }
  },

  'pr create': ({ bin, fixtureDir }) => {
    const bodyPath = join(fixtureDir, '.pr-body-fixture.md')
    writeFileSync(bodyPath, PR_BODY_FIXTURE, 'utf-8')
    const r = run(
      bin,
      ['pr', 'create', '--title', 'Chore: verify published lifecycle', '--body-file', bodyPath, '--validate-only'],
      fixtureDir
    )
    const ok = r.status === 0 && /PASS/i.test(r.stdout)
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}: ${r.stdout.trim() || r.stderr.trim()}` }
  },

  'pr edit': ({ bin, fixtureDir }) => {
    // `--title` only, no `--body-file`: `prEditCommand` skips its forge fetch
    // entirely when `body === null` — a real, network-free exercise of the
    // command, unlike `issue edit` (see EXEMPTIONS).
    const r = run(
      bin,
      ['pr', 'edit', '999999', '--title', 'Chore: verify published lifecycle edit', '--validate-only'],
      fixtureDir
    )
    const ok = r.status === 0 && /PASS/i.test(r.stdout)
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}: ${r.stdout.trim() || r.stderr.trim()}` }
  },

  'issue create': ({ bin, fixtureDir }) => {
    const bodyPath = join(fixtureDir, '.issue-body-fixture.md')
    writeFileSync(bodyPath, ISSUE_BODY_FIXTURE, 'utf-8')
    const r = run(
      bin,
      [
        'issue',
        'create',
        '--title',
        '[vinaya-cli-v1] 10 — verify published lifecycle (fixture)',
        '--body-file',
        bodyPath,
        '--label',
        'vinaya/tranche:verify-fixture',
        '--validate-only'
      ],
      fixtureDir
    )
    const ok = r.status === 0 && /PASS/i.test(r.stdout)
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}: ${r.stdout.trim() || r.stderr.trim()}` }
  },

  doctor: ({ bin, fixtureDir }) => {
    const r = run(bin, ['doctor', '--json'], fixtureDir)
    let installOk = false
    try {
      const parsed = JSON.parse(r.stdout) as { data?: { findings?: Array<{ check: string; severity: string }> } }
      const findings = parsed.data?.findings ?? []
      installOk = findings.some((f) => f.check === 'config' && (f.severity === 'ok' || f.severity === 'info'))
    } catch {
      installOk = false
    }
    // doctor's overall exit code is gh-auth/branch-protection-dependent
    // (environment, not this script) — the real assertion is that it read
    // back the install this script just performed, not a fixed exit code.
    const ok = (r.status === 0 || r.status === 1) && installOk
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}, recognized this run's install: ${installOk}` }
  },

  upgrade: ({ bin, fixtureDir }) => {
    const r = run(bin, ['upgrade', '--yes'], fixtureDir)
    const ok = r.status === 0 && /already current/i.test(r.stdout)
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}: ${r.stdout.trim()}` }
  },

  'demo break': ({ bin, fixtureDir }) => {
    // Git-local end to end (branch + fixture commit + hook rejection + its own
    // cleanup) — network-free, so it is exercised for real. It refuses on a
    // dirty tree, and earlier exercises leave untracked fixture files behind:
    // commit them first so the refusal path isn't what gets measured.
    git(fixtureDir, ['add', '-A'])
    git(fixtureDir, ['commit', '-m', 'Chore: absorb lifecycle fixtures pre demo-break', '--no-verify', '--allow-empty'])
    const r = run(bin, ['demo', 'break'], fixtureDir)
    const ok = r.status === 0
    return {
      status: ok ? 'pass' : 'fail',
      detail: `exit ${r.status}: ${(r.stdout || r.stderr).trim().split('\n').filter(Boolean).pop()}`
    }
  },

  waiver: ({ bin, fixtureDir }) => {
    // --print-only executes nothing — it prints the `gh` commands a human
    // would run. A real, network-free exercise of the command's whole
    // argument/validation path.
    const r = run(
      bin,
      ['waiver', 'docs', '1', '--reason', 'verify-published-lifecycle fixture', '--print-only'],
      fixtureDir
    )
    const ok = r.status === 0 && /nothing below was executed/i.test(r.stdout)
    return {
      status: ok ? 'pass' : 'fail',
      detail: `exit ${r.status}: ${(r.stdout || r.stderr).trim().split('\n')[0]}`
    }
  },

  studio: ({ bin, fixtureDir }) => {
    const r = run(bin, ['studio'], fixtureDir)
    // The clean, always-expected `missing` refusal (never a real server) —
    // resolveStudioTarget finds no `apps/vinaya/web` walking up from a
    // scratch dir outside the monorepo. Not the demo/waiver/check-count gap.
    const ok = r.status === 1 && /isn't available here/.test(r.stderr)
    return { status: ok ? 'pass' : 'fail', detail: `exit ${r.status}: ${r.stderr.trim()}` }
  }
}

// `init` and `eject` are exercised inline in `main()` (init gates every other
// exercise; eject drives the Part 4 byte-identity proof) rather than through
// the generic `EXERCISES` map — still real, still asserted, just not routed
// through the loop. Named here purely so `coverageCheck` sees them as covered.
const HANDLED_INLINE = new Set(['init', 'eject'])

function coverageCheck(): void {
  const missing = COMMANDS.filter(
    (c) => c.status === 'shipped' && !(c.name in EXERCISES) && !(c.name in EXEMPTIONS) && !HANDLED_INLINE.has(c.name)
  )
  if (missing.length > 0) {
    throw new Error(
      `coverage gap: ${missing.map((c) => `"${c.name}"`).join(', ')} — shipped in the current COMMANDS registry ` +
        'but has neither an exercise nor a stated exemption in this script. Add one before running.'
    )
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  coverageCheck()

  const keep = process.argv.includes('--keep')
  const root = mkdtempSync(join(tmpdir(), 'vinaya-verify-'))

  try {
    assertOutsideWorkspace(root)

    const installDir = join(root, 'install')
    const fixtureDir = join(root, 'fixture')
    mkdirSync(installDir, { recursive: true })
    mkdirSync(fixtureDir, { recursive: true })

    process.stdout.write(`Installing ${PACKAGE_SPEC} from the public npm registry into ${installDir}…\n`)
    execFileSync('npm', ['init', '-y', '--silent'], { cwd: installDir, stdio: 'ignore' })
    execFileSync('npm', ['install', PACKAGE_SPEC, '--no-audit', '--no-fund', '--silent'], {
      cwd: installDir,
      stdio: 'inherit'
    })
    const bin = join(installDir, 'node_modules', '.bin', 'vinaya')
    if (!existsSync(bin)) throw new Error(`npm install succeeded but ${bin} was not produced.`)

    git(fixtureDir, ['init', '-q', '-b', 'main'])
    git(fixtureDir, ['config', 'user.email', 'verify-published-lifecycle@example.com'])
    git(fixtureDir, ['config', 'user.name', 'verify-published-lifecycle'])
    writeFileSync(join(fixtureDir, 'README.md'), '# verify-published-lifecycle fixture\n')
    git(fixtureDir, ['add', 'README.md'])
    git(fixtureDir, ['commit', '-q', '-m', 'Chore: initial commit'])
    // No `origin` remote is ever added (§11) — the whole run stays credential-free.

    const ctx: Ctx = { bin, fixtureDir }
    const results = new Map<string, Outcome>()

    // Part 4's byte-identity proof: snapshot BEFORE `init` runs, diff against
    // the snapshot taken AFTER `eject` — must be empty (init → eject round-trips
    // the fixture to its exact pre-init state).
    const preSnapshot = snapshot(fixtureDir)

    // `init` must write its CORE artifacts for every downstream exercise
    // (config/hooks it seeds) to be meaningful — `.vinaya/doc-owners` alone
    // missing is the known, tracked gap and must not block the rest of the run.
    const initOutcome = EXERCISES.init?.(ctx)
    const coreArtifactsOk =
      CORE_INIT_ARTIFACTS.every((p) => existsSync(join(fixtureDir, p))) &&
      existsSync(join(fixtureDir, '.git', 'hooks', 'pre-commit'))
    if (!initOutcome || !coreArtifactsOk) {
      throw new Error(
        `\`vinaya init\` did not write its core artifacts against the published artifact — cannot proceed: ${initOutcome?.detail}`
      )
    }
    results.set('init', initOutcome)

    for (const name of [
      'help',
      'version',
      'init product',
      'check',
      'new check',
      'pr create',
      'pr edit',
      'issue create',
      'doctor',
      'upgrade',
      'demo break',
      'waiver',
      'studio'
    ]) {
      const exercise = EXERCISES[name]
      if (!exercise) continue
      results.set(name, exercise(ctx))
    }
    for (const [name, reason] of Object.entries(EXEMPTIONS)) {
      results.set(name, { status: 'pass', detail: `EXEMPT — ${reason}` })
    }

    const ejectRun = run(bin, ['eject', '--yes'], fixtureDir)
    const ejectedCleanly = ejectRun.status === 0 && /Vinaya ejected/i.test(ejectRun.stdout)
    const postSnapshot = snapshot(fixtureDir)
    for (const p of SCRATCH_FIXTURE_PATHS) postSnapshot.delete(p)
    const diff = diffSnapshots(preSnapshot, postSnapshot)
    const byteIdentical = diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0
    results.set('eject', {
      status: ejectedCleanly && byteIdentical ? 'pass' : 'fail',
      detail: byteIdentical
        ? `exit ${ejectRun.status}, byte-identical to pre-init snapshot`
        : `exit ${ejectRun.status}, snapshot diff — added: [${diff.added.join(', ')}], removed: [${diff.removed.join(', ')}], changed: [${diff.changed.join(', ')}]`
    })

    printReport(results)

    const anyFail = [...results.values()].some((o) => o.status === 'fail')
    process.exitCode = anyFail ? 1 : 0
  } finally {
    if (keep) {
      process.stdout.write(`--keep: leaving scratch directory at ${root}\n`)
    } else {
      rmSync(root, { recursive: true, force: true })
    }
  }
}

function printReport(results: Map<string, Outcome>): void {
  process.stdout.write(`\nvinaya verify-published-lifecycle — against ${PACKAGE_SPEC}\n\n`)

  let pass = 0
  let fail = 0
  for (const c of COMMANDS) {
    if (c.status !== 'shipped') continue
    const o = results.get(c.name)
    if (!o) continue
    const symbol = o.status === 'pass' ? '✓' : '✗'
    process.stdout.write(`${symbol} ${c.name.padEnd(16)} ${o.detail}\n`)
    if (o.status === 'pass') pass += 1
    else fail += 1
  }

  process.stdout.write(
    `\n${pass + fail}/${COMMANDS.filter((c) => c.status === 'shipped').length} commands accounted for (${pass} pass, ${fail} fail)\n`
  )
}

main().catch((err) => {
  console.error(`verify-published-lifecycle: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
})
