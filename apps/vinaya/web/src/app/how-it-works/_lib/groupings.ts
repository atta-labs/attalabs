import { ACTIONS, type DiagramModel, type DiagramNode, type RenderState } from '@atta/aeg-core'

export type GroupKey = 'ring0' | 'ring1' | 'ring2' | 'action-github' | 'action-internal' | 'actors'

export type DiagramGroup = {
  key: GroupKey
  /** Ring groups use the ring node's own doctrine-derived label; action-seam
   * and actor groups have no representative DiagramNode, so they carry a
   * static structural name (a category name, not derived data — same status
   * as the old page's "Roles"/"Rings" section headings). */
  label: string
  renderState: RenderState
  children: DiagramNode[]
}

const STATIC_GROUP_LABELS: Record<'action-github' | 'action-internal' | 'actors', string> = {
  'action-github': 'Crosses into GitHub',
  'action-internal': 'Stays internal',
  actors: 'Actors'
}

/**
 * Derives the six interactive drill groups from a `DiagramModel`. Contracts
 * are deliberately absent — they render as chords between actor positions
 * (see `geometry.ts`), not as a seventh group. The action-seam split reads
 * `Action.crosses` from `ACTIONS` (already exported from `@atta/aeg-core`,
 * D-119's canonical single source) and matches it back onto each `action:*`
 * DiagramNode by id — `DiagramNode` itself carries no `crosses` field, so
 * this is real cross-referenced data, not a hardcoded list.
 */
export function deriveGroups(model: DiagramModel): DiagramGroup[] {
  const ringNode = (index: 0 | 1 | 2): DiagramNode => {
    const node = model.nodes.find((n) => n.kind === 'ring' && n.ringIndex === index)
    if (!node) throw new Error(`deriveGroups: no ring node for ringIndex ${index} — DiagramModel gap, not renderable`)
    return node
  }

  const gateCheckChildren = (index: 0 | 1 | 2): DiagramNode[] =>
    model.nodes.filter((n) => (n.kind === 'gate' || n.kind === 'check') && n.ringIndex === index)

  const githubActionIds = new Set(ACTIONS.filter((a) => a.crosses === 'into-github').map((a) => `action:${a.id}`))
  const actionNodes = model.nodes.filter((n) => n.kind === 'action')

  return [
    { key: 'ring0', label: ringNode(0).label, renderState: ringNode(0).renderState, children: gateCheckChildren(0) },
    { key: 'ring1', label: ringNode(1).label, renderState: ringNode(1).renderState, children: gateCheckChildren(1) },
    { key: 'ring2', label: ringNode(2).label, renderState: ringNode(2).renderState, children: gateCheckChildren(2) },
    {
      key: 'action-github',
      label: STATIC_GROUP_LABELS['action-github'],
      renderState: 'active',
      children: actionNodes.filter((n) => githubActionIds.has(n.id))
    },
    {
      key: 'action-internal',
      label: STATIC_GROUP_LABELS['action-internal'],
      renderState: 'active',
      children: actionNodes.filter((n) => !githubActionIds.has(n.id))
    },
    {
      key: 'actors',
      label: STATIC_GROUP_LABELS.actors,
      renderState: 'active',
      children: model.nodes.filter((n) => n.kind === 'role')
    }
  ]
}

export type ContractChord = {
  id: string
  contractNode: DiagramNode
  producerRoleId: string | null
  consumerRoleId: string | null
}

/** One chord per contract node, resolved to its producer/consumer role ids
 * via the model's own `produces`/`consumes` edges — never guessed from the
 * contract's id or label. */
export function deriveContractChords(model: DiagramModel): ContractChord[] {
  return model.nodes
    .filter((n) => n.kind === 'contract')
    .map((contractNode) => {
      const produces = model.edges.find((e) => e.kind === 'produces' && e.to === contractNode.id)
      const consumes = model.edges.find((e) => e.kind === 'consumes' && e.to === contractNode.id)
      return {
        id: contractNode.id,
        contractNode,
        producerRoleId: produces?.from ?? null,
        consumerRoleId: consumes?.from ?? null
      }
    })
}
