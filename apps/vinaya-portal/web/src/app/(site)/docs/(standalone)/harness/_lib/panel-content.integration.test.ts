import path from 'node:path'
import { deriveDiagramModel } from '@atta/aeg-core'
import { createFileDoctrineSource } from '@atta/vinaya-sources'
import { describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// aliases it away in real server builds; under vitest (no such bundler)
// it must be stubbed to exercise this Server-Component-only code path.
vi.mock('server-only', () => ({}))

const { githubBlobUrl } = await import('../../../../../../lib/github-links')
const { deriveGroups } = await import('./groupings')
const { readMoreTarget } = await import('./read-more')

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../../../../../..')
const AEG_ROOT = path.join(REPO_ROOT, 'aeg-root')

/**
 * End-to-end proof against the real doctrine (no fixtures) — exactly what
 * one real gate node, one real action node, and one real role node's leaf
 * panel would render, since `LeafPanel` is a pure function of
 * `{ label, category/actorType, renderState, summary, readMoreHref }`.
 * This is the scriptable substitute for a browser click: it mirrors
 * load-diagram.ts's own two-line loader (doctrine + deriveDiagramModel)
 * directly, rather than importing that Server-Component-only module.
 */
describe('leaf panel content, against real doctrine', () => {
  async function realGroups() {
    const doctrine = await createFileDoctrineSource({ root: AEG_ROOT }).getDoctrine()
    const model = deriveDiagramModel(doctrine, null, null)
    return deriveGroups(model)
  }

  it('renders a real gate node correctly', async () => {
    const groups = await realGroups()
    const gate = groups.find((g) => g.key === 'ring0')?.children[0]
    expect(gate).toBeDefined()
    if (!gate) return

    const target = readMoreTarget(gate)
    const panel = {
      label: gate.label,
      tag: 'ring 0',
      badge: gate.category,
      renderState: gate.renderState,
      summary: gate.summary,
      detail: gate.detail,
      readMoreHref: target?.docRoute,
      viewSourceHref: target ? githubBlobUrl(target.path, target.line) : undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('GATE PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toMatch(/^(ci|hook|event)$/)
    // A gate deep-links to its own anchored section on its ring page — no
    // longer the top of one enforcement.md page (`vinaya-pages-v1` task 12).
    expect(panel.readMoreHref).toMatch(/^\/docs\/rings\/ring-0#.+$/)
    expect(panel.viewSourceHref).toMatch(/^https:\/\/github\.com\/.*aeg-root\/enforcement\.md#L\d+$/)
    // Both render, so both are proven to survive the wiring
    // (registry-parse → diagram-model → DiagramNode → panel) — not merely to
    // exist on the type. `detail` reaches the panel clamped, never whole.
    expect(panel.summary).toBeTruthy()
    expect(panel.detail).toBeTruthy()
  })

  it('renders a real action node correctly', async () => {
    const groups = await realGroups()
    const action = groups.find((g) => g.key === 'actions')?.children[0]
    expect(action).toBeDefined()
    if (!action) return

    const target = readMoreTarget(action)
    const panel = {
      label: action.label,
      tag: 'action',
      badge: action.category ?? action.actorType,
      renderState: action.renderState,
      summary: action.summary,
      readMoreHref: target?.docRoute,
      viewSourceHref: target ? githubBlobUrl(target.path, target.line) : undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('ACTION PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toBeUndefined()
    // An action deep-links to its own section on the actions page
    // (`vinaya-pages-v1` task 12 — actions used to have no doc route at all).
    // "View source" still goes to the canonical set: a bare path, no `#L`
    // anchor, since an action node carries no `sourceLine`.
    expect(panel.readMoreHref).toMatch(/^\/docs\/actions#.+$/)
    expect(panel.viewSourceHref).toMatch(/^https:\/\/github\.com\/.*packages\/aeg-core\/src\/actions\.ts$/)
  })

  it('renders a real role node correctly', async () => {
    const groups = await realGroups()
    const role = groups.find((g) => g.key === 'actors')?.children[0]
    expect(role).toBeDefined()
    if (!role) return

    const target = readMoreTarget(role)
    const panel = {
      label: role.label,
      tag: 'role',
      badge: role.actorType,
      renderState: role.renderState,
      summary: role.summary,
      readMoreHref: target?.docRoute,
      viewSourceHref: target ? githubBlobUrl(target.path, target.line) : undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('ROLE PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toMatch(/^(agent|human|either)$/)
    expect(panel.readMoreHref).toMatch(/^\/docs\/roles\/.+$/)
    expect(panel.viewSourceHref).toMatch(/^https:\/\/github\.com\/.*aeg-root\/roles\/.*\.md$/)
  })

  it('renders a real contract node correctly — now a first-class band, not a chord-only overlay', async () => {
    const groups = await realGroups()
    const contract = groups.find((g) => g.key === 'contracts')?.children[0]
    expect(contract).toBeDefined()
    if (!contract) return

    const target = readMoreTarget(contract)
    const panel = {
      label: contract.label,
      tag: 'contract',
      badge: contract.category ?? contract.actorType,
      renderState: contract.renderState,
      summary: contract.summary,
      readMoreHref: target?.docRoute,
      viewSourceHref: target ? githubBlobUrl(target.path, target.line) : undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('CONTRACT PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toBeUndefined()
    expect(panel.readMoreHref).toMatch(/^\/docs\/contracts\/.+$/)
    expect(panel.viewSourceHref).toMatch(/^https:\/\/github\.com\/.*aeg-root\/contracts\/.*\.md$/)
  })
})
