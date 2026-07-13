import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIONS } from './actions'
import { deriveDiagramModel } from './diagram-model'
import type { DoctrineContent } from './doctrine-source'
import type { Iteration } from './types'

// --- Synthetic fixture doctrine ------------------------------------------

const FIXTURE_ENFORCEMENT = `# Enforcement

## The model: three rings, by where a violation dies

| Ring | Where | What | Who |
|------|-------|------|-----|
| **0 — Prevention** | local | blocked | agent |
| **1 — Detection** | forge | red | author |
| **2 — Audit** | post-merge | flagged | team |

## Ring 0 — Prevention

| Action | Summary | Category | Gate | implementation | lock |
|--------|---------|----------|------|----------------|------|
| \`git push\` | Ever had someone push straight to main? | hook | pre-push | .husky/pre-push | principal |
| Creating a pull request | Ever opened a PR nobody understood? | event | forge gate | .claude/hooks/x.sh | |

## Ring 1 — Detection

| CI check | Summary | Category | Re-verifies | implementation | lock |
|----------|---------|----------|-------------|----------------|------|
| Brief validation | Ever seen an empty PR title? | ci | brief shape | ci.yml | |

## Ring 2 — Audit

| Mechanism | Summary | Category | Catches | implementation | lock |
|-----------|---------|----------|---------|----------------|------|
| Daily drift check | Ever missed slow drift? | event | drift | archivist.yml | |
`

const FIXTURE_DOCTRINE: DoctrineContent = {
  enforcement: FIXTURE_ENFORCEMENT,
  roles: [
    {
      path: 'roles/developer.md',
      content: '---\nrole_id: developer\nactor: agent\nsummary: Ever had someone review their own work?\n---\n'
    },
    {
      path: 'roles/planner.md',
      content: '---\nrole_id: planner\nactor: human\nsummary: Ever had a plan with no rationale?\n---\n'
    },
    { path: 'roles/no-id.md', content: '---\nsidebar_title: Nope\n---\n' } // skipped, no role_id
  ],
  contracts: [
    {
      path: 'contracts/planner-brief.md',
      content:
        '---\ncontract_id: planner-brief\nproducer: planner\nconsumer: developer\nsummary: Ever had a hand-off lose details?\n---\n'
    },
    { path: 'contracts/no-id.md', content: '---\nstatus: draft\n---\n' } // skipped, no contract_id
  ]
}

const FIXTURE_ITERATION: Iteration = {
  name: 'fixture-iter',
  lifecycle: 'active',
  goal: 'prove the model',
  tasks: [],
  backlog: []
}

