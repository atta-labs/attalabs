import { describe, expect, it } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { coreCheckRegistry } from '../../src/checks/registry.js'
import { packageRoot } from '../../src/lib/package-root.js'

// vinaya-cli-v1 task 7, Correction 2 — regression coverage for all three root
// causes a live [principal] test-plan run found two layers deep in code this
// PR's own diff didn't originally touch: `demo break` (and therefore any real
// `npx vinaya check` an installed hook runs) failed once bundled, and leaked
// THIS repo's own forge/tranche facts into whatever repo actually invoked it.

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function initFixture(name: string): string {
  const root = join(tmpdir(), `vinaya-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  git(root, ['init', '-q', '-b', 'main'])
  git(root, ['config', 'user.email', 'test@example.com'])
  git(root, ['config', 'user.name', 'Test'])
  writeFileSync(join(root, 'README.md'), '# fixture\n')
  git(root, ['add', 'README.md'])
  git(root, ['commit', '-q', '-m', 'Chore: initial commit'])
  return root
}

describe('RC1 — packageRoot() resolves regardless of the calling module’s depth', () => {
  let tmpRoot: string

  it('walks up to package.json from both a "source" depth and a "bundled" depth, landing on the SAME package root', () => {
    tmpRoot = join(tmpdir(), `vinaya-rc1-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const pkgRoot = join(tmpRoot, 'fake-pkg')
    // Mirrors this workspace's real shape: `src/checks/bin/*.ts` unbundled,
    // vs. a single-file `dist/index.js` once bundled — two genuinely
    // different depths from the same package root, exactly the case a fixed
    // `../..`/`../../../../../..` walk cannot handle for both at once.
    const sourceDepthDir = join(pkgRoot, 'src', 'checks', 'bin')
    const bundledDepthDir = join(pkgRoot, 'dist')
    mkdirSync(sourceDepthDir, { recursive: true })
    mkdirSync(bundledDepthDir, { recursive: true })
    writeFileSync(join(pkgRoot, 'package.json'), JSON.stringify({ name: 'fake-pkg' }))
    writeFileSync(join(sourceDepthDir, 'check-example.ts'), '// fixture\n')
    writeFileSync(join(bundledDepthDir, 'index.js'), '// fixture\n')

    const fromSource = packageRoot(pathToFileURL(join(sourceDepthDir, 'check-example.ts')).href)
    const fromBundle = packageRoot(pathToFileURL(join(bundledDepthDir, 'index.js')).href)

    expect(fromSource).toBe(pkgRoot)
    expect(fromBundle).toBe(pkgRoot)
  })

  it('every real coreCheckRegistry() bin path resolves to a file that actually exists on disk', () => {
    for (const spec of coreCheckRegistry()) {
      expect(existsSync(spec.run), `${spec.name}'s run path does not exist: ${spec.run}`).toBe(true)
    }
  })
})

