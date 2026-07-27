import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('returns missing when no workspace root is above cwd', () => {
    const target = resolveStudioTarget(tmpDir)
    expect(target).toEqual({ kind: 'missing' })
  })

  it('does not attempt to detect an installed @vinaya/studio package (stub)', () => {
    const fakePackageDir = join(tmpDir, 'node_modules', '@vinaya', 'studio')
    mkdirSync(fakePackageDir, { recursive: true })
    writeFileSync(join(fakePackageDir, 'package.json'), JSON.stringify({ name: '@vinaya/studio' }))

    const target = resolveStudioTarget(tmpDir)

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
    const errorSpy = mock((..._args: unknown[]) => {})
    const originalError = console.error
    console.error = errorSpy

    try {
      const code = await runStudio(tmpDir, [])
      expect(code).toBe(1)
      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy.mock.calls[0]?.[0]).toContain('@vinaya/studio')
    } finally {
      console.error = originalError
    }
  })
})
