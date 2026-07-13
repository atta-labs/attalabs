import path from 'node:path'
import { deriveDiagramModel } from '@atta/aeg-core'
import { createFileDoctrineSource } from '@atta/vinaya-sources'
import { describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// aliases it away in real server builds; under vitest (no such bundler)
// it must be stubbed to exercise this Server-Component-only code path.
vi.mock('server-only', () => ({}))

const { githubBlobUrl } = await import('../../../lib/github-links')
const { deriveGroups } = await import('./groupings')
const { readMoreTarget } = await import('./read-more')

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../../..')
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
      readMoreHref: target ? githubBlobUrl(target.path, target.line) : undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('GATE PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toMatch(/^(ci|hook|event)$/)
    expect(panel.readMoreHref).toMatch(/^https:\/\/github\.com\/.*aeg-root\/enforcement\.md#L\d+$/)
  })

  it('renders a real action node correctly', async () => {
    const groups = await realGroups()
    const action = groups.find((g) => g.key === 'action-github')?.children[0]
    expect(action).toBeDefined()
    if (!action) return

    const target = readMoreTarget(action)
    const panel = {
      label: action.label,
      tag: 'action',
      badge: action.category ?? action.actorType,
      renderState: action.renderState,
      summary: action.summary,
      readMoreHref: target ?? undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('ACTION PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toBeUndefined()
    expect(panel.readMoreHref).toBeUndefined()
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
      readMoreHref: target ? githubBlobUrl(target.path, target.line) : undefined
    }
    // biome-ignore lint/suspicious/noConsole: intentional evidence dump for the PR body
    console.log('ROLE PANEL:', JSON.stringify(panel, null, 2))

    expect(panel.badge).toMatch(/^(agent|human|either)$/)
    expect(panel.readMoreHref).toMatch(/^https:\/\/github\.com\/.*aeg-root\/roles\/.*\.md$/)
  })
})
