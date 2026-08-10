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
 * A doctrine cell's own text renamed outright (not a G-code strip, not an
 * over-length cut) is the one case this file cannot derive. `node.id` is
 * `slugify(row.action)` computed fresh from whatever `enforcement.md` says
 * RIGHT NOW — by the time a rename lands, the old text is gone from the
 * doctrine snapshot entirely, so there is nothing left in `node.id`/
 * `node.label` for a derivation to diff against. This is not a second
 * routing authority — `nodeSlug()`/`nodeDocRoute()` still compute every
 * live anchor unconditionally; this map only remembers what one specific
 * anchor used to be before an editor rewrote the cell it came from, and it
 * grows by exactly one entry, once, at the moment of a rename. Keyed by the
 * node id the rename produced. */
const RENAMED_CELL_ALIASES: Record<string, string> = {
  'check:coherence-check': 'coherence-oracle'
}

/**
 * The anchor slugs this node used to publish and must continue to answer
 * to. `[]` when the node's canonical slug is unchanged — most nodes, since
 * `nodeSlug()`'s cleanup is a no-op on an already-clean display form.
 */
export function legacyAnchorSlugs(node: DiagramNode): string[] {
  const rawSlug = node.id.slice(node.kind.length + 1)
  const canonicalSlug = nodeDocRoute(node)?.slug
  const aliases = new Set<string>()
  if (canonicalSlug && canonicalSlug !== rawSlug) aliases.add(rawSlug)
  const renamed = RENAMED_CELL_ALIASES[node.id]
  if (renamed) aliases.add(renamed)
  return [...aliases]
}
