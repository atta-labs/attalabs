import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CheckSpec } from '../src/checks/contract'
import { runChecks } from '../src/checks/runner'

const CLI_ENTRY = join(import.meta.dir, '..', 'src', 'index.ts')

let tmpDir: string | undefined

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true })
    tmpDir = undefined
  }
})

describe('vinaya new check (scaffold round-trip)', () => {
  it('generates a check that runs through runChecks unmodified and emits a valid CheckError', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vinaya-new-check-'))

    const proc = Bun.spawn(['bun', CLI_ENTRY, 'new', 'check', 'demo-check'], {
      cwd: tmpDir,
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const exitCode = await proc.exited
    expect(exitCode).toBe(0)

    const generatedPath = join(tmpDir, 'scripts', 'vinaya-checks', 'demo-check.ts')
    expect(existsSync(generatedPath)).toBe(true)

    const spec: CheckSpec = { name: 'demo-check', run: generatedPath, scope: 'diff' }
    const [outcome] = await runChecks([spec], {
      parallel: 1,
      diffOnly: false,
      changedFiles: null,
      defaultTimeoutMs: 5000
    })

    expect(outcome?.status).toBe('fail')
    expect(outcome?.exitCode).toBe(1)
    expect(outcome?.errors).toHaveLength(1)
    expect(outcome?.errors[0]?.check).toBe('demo-check')
    expect(outcome?.errors[0]?.schema).toBe(1)
    expect(outcome?.errors[0]?.agent_recovery_prompt).toBeTruthy()
  })
})
