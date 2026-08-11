import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import type { DoctorDeps, Finding } from '../src/commands/doctor.js'
import { runDoctor } from '../src/commands/doctor.js'
import type { InitDeps } from '../src/commands/init.js'
import { runInit } from '../src/commands/init.js'
import { DOC_OWNERS_PATH } from '@atta/aeg-core'
import { CHECKS_WORKFLOW_PATH, CONFIG_PATH, DOCTRINE_POINTER_PATH } from '../src/lib/artifacts.js'
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

function doctorDeps(overrides: Partial<DoctorDeps> = {}): DoctorDeps {
  return {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    ghAuthStatus: async () => ({ authenticated: true, detail: 'Logged in to github.com as tester' }),
    branchProtectionConfigured: async () => null,
    hookDirFor: () => '.husky',
    nodeVersion: () => 'v99.0.0',
    bunVersion: () => 'test-bun',
    packageVersion: () => '0.1.0-test',
    ...overrides
  }
}

/** Recursive snapshot of the fixture tree: relative path → content. */
function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out.set(relative(dir, p), readFileSync(p, 'utf-8'))
    }
  }
  walk(dir)
  return out
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

async function runDoctorJson(overrides: Partial<DoctorDeps> = {}): Promise<{ healthy: boolean; findings: Finding[] }> {
  const original = process.stdout.write.bind(process.stdout)
  let buf = ''
  process.stdout.write = ((chunk: string) => {
    buf += chunk
    return true
  }) as typeof process.stdout.write
  try {
    await runDoctor(['--json'], doctorDeps(overrides))
  } finally {
    process.stdout.write = original
  }
  return JSON.parse(buf).data
}

beforeEach(() => {
  root = join(tmpdir(), `vinaya-doctor-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'README.md'), '# widget\n')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('vinaya doctor — never mutates', () => {
  it('reports healthy on a clean install, and the tree is byte-identical before and after', async () => {
    await runInit(['--yes'], initDeps())
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(true)
    expect(report.findings.every((f) => f.severity === 'ok' || f.severity === 'info')).toBe(true)

    expect(snapshot(root)).toEqual(before)
  })

  it('exits 0 on a healthy repo and 1 when findings exist', async () => {
    await runInit(['--yes'], initDeps())
    let rc = -1
    let out = ''
    out = await captureStdout(async () => {
      rc = await runDoctor([], doctorDeps())
    })
    expect(rc).toBe(0)
    expect(out).toContain('Healthy')

    rmSync(join(root, '.husky/pre-commit'))
    out = await captureStdout(async () => {
      rc = await runDoctor([], doctorDeps())
    })
    expect(rc).toBe(1)
    expect(out).toContain('hooks')
  })

  it('flags a deleted hook without recreating it', async () => {
    await runInit(['--yes'], initDeps())
    rmSync(join(root, '.husky/pre-commit'))
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'hooks' && f.message.includes('pre-commit'))
    expect(hit?.severity).toBe('error')
    expect(hit?.message).toContain('missing')

    expect(snapshot(root)).toEqual(before) // doctor fixed nothing
  })

  it('flags a corrupted managed block (markers stripped) without fixing it', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, '.husky/pre-push'), '#!/usr/bin/env sh\necho not-a-vinaya-hook-anymore\n')
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'hooks' && f.message.includes('pre-push'))
    expect(hit?.severity).toBe('error')
    expect(hit?.message).toMatch(/missing or corrupted/)

    expect(snapshot(root)).toEqual(before)
  })

  it('flags a broken vinaya.config.json (invalid JSON) without fixing it', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, CONFIG_PATH), '{ this is not json')
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'config')
    expect(hit?.severity).toBe('error')
    expect(hit?.message).toContain('invalid')

    expect(snapshot(root)).toEqual(before)
  })

  it('flags a removed workflow without recreating it', async () => {
    await runInit(['--yes'], initDeps())
    rmSync(join(root, CHECKS_WORKFLOW_PATH))
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'workflows' && f.message.includes(CHECKS_WORKFLOW_PATH))
    expect(hit?.severity).toBe('error')

    expect(snapshot(root)).toEqual(before)
  })

  it('flags a drifted workflow (content differs from the current generator) without fixing it', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: hand-edited\n')
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'workflows' && f.message.includes(CHECKS_WORKFLOW_PATH))
    expect(hit?.severity).toBe('warn')
    expect(hit?.message).toContain('drifted')

    expect(snapshot(root)).toEqual(before)
  })

  it('does not flag .vinaya/doc-owners as drifted once a real binding is added (found live: was recommending `vinaya upgrade`, which would have wiped it)', async () => {
    await runInit(['--yes'], initDeps())
    writeFileSync(join(root, DOC_OWNERS_PATH), 'apps/foo/src/**  apps/foo/specs/foo.md\n', { flag: 'a' })

    const report = await runDoctorJson()
    const hit = report.findings.find((f) => f.message.includes(DOC_OWNERS_PATH))
    expect(hit?.severity).toBe('ok')
    expect(hit?.message).not.toContain('drift')
  })

  it('flags a dropped manifest entry (file present on disk, absent from `managed.files`)', async () => {
    await runInit(['--yes'], initDeps())
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    cfg.managed.files = cfg.managed.files.filter((f: string) => f !== DOCTRINE_POINTER_PATH)
    writeFileSync(join(root, CONFIG_PATH), `${JSON.stringify(cfg, null, 2)}\n`)
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'doctrine-pointer' && f.message.includes("isn't recorded"))
    expect(hit?.severity).toBe('warn')

    expect(snapshot(root)).toEqual(before)
  })

  it('flags a custom check pointing at a missing script', async () => {
    await runInit(['--yes'], initDeps())
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    cfg.checks = { ghost: { run: 'scripts/vinaya-checks/ghost.ts', scope: 'full' } }
    writeFileSync(join(root, CONFIG_PATH), `${JSON.stringify(cfg, null, 2)}\n`)
    const before = snapshot(root)

    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    const hit = report.findings.find((f) => f.check === 'checks')
    expect(hit?.severity).toBe('error')
    expect(hit?.message).toContain('ghost')

    expect(snapshot(root)).toEqual(before)
  })

  it('reports "not initialized" on a repo that never ran init, and still writes nothing', async () => {
    const before = snapshot(root)
    const report = await runDoctorJson()
    expect(report.healthy).toBe(false)
    expect(report.findings.some((f) => f.check === 'install')).toBe(true)
    expect(snapshot(root)).toEqual(before)
  })

  it('refuses on a non-git-repo', async () => {
    let rc = -1
    await captureStdout(async () => {
      rc = await runDoctor([], doctorDeps({ detectRepo: async () => null }))
    })
    expect(rc).toBe(1)
  })

  it('does not let environment/branch-protection info findings affect health', async () => {
    await runInit(['--yes'], initDeps())
    const report = await runDoctorJson({
      ghAuthStatus: async () => ({ authenticated: false, detail: 'not logged in' }),
      branchProtectionConfigured: async () => false
    })
    // gh-not-authenticated is a warn (findings, not healthy) but branch
    // protection unconfigured is info-only — assert the two are distinguished.
    const auth = report.findings.find((f) => f.check === 'environment' && f.message.startsWith('gh:'))
    const bp = report.findings.find((f) => f.check === 'branch-protection')
    expect(auth?.severity).toBe('warn')
    expect(bp?.severity).toBe('info')
  })
})
