import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DoctorDeps } from '../src/commands/doctor.js'
import { runDoctor } from '../src/commands/doctor.js'
import type { InitDeps } from '../src/commands/init.js'
import { runInit } from '../src/commands/init.js'
import type { UpgradeDeps } from '../src/commands/upgrade.js'
import { runUpgrade } from '../src/commands/upgrade.js'
import { CHECKS_WORKFLOW_PATH, CONFIG_PATH } from '../src/lib/artifacts.js'
import type { LabelGateway } from '../src/lib/ops.js'

let root: string

function initDeps(overrides: Partial<InitDeps> = {}): InitDeps {
  const labels: LabelGateway = {
    async exists() {
      return false
    },
    async create() {}
  }
  return {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    checkGhAuth: async () => true,
    labelGateway: () => labels,
    hookDirFor: () => '.husky',
    customHooksPath: async () => null,
    confirm: async () => true,
    ...overrides
  }
}

function upgradeDeps(overrides: Partial<UpgradeDeps> = {}): UpgradeDeps {
  return {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    hookDirFor: () => '.husky',
    confirm: async () => true,
    ...overrides
  }
}

function doctorDeps(overrides: Partial<DoctorDeps> = {}): DoctorDeps {
  return {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    ghAuthStatus: async () => ({ authenticated: true, detail: 'ok' }),
    branchProtectionConfigured: async () => null,
    hookDirFor: () => '.husky',
    nodeVersion: () => 'v99.0.0',
    bunVersion: () => null,
    packageVersion: () => '0.1.0-test',
    ...overrides
  }
}

async function captureStdout(fn: () => Promise<unknown>): Promise<string> {
  const original = process.stdout.write.bind(process.stdout)
  let buf = ''
  process.stdout.write = ((chunk: string) => {
    buf += chunk
    return true
  }) as typeof process.stdout.write
  try {
    await fn()
  } finally {
    process.stdout.write = original
  }
  return buf
}

beforeEach(() => {
  root = join(tmpdir(), `vinaya-upgrade-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'README.md'), '# widget\n')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('vinaya upgrade', () => {
  it('is a clean no-op on a repo that is already current', async () => {
    await runInit(['--yes'], initDeps())
    let rc = -1
    const out = await captureStdout(async () => {
      rc = await runUpgrade(['--yes'], upgradeDeps())
    })
    expect(rc).toBe(0)
    expect(out).toContain('already current')
  })

  it('--dry-run shows the regeneration diff and writes nothing', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: hand-edited\n')
    const before = readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')

    const out = await captureStdout(() => runUpgrade(['--dry-run'], upgradeDeps()))
    expect(out).toContain('regenerate')
    expect(out).toContain(CHECKS_WORKFLOW_PATH)
    expect(out).toContain('nothing was written')
    expect(readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')).toBe(before) // unchanged
  })

  it('regenerates a drifted workflow, then doctor reports clean', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: hand-edited\n')

    let rc = -1
    await captureStdout(async () => {
      rc = await runUpgrade(['--yes'], upgradeDeps())
    })
    expect(rc).toBe(0)
    expect(readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')).not.toBe('name: hand-edited\n')
    expect(readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')).toContain('Vinaya Checks')

    const doctorRc = await runDoctor([], doctorDeps())
    expect(doctorRc).toBe(0)
  })

  it('recreates a missing (fresh-clone-drifted) hook host', async () => {
    await runInit(['--yes'], initDeps())
    rmSync(join(root, '.husky/pre-commit'))

    let rc = -1
    await captureStdout(async () => {
      rc = await runUpgrade(['--yes'], upgradeDeps())
    })
    expect(rc).toBe(0)
    expect(existsSync(join(root, '.husky/pre-commit'))).toBe(true)
    expect(readFileSync(join(root, '.husky/pre-commit'), 'utf-8')).toContain('vinaya:managed:pre-commit')

    const doctorRc = await runDoctor([], doctorDeps())
    expect(doctorRc).toBe(0)
  })

  it('restores a corrupted managed block, keeping the adopter host file', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, '.husky/pre-push'), '#!/usr/bin/env sh\necho not-vinaya-anymore\n')

    let rc = -1
    await captureStdout(async () => {
      rc = await runUpgrade(['--yes'], upgradeDeps())
    })
    expect(rc).toBe(0)
    const content = readFileSync(join(root, '.husky/pre-push'), 'utf-8')
    expect(content).toContain('echo not-vinaya-anymore') // adopter line survives
    expect(content).toContain('vinaya:managed:pre-push')
  })

  it("never touches vinaya.config.json's adopter-owned keys (rings/checks/briefSchema)", async () => {
    await runInit(['--yes'], initDeps())
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    cfg.rings.ring1_forgeWriteInterception = true
    cfg.checks = { custom: { run: 'scripts/vinaya-checks/custom.ts', scope: 'full' } }
    writeFileSync(join(root, CONFIG_PATH), `${JSON.stringify(cfg, null, 2)}\n`)

    // force a real regeneration alongside the adopter edit
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: hand-edited\n')

    await captureStdout(() => runUpgrade(['--yes'], upgradeDeps()))

    const after = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    expect(after.rings.ring1_forgeWriteInterception).toBe(true)
    expect(after.checks).toEqual({ custom: { run: 'scripts/vinaya-checks/custom.ts', scope: 'full' } })
    // manifest itself was still regenerated (version stamped)
    expect(after.managed.version).toBeDefined()
  })

  it('leaves foreign (non-vinaya-owned) content at a vinaya path untouched', async () => {
    await runInit(['--yes'], initDeps())
    // Drop DOCTRINE_POINTER_PATH from the manifest so upgrade sees it as
    // foreign (present on disk, not owned), and hand-edit its content —
    // alongside a real drift elsewhere so the run isn't a trivial no-op.
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    cfg.managed.files = cfg.managed.files.filter((f: string) => f !== 'VINAYA.md')
    writeFileSync(join(root, CONFIG_PATH), `${JSON.stringify(cfg, null, 2)}\n`)
    writeFileSync(join(root, 'VINAYA.md'), '# my own notes, not vinaya-generated\n')
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: hand-edited\n')

    const out = await captureStdout(() => runUpgrade(['--yes'], upgradeDeps()))
    expect(out).toContain('REFUSE')
    expect(readFileSync(join(root, 'VINAYA.md'), 'utf-8')).toBe('# my own notes, not vinaya-generated\n')
    // the real drift elsewhere still got regenerated
    expect(readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')).not.toBe('name: hand-edited\n')
  })

  it('refuses when vinaya is not initialized', async () => {
    const rc = await runUpgrade(['--yes'], upgradeDeps())
    expect(rc).toBe(1)
    expect(existsSync(join(root, CONFIG_PATH))).toBe(false)
  })

  it('refuses on a non-git-repo', async () => {
    const rc = await runUpgrade(['--yes'], upgradeDeps({ detectRepo: async () => null }))
    expect(rc).toBe(1)
  })

  it('refuses when the manifest version is newer than the installed package understands', async () => {
    await runInit(['--yes'], initDeps())
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    cfg.managed.version = 999
    writeFileSync(join(root, CONFIG_PATH), `${JSON.stringify(cfg, null, 2)}\n`)

    const rc = await runUpgrade(['--yes'], upgradeDeps())
    expect(rc).toBe(1)
  })

  it('aborting the confirmation writes nothing', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: hand-edited\n')

    const rc = await runUpgrade([], upgradeDeps({ confirm: async () => false }))
    expect(rc).toBe(0)
    expect(readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')).toBe('name: hand-edited\n')
  })
})
