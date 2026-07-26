/**
 * The single node → `/docs` route derivation. Nav construction
 * (`load-aeg-docs.ts`), the "Read more" resolver (`read-more.ts`), and the
 * harness map (`/docs` `page.tsx`) all resolve a `DiagramNode` to its docs
 * location through THIS function — one source of truth, so a card's deep-link,
 * a "Read more" anchor, and a ring/action page's heading `id` can never point
 * at three different places for the same node. A parallel, hand-maintained
 * slug list is the exact failure mode this replaces (the same discipline
 * `surfaced-manifest.ts` holds for the file allowlist).
 *
 * Granularity follows content size. A role or contract is a whole
 * `aeg-root/**.md` file, so it keeps its own page and needs no anchor. A gate
 * or check is one row of `enforcement.md`, and an action is one entry of
 * `ACTIONS`, so each is an `#`-anchored section inside a grouping page
 * (`/docs/rings/ring-<n>` or `/docs/actions`).
 *
 * The anchor slug is NOT recomputed here — it is the slug aeg-core already
 * embedded in the node id (`${kind}:${slug}`, from `slugify(row.action)` for
 * gate/check and the `ACTIONS` id for action). Reusing it is what guarantees
 * the heading `id` and the deep-link fragment are byte-identical.
 *
 * Zero I/O, additive export — takes an already-derived node, returns data,
 * never reads a file (aeg-core purity, #372/#382/#506).
 */

import type { DiagramNode } from '../diagram-model'

export type NodeDocRoute = {
  /** The page a node lives on. */
  route: string
  /** The heading anchor within that page, or `null` for a file-sized node
   * (role/contract) that owns its whole page. */
  slug: string | null
}

/** The slug aeg-core stamped into the node id (`${kind}:${slug}`). */
function nodeSlug(node: DiagramNode): string {
  return node.id.slice(node.kind.length + 1)
}

/**
 * Resolve a node to its `/docs` route + anchor slug. Returns `null` for a kind
 * with no docs surface (there is none today — every kind resolves).
 */
export function nodeDocRoute(node: DiagramNode): NodeDocRoute | null {
  switch (node.kind) {
    case 'role':
      return { route: `/docs/roles/${node.label}`, slug: null }
    case 'contract':
      return { route: `/docs/contracts/${node.label}`, slug: null }
    case 'gate':
    case 'check':
      if (node.ringIndex === undefined) return null
      return { route: `/docs/rings/ring-${node.ringIndex}`, slug: nodeSlug(node) }
    case 'action':
      return { route: '/docs/actions', slug: nodeSlug(node) }
    case 'ring':
      if (node.ringIndex === undefined) return null
      return { route: `/docs/rings/ring-${node.ringIndex}`, slug: null }
    default:
      return null
  }
}

/** The full in-app href — `route` plus a `#slug` fragment when the node is an
 * anchored section. The form the map and `read-more.ts` link to directly. */
export function nodeDocHref(node: DiagramNode): string | null {
  const resolved = nodeDocRoute(node)
  if (!resolved) return null
  return resolved.slug ? `${resolved.route}#${resolved.slug}` : resolved.route
}
