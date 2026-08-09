/**
 * The old-slug → new-slug alias derivation for `/docs` gate/check anchors.
 * `node-route.ts`'s `nodeSlug()` computes an anchor from a node's display
 * form (G-code stripped, over-length names cut at a clause boundary), which
 * for a handful of nodes now differs from the slug `diagram-model.ts`
 * originally stamped into the node id. A reader who bookmarked, or a page
 * that still links to, the old `#g1-implementation-exists`-style fragment
 * must keep landing on the right section — this is the input to that alias.
 *
 * Derived, not hand-listed: the failure mode this replaces is exactly the
 * one `node-route.ts`'s own header comment warns against for a second slug
 * source. Zero I/O, additive export — takes an already-derived node, returns
 * data, never reads a file (aeg-core purity, #372/#382/#506).
 */

import type { DiagramNode } from '../diagram-model'
import { nodeDocRoute } from './node-route'

/**
 * The anchor slugs this node used to publish and must continue to answer
 * to. `[]` when the node's canonical slug is unchanged — most nodes, since
 * `nodeSlug()`'s cleanup is a no-op on an already-clean display form.
 */
export function legacyAnchorSlugs(node: DiagramNode): string[] {
  const rawSlug = node.id.slice(node.kind.length + 1)
  const canonicalSlug = nodeDocRoute(node)?.slug
  if (!canonicalSlug || canonicalSlug === rawSlug) return []
  return [rawSlug]
}
