/**
 * Tier and Type read from an Issue body's `**Tier:** <n>` / `**Type:** <word>`
 * lines (#1126) — the fallback for the many task Issues that carry those facts
 * only in the body, never as a `vinaya/tier:*` / `vinaya/type:*` label.
 *
 * Display-only and deliberately small: a line must start with the bold field
 * name, and the value must name a label in the code-owned vocabulary — an
 * unknown tier or type yields `null` rather than an invented label. The result
 * is the FULL label form (`vinaya/tier:3`), so it flows through `splitLabels`,
 * `LabelBadge` and the filter chips exactly like a real label.
 *
 * Imports the `/labels` SUBPATH, never the package barrel: `withBodyFallback`
 * is reached from a `'use client'` module, and the barrel pulls in
 * `node:child_process`.
 */

import { label, LABELS } from '@attalabs/aeg-forge-state/labels'

const TIER_LINE = /^\*\*Tier:\*\*[ \t]+(\d+)[ \t\r]*$/m
const TYPE_LINE = /^\*\*Type:\*\*[ \t]+([A-Za-z]+)[ \t\r]*$/m

/** The label of `category` whose key is `<category>-<value>`, or `null` outside the vocabulary. */
function resolve(category: 'tier' | 'type', value: string | undefined): string | null {
  if (!value) return null
  const entry = LABELS.find((l) => l.category === category && l.key === `${category}-${value.toLowerCase()}`)
  return entry ? label(entry.key) : null
}

/** The body's `**Tier:** <n>` as a full tier label (`vinaya/tier:3`), or `null`. */
export function tierFromBody(body: string): string | null {
  return resolve('tier', TIER_LINE.exec(body)?.[1])
}

/** The body's `**Type:** <word>` as a full type label (`vinaya/type:fix`), or `null`. */
export function typeFromBody(body: string): string | null {
  return resolve('type', TYPE_LINE.exec(body)?.[1])
}

/**
 * The one resolver every Backlog surface goes through — the table's filter
 * memo, its row render, and the page's filter options — so cells, filter and
 * chips cannot disagree. A label, when present, wins; the body only fills a gap.
 */
export function withBodyFallback<T extends { tier: string | null; type: string | null }>(
  split: T,
  body: { bodyTier: string | null; bodyType: string | null }
): T {
  return { ...split, tier: split.tier ?? body.bodyTier, type: split.type ?? body.bodyType }
}
