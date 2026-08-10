import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveStudioTarget, runStudio } from '../src/commands/studio.js'

describe('resolveStudioTarget', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `vinaya-studio-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('finds the workspace web dir from a nested cwd', () => {
    const webDir = join(tmpDir, 'apps', 'vinaya', 'web')
    mkdirSync(webDir, { recursive: true })
    writeFileSync(join(webDir, 'package.json'), JSON.stringify({ name: '@atta/vinaya-web' }))

    const nestedCwd = join(tmpDir, 'apps', 'vinaya', 'cli', 'src', 'commands')
    mkdirSync(nestedCwd, { recursive: true })

    const target = resolveStudioTarget(nestedCwd)

    expect(target.kind).toBe('workspace')
    if (target.kind === 'workspace') {
      expect(realpathSync(target.webDir)).toBe(realpathSync(webDir))
    }
  })

  it('returns missing when no workspace root is above cwd and no bundle at the (fake) install root', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'fake-pkg-no-bundle' }))
    const fakeModuleUrl = pathToFileURL(join(tmpDir, 'dist', 'index.js')).href

    const target = resolveStudioTarget(tmpDir, fakeModuleUrl)

    expect(target).toEqual({ kind: 'missing' })
  })

  it('finds the bundled standalone build relative to the installed package root', () => {
    const fakeInstallRoot = join(tmpDir, 'node_modules', '@attalabs', 'vinaya')
    const standaloneWebDir = join(fakeInstallRoot, 'studio-standalone', 'apps', 'vinaya', 'web')
    mkdirSync(standaloneWebDir, { recursive: true })
    writeFileSync(join(fakeInstallRoot, 'package.json'), JSON.stringify({ name: '@attalabs/vinaya' }))
    writeFileSync(join(standaloneWebDir, 'server.js'), '// fixture\n')

    const fakeModuleUrl = pathToFileURL(join(fakeInstallRoot, 'dist', 'index.js')).href
    const target = resolveStudioTarget(tmpDir, fakeModuleUrl)

    expect(target.kind).toBe('package')
    if (target.kind === 'package') {
      expect(realpathSync(target.packageDir)).toBe(realpathSync(standaloneWebDir))
    }
  })

  it('returns missing when the installed package root has no studio-standalone bundle', () => {
    const fakeInstallRoot = join(tmpDir, 'node_modules', '@attalabs', 'vinaya')
    mkdirSync(fakeInstallRoot, { recursive: true })
    writeFileSync(join(fakeInstallRoot, 'package.json'), JSON.stringify({ name: '@attalabs/vinaya' }))

    const fakeModuleUrl = pathToFileURL(join(fakeInstallRoot, 'dist', 'index.js')).href
    const target = resolveStudioTarget(tmpDir, fakeModuleUrl)

    expect(target).toEqual({ kind: 'missing' })
  })
})

describe('runStudio', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `vinaya-studio-run-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('names the install and returns 1 when the target is missing', async () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'fake-pkg-no-bundle' }))
    const fakeModuleUrl = pathToFileURL(join(tmpDir, 'dist', 'index.js')).href

    const errorSpy = mock((..._args: unknown[]) => {})
    const originalError = console.error
    console.error = errorSpy

    try {
      const code = await runStudio(tmpDir, [], fakeModuleUrl)
      expect(code).toBe(1)
      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy.mock.calls[0]?.[0]).toContain('@attalabs/vinaya')
    } finally {
      console.error = originalError
    }
  })

  it('spawns the bundled server.js with the CALLER cwd, not the package dir', async () => {
    const fakeInstallRoot = join(tmpDir, 'node_modules', '@attalabs', 'vinaya')
    const standaloneWebDir = join(fakeInstallRoot, 'studio-standalone', 'apps', 'vinaya', 'web')
    mkdirSync(standaloneWebDir, { recursive: true })
    writeFileSync(join(fakeInstallRoot, 'package.json'), JSON.stringify({ name: '@attalabs/vinaya' }))

    const guestRepo = join(tmpDir, 'guest-repo')
    mkdirSync(guestRepo, { recursive: true })
    const cwdProofFile = join(tmpDir, 'cwd-proof.txt')
    // A fake server.js: proves what cwd/env it was actually spawned with,
    // then exits with a recognizable non-zero code — no real Next server
    // needed to test the spawn contract itself.
    writeFileSync(
      join(standaloneWebDir, 'server.js'),
      `require('fs').writeFileSync(${JSON.stringify(cwdProofFile)}, JSON.stringify({ cwd: process.cwd(), port: process.env.PORT }))\nprocess.exit(42)\n`
    )

    const fakeModuleUrl = pathToFileURL(join(fakeInstallRoot, 'dist', 'index.js')).href
    const code = await runStudio(guestRepo, [], fakeModuleUrl)

    expect(code).toBe(42)
    const proof = JSON.parse(readFileSync(cwdProofFile, 'utf-8'))
    expect(realpathSync(proof.cwd)).toBe(realpathSync(guestRepo))
    // 3006 unless something else on the machine already holds it, in which
    // case the same fallback dev.ts already relies on kicks in — either is
    // a correct result, not just an acceptable one.
    expect(['3006', '3106']).toContain(proof.port)
  })
})
