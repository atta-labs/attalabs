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
 * The anchor slug is recomputed here from the node's DISPLAY form, not read
 * verbatim off the node id. `node.id`/`node.label` keep the full doctrine
 * text — G-codes included — because the registry check (G1-G5,
 * `registry-checks.ts`) matches on that exact id; a slug that a reader
 * follows into a URL fragment has no such constraint, so it is cleaned at
 * this one edge instead. Both the heading (`humanLabel`/`shortLabel`, in
 * `apps/vinaya/web`) and this anchor apply the same two rules — strip a
 * leading G-code, cut a pathologically long name at its first clause — so a
 * heading and its anchor still agree, just no longer byte-identical to the
 * doctrine id. A node whose display form needs no cleanup still gets the
 * same slug it always did, since stripping/cutting are no-ops on it.
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

/** A pathologically long anchor is cut at its first clause boundary rather
 * than published whole. 100 is chosen against the current doctrine, not a
 * round guess: the longest anchor slug outside the one row this exists to
 * fix is 84 characters (a ring-0 gate's compound name), so 100 leaves that
 * row untouched while still catching genuinely oversized names — the one
 * 127-character row this was written for included. */
const MAX_ANCHOR_SLUG_LENGTH = 100

/** Strips a leading `g<n>-` code off an already-slugified anchor. Operates on
 * the slug form (not `node.label`) so a node whose id isn't `slugify(label)`
 * to begin with — an `action`, whose id is the hand-authored `ACTIONS` entry
 * id, not a re-derivation of its label — is never touched: no G-coded or
 * over-length action exists today, so this function is a no-op for every one
 * of them, exactly preserving their existing anchors. */
function stripGCodeSlug(slug: string): string {
  return slug.replace(/^g\d+-/, '')
}

/** Strips the same `G<n> — ` doctrine code off raw label text, for the
 * over-length fallback below. Same contract as `humanLabel` in
 * `apps/vinaya/web`'s `display-label.ts` (duplicated rather than shared:
 * aeg-core cannot import from the web app, and this rule is small enough
 * that keeping two copies in sync by inspection is cheaper than a new
 * cross-package export). */
function stripGCodeLabel(label: string): string {
  return label.replace(/^G\d+\s*—\s*/, '')
}

/** Cuts at the first clause boundary, same separator set `shortLabel` uses
 * in `display-label.ts` — kept in sync with that function's comment by
 * inspection, for the same reason `stripGCodeLabel` is duplicated above. */
function firstClause(label: string): string {
  return label.split(/ \(| \/ |—|–|: /)[0]?.trim() ?? label
}

/** Same cleanup `diagram-model.ts`'s own (private, un-exported) `slugify`
 * applies when it stamps a node id — duplicated here rather than imported so
 * this file never needs `diagram-model.ts` to export it. Reached only by the
 * over-length fallback below, never by the common case. */
function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The anchor slug for a node's display form. Strips a G-code off the
 * existing id-stamped slug first — a byte-preserving operation for every
 * node that never had one. Only if the result is STILL too long to publish
 * does this fall back to re-deriving a short slug from `node.label`'s first
 * clause; that fallback is the one path that can produce a slug other than
 * a prefix of the id-stamped one, and today only one row (a 127-character
 * ring-0 gate name) reaches it. */
function nodeSlug(node: DiagramNode): string {
  const rawSlug = node.id.slice(node.kind.length + 1)
  const stripped = stripGCodeSlug(rawSlug)
  if (stripped.length <= MAX_ANCHOR_SLUG_LENGTH) return stripped
  return slugifyText(firstClause(stripGCodeLabel(node.label)))
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
