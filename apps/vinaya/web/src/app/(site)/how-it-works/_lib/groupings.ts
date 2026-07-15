import { ACTIONS, type DiagramModel, type DiagramNode, type RenderState } from '@atta/aeg-core'

/**
 * The six interactive rings, outermost to innermost — matches Issue #508's
 * original rationale exactly: three enforcement rings (ring0/ring1/ring2),
 * two seam rings (`contracts` — the 6 role-to-role handoffs; `actions` — the
 * crossings into GitHub that gates guard), one actors ring. A seventh,
 * non-interactive "GitHub" substrate divider renders between `actions` and
 * `ring1` (see `geometry.ts`'s `SUBSTRATE_AFTER`) — it carries no
 * `DiagramNode` (the model has no dedicated substrate kind), so it is static
 * framing chrome, not a `GroupKey`.
 */
export type GroupKey = 'actors' | 'contracts' | 'ring0' | 'actions' | 'ring1' | 'ring2'

export const GROUP_ORDER: GroupKey[] = ['actors', 'contracts', 'ring0', 'actions', 'ring1', 'ring2']

export type DiagramGroup = {
  key: GroupKey
  /** Ring groups use the ring node's own doctrine-derived label; the seam
   * and actor groups have no representative DiagramNode, so they carry a
   * static structural name (a category name, not derived data — same status
   * as the old page's "Roles"/"Rings" section headings). */
  label: string
  renderState: RenderState
  children: DiagramNode[]
}

const STATIC_GROUP_LABELS: Record<'contracts' | 'actions' | 'actors', string> = {
  contracts: 'What actors do',
  actions: 'GitHub Crossing',
  actors: 'The actors'
}

/**
 * Derives the six interactive drill groups from a `DiagramModel`. The
 * `actions` seam reads `Action.crosses` from `ACTIONS` (already exported
 * from `@atta/aeg-core`, D-119's canonical single source) and matches it
 * back onto each `action:*` DiagramNode by id — `DiagramNode` itself carries
 * no `crosses` field, so this is real cross-referenced data, not a
 * hardcoded list. Internal-only actions (never crossing into GitHub —
 * `commit-the-work`, `author-the-brief`, `produce-the-verdict`,
 * `post-provenance-comment`, `write-the-retrospective`) are real
 * `DiagramModel` data but sit outside these seven canonical rings per Issue
 * #508's own count (3 enforcement + 1 substrate + 2 seam + 1 actors = 7,
 * with no eighth "internal actions" ring) — they are not dropped from the
 * model, only from this renderer's top-level bands.
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

  const groups: Record<GroupKey, DiagramGroup> = {
    actors: {
      key: 'actors',
      label: STATIC_GROUP_LABELS.actors,
      renderState: 'active',
      children: model.nodes.filter((n) => n.kind === 'role')
    },
    contracts: {
      key: 'contracts',
      label: STATIC_GROUP_LABELS.contracts,
      renderState: 'active',
      children: model.nodes.filter((n) => n.kind === 'contract')
    },
    ring0: {
      key: 'ring0',
      label: ringNode(0).label,
      renderState: ringNode(0).renderState,
      children: gateCheckChildren(0)
    },
    actions: {
      key: 'actions',
      label: STATIC_GROUP_LABELS.actions,
      renderState: 'active',
      children: model.nodes.filter((n) => n.kind === 'action' && githubActionIds.has(n.id))
    },
    ring1: {
      key: 'ring1',
      label: ringNode(1).label,
      renderState: ringNode(1).renderState,
      children: gateCheckChildren(1)
    },
    ring2: {
      key: 'ring2',
      label: ringNode(2).label,
      renderState: ringNode(2).renderState,
      children: gateCheckChildren(2)
    }
  }

  return GROUP_ORDER.map((key) => groups[key])
}
