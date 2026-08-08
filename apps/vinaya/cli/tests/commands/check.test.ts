import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const INDEX = join(CLI_ROOT, 'src', 'index.ts')

let repoDir: string | undefined
let homeDir: string | undefined

afterEach(() => {
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
  if (homeDir) rmSync(homeDir, { recursive: true, force: true })
  repoDir = undefined
  homeDir = undefined
})

describe('vinaya check — global-config checks stripping (Part 3, non-plan path)', () => {
  it("prints the global-config-ignored warning exactly once (regression: two independent loadConfigChecked() calls each fired stripGlobalChecks' console.error)", async () => {
    repoDir = mkdtempSync(join(tmpdir(), 'vinaya-check-repo-'))
    homeDir = mkdtempSync(join(tmpdir(), 'vinaya-check-home-'))
    mkdirSync(join(homeDir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(homeDir, '.vinaya', 'config.json'),
      JSON.stringify({ checks: { 'myteam/global-lint': { run: 'x.ts', scope: 'full' } } }),
      'utf-8'
    )

    const proc = Bun.spawn(['bun', INDEX, 'check', '--all'], {
      cwd: repoDir,
      env: { ...process.env, HOME: homeDir },
      stdout: 'pipe',
      stderr: 'pipe'
    })
    await proc.exited
    const stderr = await new Response(proc.stderr).text()

    const matches = stderr.match(/registration in the global config is ignored/g) ?? []
    expect(matches).toHaveLength(1)
  }, 30000)
})
