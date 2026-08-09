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

describe('nodeSlug (via nodeDocRoute): display-derived anchor', () => {
  it('strips a leading G-code from the anchor, leaving node.id untouched', () => {
    const n = node('check', 'check:g1-implementation-exists', { label: 'G1 — implementation exists', ringIndex: 1 })
    expect(nodeDocRoute(n)).toEqual({ route: '/docs/rings/ring-1', slug: 'implementation-exists' })
    expect(n.id).toBe('check:g1-implementation-exists')
  })

  it('cuts a pathologically long anchor at its first clause boundary', () => {
    const label =
      'Starting the Dig (before authoring a brief) / starting Step 0 (before executing one) / every push on a task branch before its PR exists'
    const n = node('gate', `gate:${label}`, { label, ringIndex: 0 })
    expect(nodeDocRoute(n)?.slug).toBe('starting-the-dig')
  })

  it('leaves an already-short, non-G-coded anchor exactly as `diagram-model.ts` stamped it', () => {
    const n = node('check', 'check:ai-review', { label: 'AI review', ringIndex: 1 })
    expect(nodeDocRoute(n)?.slug).toBe('ai-review')
  })

  it('never mutates node.id or node.label, whatever the anchor becomes', () => {
    const label = 'G3 — no seventh way into GitHub'
    const n = node('check', 'check:g3-no-seventh-way-into-github', { label, ringIndex: 1 })
    nodeDocRoute(n)
    expect(n.id).toBe('check:g3-no-seventh-way-into-github')
    expect(n.label).toBe(label)
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

  it('the anchor slug is never longer than the id-stamped slug it is derived from — never touches node.id/node.label', () => {
    for (const n of model.nodes) {
      const resolved = nodeDocRoute(n)
      const rawSlug = n.id.slice(n.kind.length + 1)
      expect(n.id).toBe(`${n.kind}:${rawSlug}`)
      if (!resolved?.slug) continue
      expect(resolved.slug.length).toBeLessThanOrEqual(rawSlug.length)
    }
  })

  it('exactly the known 6 gate/check anchors differ from their id-stamped slug — the G1-G5 codes and the one over-length gate', () => {
    const changed = model.nodes
      .filter((n) => n.kind === 'gate' || n.kind === 'check')
      .filter((n) => nodeDocRoute(n)?.slug !== n.id.slice(n.kind.length + 1))
      .map((n) => n.id)
      .sort()
    expect(changed).toEqual(
      [
        'check:g1-implementation-exists',
        'check:g2-no-orphan-hook-cli',
        'check:g3-no-seventh-way-into-github',
        'check:g4-cited-forge-numbers-resolve',
        'check:g5-role-contract-integrity',
        'gate:starting-the-dig-before-authoring-a-brief-starting-step-0-before-executing-one-every-push-on-a-task-branch-before-its-pr-exists'
      ].sort()
    )
  })

  it('no action anchor differs from its id-stamped slug — actions are hand-authored ids, not slugify(label)', () => {
    for (const a of model.nodes.filter((n) => n.kind === 'action')) {
      expect(nodeDocRoute(a)?.slug).toBe(a.id.slice(a.kind.length + 1))
    }
  })

  it('every ring-0 gate resolves onto /docs/rings/ring-0, incl. the git-commit anchor', () => {
    const ring0 = model.nodes.filter((n) => n.kind === 'gate' && n.ringIndex === 0)
    expect(ring0.length).toBe(12)
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
