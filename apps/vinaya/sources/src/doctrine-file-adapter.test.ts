import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createFileDoctrineSource } from './doctrine-file-adapter'

const REPO_ROOT = join(import.meta.dir, '../../../..')

describe('createFileDoctrineSource — configured root', () => {
  let tmpRoot: string
  let root: string

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'vinaya-sources-doctrine-'))
    root = join(tmpRoot, 'aeg-root')
    mkdirSync(join(root, 'roles'), { recursive: true })
    mkdirSync(join(root, 'contracts'), { recursive: true })
    writeFileSync(join(root, 'enforcement.md'), '## Ring 0 — Prevention\n', 'utf-8')
    writeFileSync(join(root, 'roles', 'b-role.md'), '---\nrole_id: b\n---\n', 'utf-8')
    writeFileSync(join(root, 'roles', 'a-role.md'), '---\nrole_id: a\n---\n', 'utf-8')
    writeFileSync(join(root, 'contracts', 'c1.md'), '---\ncontract_id: c1\n---\n', 'utf-8')
    // A non-.md file must be ignored.
    writeFileSync(join(root, 'roles', 'README.txt'), 'ignore me', 'utf-8')
  })

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('reads enforcement + roles + contracts from the configured root', async () => {
    const doctrine = await createFileDoctrineSource({ root }).getDoctrine()
    expect(doctrine.enforcement).toContain('Ring 0')
    expect(doctrine.roles).toHaveLength(2)
    expect(doctrine.contracts).toHaveLength(1)
    expect(doctrine.contracts[0]?.content).toContain('contract_id: c1')
  })

  it('lists markdown files sorted by filename, ignoring non-.md files', async () => {
    const doctrine = await createFileDoctrineSource({ root }).getDoctrine()
    expect(doctrine.roles.map((r) => r.path)).toEqual([join('roles', 'a-role.md'), join('roles', 'b-role.md')])
  })
})

describe('createFileDoctrineSource — real aeg-root/', () => {
  it('reads this repo real doctrine files', async () => {
    const doctrine = await createFileDoctrineSource({ root: join(REPO_ROOT, 'aeg-root') }).getDoctrine()
    expect(doctrine.enforcement).toContain('Ring 0')
    // 8 role files, per aeg-core actions.test.ts's own invariant.
    expect(doctrine.roles).toHaveLength(8)
    expect(doctrine.contracts.length).toBeGreaterThan(0)
    expect(doctrine.roles.every((r) => r.path.startsWith('roles/'))).toBe(true)
  })
})