describe('RC3 — reader-resolvable-prose is not part of the adopter-facing registry', () => {
  it('coreCheckRegistry() no longer contains a reader-resolvable-prose entry (5 checks → 4)', () => {
    const specs = coreCheckRegistry()
    expect(specs.length).toBe(4)
    expect(specs.map((s) => s.name).sort()).toEqual(['brief-shape', 'coherence', 'dispatch-readiness', 'doc-coverage'])
    expect(specs.find((s) => s.name === 'reader-resolvable-prose')).toBeUndefined()
  })

  it('`vinaya check --all` in a plain fixture repo (no aeg-root/, no apps/vinaya/web/) passes clean with no reader-resolvable-prose output', () => {
    const root = initFixture('rc3')
    try {
      const indexTs = join(import.meta.dir, '..', '..', 'src', 'index.ts')
      const result = spawnSync('bun', [indexTs, 'check', '--all', '--diff-only'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PR_BODY: undefined }
      })
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0)
      expect(result.stdout).not.toContain('reader-resolvable-prose')
      expect(result.stderr).not.toContain('reader-resolvable-prose')
      expect(result.stderr).not.toContain('aeg-root/glossary.md')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('RC2 — coherence/dispatch-readiness evaluate the CALLER’s repo, never this monorepo’s own', () => {
  it('dispatch-readiness resolves the FIXTURE’s own remote/branch identity, never this repo’s, when run with cwd set to a different repo', () => {
    const root = initFixture('rc2')
    try {
      git(root, ['remote', 'add', 'origin', 'https://github.com/fixture-owner-xyz/fixture-repo-xyz.git'])
      git(root, ['checkout', '-b', 'task/fixture-tranche-xyz/1'])

      const binPath = join(import.meta.dir, '..', '..', 'src', 'checks', 'bin', 'check-dispatch-readiness.ts')
      const result = spawnSync('bun', [binPath], { cwd: root, encoding: 'utf8', env: { ...process.env } })
      const combined = `${result.stdout}\n${result.stderr}`

      // Positive proof: the check resolved and acted on the FIXTURE's own
      // identity (its fake owner/repo and its own branch-derived tranche
      // slug), not a hardcoded/leaked one.
      expect(combined).toContain('fixture-owner-xyz')
      expect(combined).toContain('fixture-tranche-xyz')

      // Negative proof — the actual leak this regression closes: this
      // monorepo's own real forge identity (owner/repo) must never appear.
      // (Not asserting on the absence of "vinaya-cli-v1" — the fixture runs
      // via this repo's own real absolute file path, which legitimately
      // contains that string in a worktree-name segment; that's an artifact
      // of where this test happens to run from, not a leaked forge fact.)
      expect(combined).not.toContain('daniboomerang/attalabs')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }, 20_000)

  it('coherence resolves the FIXTURE’s own remote/branch identity, never this repo’s, when run with cwd set to a different repo', () => {
    const root = initFixture('rc2-coherence')
    try {
      git(root, ['remote', 'add', 'origin', 'https://github.com/fixture-owner-abc/fixture-repo-abc.git'])
      git(root, ['checkout', '-b', 'task/fixture-tranche-abc/1'])

      const binPath = join(import.meta.dir, '..', '..', 'src', 'checks', 'bin', 'check-coherence.ts')
      const result = spawnSync('bun', [binPath], { cwd: root, encoding: 'utf8', env: { ...process.env } })
      const combined = `${result.stdout}\n${result.stderr}`

      // Positive proof: the underlying `gh api` call it shells out to
      // targets the FIXTURE's own owner/repo (visible in the crash's own
      // command-failure message) — resolveRepo() read the fixture's git
      // remote, not this monorepo's.
      expect(combined).toContain('fixture-owner-abc/fixture-repo-abc')
      expect(combined).not.toContain('daniboomerang/attalabs')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }, 20_000)

  // Correction 3: the identical chdir(REPO_ROOT) leak, missed by Correction 2,
  // still live in check-doc-coverage.ts — this is the test that should have
  // existed there and would have caught it. Mirrors the coherence/
  // dispatch-readiness tests above exactly: a real fixture repo, a real
  // `.vinaya/doc-owners` binding that names only the FIXTURE's own file, and
  // a positive/negative assertion on whose diff and whose doc-owners state
  // the check actually evaluated.
  it('doc-coverage evaluates the FIXTURE’s own diff and doc-owners, never this monorepo’s own, when run with cwd set to a different repo', () => {
    const root = initFixture('rc2-doc-coverage')
    try {
      mkdirSync(join(root, '.vinaya'), { recursive: true })
      // A dangling in-repo pointer — FAILS deterministically regardless of
      // PR_BODY/waiver state, so the check's own findings are forced to name
      // whichever repo's diff/doc-owners it actually read.
      writeFileSync(join(root, '.vinaya', 'doc-owners'), 'fixture-marker.ts   .vinaya/nonexistent-fixture-doc.md\n')
      git(root, ['add', '.vinaya/doc-owners'])
      git(root, ['commit', '-q', '-m', 'Chore: add fixture doc-owners'])
      const baseSha = git(root, ['rev-parse', 'HEAD'])

      writeFileSync(join(root, 'fixture-marker.ts'), 'fixture content\n')
      git(root, ['add', 'fixture-marker.ts'])
      git(root, ['commit', '-q', '-m', 'Chore: add the bound fixture file'])

      const binPath = join(import.meta.dir, '..', '..', 'src', 'checks', 'bin', 'check-doc-coverage.ts')
      const result = spawnSync('bun', [binPath], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, BASE_SHA: baseSha, PR_BODY: undefined }
      })
      const combined = `${result.stdout}\n${result.stderr}`

      // Positive proof: the finding names the FIXTURE's own dangling pointer
      // — proof it parsed the fixture's own `.vinaya/doc-owners` content
      // (this repo's real doc-owners has no such binding) and that the
      // fixture's own bound file (matched via the fixture's own diff against
      // the fixture's own baseSha) actually fired the binding.
      expect(combined).toContain('nonexistent-fixture-doc.md')
      expect(result.status).toBe(1)

      // Negative proof — the actual leak: none of this monorepo's own real
      // bound files/docs (from this repo's OWN `.vinaya/doc-owners`) appear.
      expect(combined).not.toContain('daniboomerang/attalabs')
      expect(combined).not.toContain('packages/aeg-core')
      expect(combined).not.toContain('aeg-root/state-machine.md')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }, 20_000)
})
