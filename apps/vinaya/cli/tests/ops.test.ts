import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { LabelGateway, Op } from '../src/lib/ops.js'
import { applyEject, applyInstall, planEject, planInstall, renderInstallDiff } from '../src/lib/ops.js'
import type { ManagedManifest } from '../src/lib/config.js'

function scratch(): string {
  const dir = join(tmpdir(), `vinaya-ops-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

const noLabels: LabelGateway = {
  async exists() {
    return true // "already exists" → never created, never recorded
  },
  async create() {}
}

const recordingLabels = (created: string[]): LabelGateway => ({
  async exists() {
    return false
  },
  async create(name) {
    created.push(name)
  }
})

const ops: Op[] = [
  { kind: 'create-file', path: '.github/workflows/vinaya-checks.yml', content: 'name: checks\n', group: 'wf' },
  {
    kind: 'managed-block',
    path: '.husky/pre-commit',
    marker: 'pre-commit',
    body: 'vinaya check --all --diff-only',
    comment: 'hash',
    hostPreamble: '#!/usr/bin/env sh\n',
    mode: 0o755,
    group: 'hooks'
  },
  { kind: 'create-label', name: 'tier:0', color: 'ededed', description: 'trivial', group: 'labels' }
]

describe('planInstall', () => {
  it('classifies fresh create/create-host on an empty repo', () => {
    const root = scratch()
    const plan = planInstall(ops, root)
    const create = plan.entries.find((e) => e.kind === 'create-file')
    const block = plan.entries.find((e) => e.kind === 'managed-block')
    expect(create?.kind === 'create-file' && create.action).toBe('create')
    expect(block?.kind === 'managed-block' && block.action).toBe('create-host')
    expect(plan.hasRefusals).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('refuses to overwrite foreign content at a create-file path', () => {
    const root = scratch()
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, '.github/workflows/vinaya-checks.yml'), 'name: someone-elses\n')
    const plan = planInstall(ops, root)
    const create = plan.entries.find((e) => e.kind === 'create-file')
    expect(create?.kind === 'create-file' && create.action).toBe('refuse-foreign')
    expect(plan.hasRefusals).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it('appends a managed block to a pre-existing adopter hook instead of clobbering', () => {
    const root = scratch()
    mkdirSync(join(root, '.husky'), { recursive: true })
    writeFileSync(join(root, '.husky/pre-commit'), '#!/usr/bin/env sh\nnpm test\n')
    const plan = planInstall(ops, root)
    const block = plan.entries.find((e) => e.kind === 'managed-block')
    expect(block?.kind === 'managed-block' && block.action).toBe('append')
    rmSync(root, { recursive: true, force: true })
  })
})

describe('applyInstall → dry-run equals install', () => {
  it('writes exactly the content the diff shows', async () => {
    const root = scratch()
    const plan = planInstall(ops, root)
    const diff = renderInstallDiff(plan)
    await applyInstall(plan, root, noLabels)
    const written = readFileSync(join(root, '.github/workflows/vinaya-checks.yml'), 'utf-8')
    expect(written).toBe('name: checks\n')
    // The diff the user would confirm contained that exact content.
    expect(diff).toContain('name: checks')
    rmSync(root, { recursive: true, force: true })
  })

  it('records created labels in the manifest, skips existing ones', async () => {
    const root = scratch()
    const created: string[] = []
    const plan = planInstall(ops, root)
    const manifest = await applyInstall(plan, root, recordingLabels(created))
    expect(created).toEqual(['tier:0'])
    expect(manifest.labels).toEqual(['tier:0'])
    rmSync(root, { recursive: true, force: true })
  })
})

describe('eject round-trip', () => {
  it('deletes vinaya-created files and reports labels, never deletes them', async () => {
    const root = scratch()
    const plan = planInstall(ops, root)
    const manifest = await applyInstall(plan, root, noLabels)
    manifest.labels = ['tier:0'] // as if created

    const ejectPlan = planEject(manifest, root)
    const { removedLabelsToReport } = applyEject(ejectPlan, root)

    expect(existsSync(join(root, '.github/workflows/vinaya-checks.yml'))).toBe(false)
    expect(removedLabelsToReport).toEqual(['tier:0'])
    rmSync(root, { recursive: true, force: true })
  })

  it('strips only the managed block, keeping the adopter hook + their lines', async () => {
    const root = scratch()
    mkdirSync(join(root, '.husky'), { recursive: true })
    const adopterHook = '#!/usr/bin/env sh\nnpm test\n'
    writeFileSync(join(root, '.husky/pre-commit'), adopterHook)

    const plan = planInstall(ops, root)
    const manifest = await applyInstall(plan, root, noLabels)

    // block appended; adopter lines still present
    const afterInstall = readFileSync(join(root, '.husky/pre-commit'), 'utf-8')
    expect(afterInstall).toContain('npm test')
    expect(afterInstall).toContain('vinaya:managed:pre-commit')

    applyEject(planEject(manifest, root), root)

    const afterEject = readFileSync(join(root, '.husky/pre-commit'), 'utf-8')
    expect(afterEject).toContain('npm test')
    expect(afterEject).not.toContain('vinaya:managed')
    expect(existsSync(join(root, '.husky/pre-commit'))).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it('deletes a vinaya-CREATED hook host entirely on eject', async () => {
    const root = scratch()
    const plan = planInstall(ops, root) // no pre-existing hook → create-host
    const manifest = await applyInstall(plan, root, noLabels)
    expect(existsSync(join(root, '.husky/pre-commit'))).toBe(true)

    applyEject(planEject(manifest, root), root)
    // vinaya created the host (shebang + block only) → removed whole
    expect(existsSync(join(root, '.husky/pre-commit'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })
})

describe('planEject on a corrupt/missing manifest is caller-guarded', () => {
  it('produces no destructive action for empty records', () => {
    const empty: ManagedManifest = { version: 1, files: [], blocks: [], labels: [] }
    const plan = planEject(empty, scratch())
    expect(plan.actions).toEqual([])
  })
})