describe('deriveDiagramModel — fixture', () => {
  const config = {
    rings: { ring1_forgeWriteInterception: false },
    gates: { 'creating-a-pull-request': false, 'git-push': false, 'no-such-gate': false }
  }
  const model = deriveDiagramModel(FIXTURE_DOCTRINE, config, FIXTURE_ITERATION)
  const byId = (id: string) => model.nodes.find((n) => n.id === id)

  it('emits the expected node counts per kind', () => {
    const count = (kind: string) => model.nodes.filter((n) => n.kind === kind).length
    expect(count('ring')).toBe(3)
    expect(count('gate')).toBe(2)
    expect(count('check')).toBe(2)
    expect(count('action')).toBe(10)
    expect(count('role')).toBe(2) // no-id.md skipped
    expect(count('contract')).toBe(1) // no-id.md skipped
  })

  it('marks a config-disabled gate as disabled', () => {
    expect(byId('gate:creating-a-pull-request')?.renderState).toBe('disabled')
  })

  it('marks a locked gate as locked EVEN when config also disables it', () => {
    const node = byId('gate:git-push')
    expect(node?.lock).toBe('principal')
    expect(node?.renderState).toBe('locked') // config gates['git-push']=false is ignored
  })

  it('disables a ring-1 check via the ring-level switch', () => {
    expect(byId('check:brief-validation')?.renderState).toBe('disabled')
    expect(byId('ring:1')?.renderState).toBe('disabled')
  })

  it('leaves a ring-2 check active when its switch is untouched', () => {
    expect(byId('check:daily-drift-check')?.renderState).toBe('active')
    expect(byId('ring:2')?.renderState).toBe('active')
  })

  it('surfaces an unknown config gate key as exactly one finding', () => {
    expect(model.findings).toHaveLength(1)
    expect(model.findings[0]?.configKey).toBe('no-such-gate')
  })

  it('emits one performs edge per ACTIONS.performedBy entry', () => {
    const expectedPerforms = ACTIONS.reduce((sum, a) => sum + a.performedBy.length, 0)
    expect(model.edges.filter((e) => e.kind === 'performs')).toHaveLength(expectedPerforms)
  })

  it('emits guards edges only from ring-0 gates to into-github actions', () => {
    const guards = model.edges.filter((e) => e.kind === 'guards')
    // git-push gate → publish-the-branch; pull-request gate → open/revise/grant (3)
    expect(guards).toHaveLength(4)
    for (const e of guards) {
      expect(e.from.startsWith('gate:')).toBe(true)
      expect(e.to.startsWith('action:')).toBe(true)
    }
  })

  it('emits produces/consumes edges from the contract producer/consumer', () => {
    expect(model.edges.some((e) => e.kind === 'produces' && e.from === 'role:planner')).toBe(true)
    expect(model.edges.some((e) => e.kind === 'consumes' && e.from === 'role:developer')).toBe(true)
  })

  it('passes the iteration through verbatim', () => {
    expect(model.iteration).toBe(FIXTURE_ITERATION)
  })

  it('accepts a null config and null iteration', () => {
    const m = deriveDiagramModel(FIXTURE_DOCTRINE, null, null)
    expect(m.iteration).toBeNull()
    expect(m.findings).toHaveLength(0)
    expect(m.nodes.find((n) => n.id === 'gate:creating-a-pull-request')?.renderState).toBe('active')
  })

  it('carries summary on gate/check/action/role/contract nodes', () => {
    expect(byId('gate:git-push')?.summary).toBe('Ever had someone push straight to main?')
    expect(byId('check:brief-validation')?.summary).toBe('Ever seen an empty PR title?')
    expect(byId('action:publish-the-branch')?.summary).toBe('Ever had a branch pushed straight to main by mistake?')
    expect(byId('role:developer')?.summary).toBe('Ever had someone review their own work?')
    expect(byId('contract:planner-brief')?.summary).toBe('Ever had a hand-off lose details?')
  })

  it('carries category only on gate/check nodes', () => {
    expect(byId('gate:git-push')?.category).toBe('hook')
    expect(byId('check:brief-validation')?.category).toBe('ci')
    expect(byId('action:publish-the-branch')?.category).toBeUndefined()
    expect(byId('role:developer')?.category).toBeUndefined()
    expect(byId('contract:planner-brief')?.category).toBeUndefined()
  })

  it('carries actorType only on role nodes', () => {
    expect(byId('role:developer')?.actorType).toBe('agent')
    expect(byId('role:planner')?.actorType).toBe('human')
    expect(byId('gate:git-push')?.actorType).toBeUndefined()
    expect(byId('action:publish-the-branch')?.actorType).toBeUndefined()
    expect(byId('contract:planner-brief')?.actorType).toBeUndefined()
  })
})

// --- Real-file cross-check (pattern: actions.test.ts) --------------------

const REPO_ROOT = join(import.meta.dirname, '../../..')

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

describe('deriveDiagramModel — real aeg-root/ cross-check', () => {
  const model = deriveDiagramModel(loadRealDoctrine(), null, null)

  it('derives 3 rings, some gates, some checks, all 10 actions, 9 roles, some contracts', () => {
    const count = (kind: string) => model.nodes.filter((n) => n.kind === kind).length
    expect(count('ring')).toBe(3)
    expect(count('gate')).toBeGreaterThan(0)
    expect(count('check')).toBeGreaterThan(0)
    expect(count('action')).toBe(10)
    expect(count('role')).toBe(9)
    expect(count('contract')).toBeGreaterThan(0)
  })

  it('gives every into-github action at least one guards edge', () => {
    for (const a of ACTIONS) {
      if (a.crosses !== 'into-github') continue
      const backed = model.edges.some((e) => e.kind === 'guards' && e.to === `action:${a.id}`)
      expect(backed, `into-github action '${a.id}' has no guards edge`).toBe(true)
    }
  })

  it('resolves every performedBy role to a real role node', () => {
    const roleNodeIds = new Set(model.nodes.filter((n) => n.kind === 'role').map((n) => n.id))
    for (const a of ACTIONS) {
      for (const roleId of a.performedBy) {
        expect(roleNodeIds.has(`role:${roleId}`), `performedBy '${roleId}' has no role node`).toBe(true)
      }
    }
  })

  it('produces globally unique node ids', () => {
    const ids = model.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries a non-empty summary on every gate/check/action/role/contract node', () => {
    for (const n of model.nodes) {
      if (n.kind === 'ring') continue
      expect(n.summary, `${n.id} has no summary`).toBeTruthy()
    }
  })

  it('carries category on gate/check nodes only, undefined elsewhere', () => {
    for (const n of model.nodes) {
      if (n.kind === 'gate' || n.kind === 'check') {
        expect(['ci', 'hook', 'event']).toContain(n.category)
      } else {
        expect(n.category).toBeUndefined()
      }
    }
  })

  it('carries actorType on role nodes only, undefined elsewhere', () => {
    for (const n of model.nodes) {
      if (n.kind === 'role') {
        expect(['agent', 'human', 'either']).toContain(n.actorType)
      } else {
        expect(n.actorType).toBeUndefined()
      }
    }
  })
})
