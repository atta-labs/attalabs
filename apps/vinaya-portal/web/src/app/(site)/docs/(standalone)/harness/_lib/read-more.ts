import type { DiagramNode } from '@attalabs/aeg-core'
import { nodeDocHref } from '@attalabs/aeg-core/docs'

/**
 * Resolves the "Read more" / "View source" targets for a leaf node. `path`/
 * `line` are the GitHub source location — always present, and the sole target
 * before the docs route existed. `docRoute` is the in-app rendered doc.
 *
 * `docRoute` comes straight from `@attalabs/aeg-core`'s `nodeDocHref` — the one
 * node→`/docs` derivation the nav, the map, and this resolver all share, so a
 * deep link and a heading anchor can never disagree. It now reaches the exact
 * node at the right granularity: a gate/check lands on
 * `/docs/rings/ring-<n>#<slug>` (its own anchored section, no longer the top of
 * one 42KB page); a role/contract on its own page; an action on
 * `/docs/actions#<slug>` (previously omitted — `ACTIONS` carries its own
 * `summary`/`description`, now rendered).
 *
 * The GitHub `path`/`line` targets are unchanged: gate/check → `enforcement.md`
 * at `sourceLine`; role/contract → their `aeg-root/**.md` file (no line, their
 * `label` is the frontmatter id); action → `actions.ts` (the canonical set,
 * no `aeg-root/**` doc backs it).
 */
export function readMoreTarget(node: DiagramNode): { path: string; line?: number; docRoute?: string } | null {
  const docRoute = nodeDocHref(node) ?? undefined
  if (node.kind === 'gate' || node.kind === 'check') {
    return { path: 'aeg-root/enforcement.md', line: node.sourceLine, docRoute }
  }
  if (node.kind === 'role') {
    return { path: `aeg-root/roles/${node.label}.md`, docRoute }
  }
  if (node.kind === 'contract') {
    return { path: `aeg-root/contracts/${node.label}.md`, docRoute }
  }
  if (node.kind === 'action') {
    return { path: 'packages/aeg-core/src/actions.ts', docRoute }
  }
  return null
}
