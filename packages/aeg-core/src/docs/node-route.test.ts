import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deriveDiagramModel } from '../diagram-model'
import type { DiagramNode } from '../diagram-model'
import type { DoctrineContent } from '../doctrine-source'
import { nodeDocHref, nodeDocRoute } from './node-route'

function node(kind: DiagramNode['kind'], id: string, extra: Partial<DiagramNode> = {}): DiagramNode {
  return { id, kind, label: id, renderState: 'active', ...extra }
}

describe('nodeDocRoute: granularity follows content size', () => {
  it('a role owns its page — its own route, no anchor', () => {
    expect(nodeDocRoute(node('role', 'role:developer', { label: 'developer' }))).toEqual({
      route: '/docs/roles/developer',
      slug: null
    })
  })

  it('a contract owns its page — its own route, no anchor', () => {
    expect(nodeDocRoute(node('contract', 'contract:brief-developer', { label: 'brief-developer' }))).toEqual({
      route: '/docs/contracts/brief-developer',
      slug: null
    })
  })

  it('a gate is an anchored section on its ring page', () => {
    expect(nodeDocRoute(node('gate', 'gate:git-commit', { ringIndex: 0 }))).toEqual({
      route: '/docs/rings/ring-0',
      slug: 'git-commit'
    })
  })

  it('a check is an anchored section on its ring page', () => {
    expect(nodeDocRoute(node('check', 'check:verify-docs', { ringIndex: 1 }))).toEqual({
      route: '/docs/rings/ring-1',
      slug: 'verify-docs'
    })
  })

  it('an action is an anchored section on the actions page', () => {
    expect(nodeDocRoute(node('action', 'action:commit-the-work'))).toEqual({
      route: '/docs/actions',
      slug: 'commit-the-work'
    })
  })

  it('a ring maps to its ring page, no anchor', () => {
    expect(nodeDocRoute(node('ring', 'ring:0', { ringIndex: 0 }))).toEqual({ route: '/docs/rings/ring-0', slug: null })
  })
})

describe('nodeDocHref: route + #slug', () => {
  it('appends the anchor for section-sized nodes, omits it for page-sized ones', () => {
    expect(nodeDocHref(node('gate', 'gate:merging', { ringIndex: 0 }))).toBe('/docs/rings/ring-0#merging')
    expect(nodeDocHref(node('action', 'action:grant-a-waiver'))).toBe('/docs/actions#grant-a-waiver')
    expect(nodeDocHref(node('role', 'role:planner', { label: 'planner' }))).toBe('/docs/roles/planner')
  })
})

// --- Real-file cross-check (pattern: diagram-model.test.ts) ---------------

const REPO_ROOT = join(import.meta.dirname, '../../../..')

function loadRealDoctrine(): DoctrineContent {
  const root = join(REPO_ROOT, 'aeg-root')
  const readDir = (dir: string) =>
    readdirSync(join(root, dir))
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((file) => ({ path: join(dir, file), content: readFileSync(join(root, dir, file), 'utf8') }))
  return {
    enforcement: readFileSync(join(root, 'enforcement.md'), 'utf8'),
    roles: readDir('roles'),
    contracts: readDir('contracts')
  }
}

describe('nodeDocRoute: against the real model', () => {
  const model = deriveDiagramModel(loadRealDoctrine(), null, null)

  it('the anchor slug matches the slug aeg-core stamped into the node id', () => {
    for (const n of model.nodes) {
      const resolved = nodeDocRoute(n)
      if (!resolved?.slug) continue
      expect(n.id).toBe(`${n.kind}:${resolved.slug}`)
    }
  })

  it('every ring-0 gate resolves onto /docs/rings/ring-0, incl. the git-commit anchor', () => {
    const ring0 = model.nodes.filter((n) => n.kind === 'gate' && n.ringIndex === 0)
    expect(ring0.length).toBe(11)
    for (const g of ring0) expect(nodeDocRoute(g)?.route).toBe('/docs/rings/ring-0')
    expect(model.nodes.some((n) => n.kind === 'gate' && nodeDocRoute(n)?.slug === 'git-commit')).toBe(true)
  })

  it('every one of the 10 actions resolves onto /docs/actions with its ACTIONS id as slug', () => {
    const actions = model.nodes.filter((n) => n.kind === 'action')
    expect(actions.length).toBe(10)
    for (const a of actions) {
      const r = nodeDocRoute(a)
      expect(r?.route).toBe('/docs/actions')
      expect(a.id).toBe(`action:${r?.slug}`)
    }
    expect(model.nodes.some((n) => n.kind === 'action' && nodeDocRoute(n)?.slug === 'commit-the-work')).toBe(true)
  })

  it('all 8 roles and 6 contracts get their own anchorless page', () => {
    const roles = model.nodes.filter((n) => n.kind === 'role')
    const contracts = model.nodes.filter((n) => n.kind === 'contract')
    expect(roles.length).toBe(8)
    expect(contracts.length).toBe(6)
    for (const n of [...roles, ...contracts]) {
      const r = nodeDocRoute(n)
      expect(r?.slug).toBeNull()
      expect(r?.route).toBe(`/docs/${n.kind === 'role' ? 'roles' : 'contracts'}/${n.label}`)
    }
  })
})
