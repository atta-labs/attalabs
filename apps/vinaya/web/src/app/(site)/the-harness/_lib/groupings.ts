import type { DiagramModel, DiagramNode, RenderState } from '@atta/aeg-core'

/**
 * The six interactive rings, outermost to innermost — matches Issue #508's
 * original rationale exactly: three enforcement rings (ring0/ring1/ring2),
 * two seam rings (`contracts` — the 6 role-to-role handoffs; `actions` — all
 * 10 canonical acts, whether or not they reach GitHub), one actors ring. A seventh,
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
  // Every act in the canonical set, not just the five that reach GitHub —
  // "GitHub Crossing" was a name only five of the ten could ever live under,
  // and naming the ring after the subset is what made dropping the other five
  // look structural. Which acts cross is now a per-node badge (`crosses`),
  // where a fact about a node belongs.
  actions: 'The actions',
  actors: 'The actors'
}

/**
 * Derives the six interactive drill groups from a `DiagramModel`.
 *
 * The `actions` seam holds ALL ten canonical actions (D-119), not only the
 * five that cross into GitHub. It used to hold five: the ring was called
 * "GitHub Crossing", so the other five — `commit-the-work`,
 * `author-the-brief`, `produce-the-verdict`, `post-provenance-comment`,
 * `write-the-retrospective` — rendered nowhere, and the omission was argued
 * from #508's "seven rings" count against #508's equally explicit "render the
 * real 10/9/6". Both are satisfiable at once: one ring, ten children, seven
 * bands. Reading a brief's two constraints as a conflict, and resolving it in
 * favour of the one that drops data, is the failure mode to watch for here —
 * this page's whole claim is that it renders the doctrine, and five pieces of
 * doctrine were invisible.
 *
 * Which acts reach GitHub is `DiagramNode.crosses`, rendered per node, rather
 * than implied by ring membership.
 */
export function deriveGroups(model: DiagramModel): DiagramGroup[] {
  const ringNode = (index: 0 | 1 | 2): DiagramNode => {
    const node = model.nodes.find((n) => n.kind === 'ring' && n.ringIndex === index)
    if (!node) throw new Error(`deriveGroups: no ring node for ringIndex ${index} — DiagramModel gap, not renderable`)
    return node
  }

  const gateCheckChildren = (index: 0 | 1 | 2): DiagramNode[] =>
    model.nodes.filter((n) => (n.kind === 'gate' || n.kind === 'check') && n.ringIndex === index)

  /** Roles and contracts in PROCESS order (`order:` on the doctrine doc), not
   * the filename order the model was built in. Alphabetical is an accident of
   * how the files are named; the reader is looking at a sequence — plan, brief,
   * build, review, verify, merge, archive — and it should read as one. A node
   * with no `order` sorts last rather than first, so an unordered addition is
   * visibly unplaced instead of silently jumping to the front. Gates, checks
   * and actions keep their doctrine order, which is already meaningful (they
   * are listed in the registry in the sequence they fire). */
  const inProcessOrder = (kind: 'role' | 'contract'): DiagramNode[] =>
    model.nodes
      .filter((n) => n.kind === kind)
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))

  const groups: Record<GroupKey, DiagramGroup> = {
    actors: {
      key: 'actors',
      label: STATIC_GROUP_LABELS.actors,
      renderState: 'active',
      children: inProcessOrder('role')
    },
    contracts: {
      key: 'contracts',
      label: STATIC_GROUP_LABELS.contracts,
      renderState: 'active',
      children: inProcessOrder('contract')
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
      children: model.nodes.filter((n) => n.kind === 'action')
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
