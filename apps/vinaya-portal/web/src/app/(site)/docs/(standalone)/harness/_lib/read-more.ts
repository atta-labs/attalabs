import type { DiagramNode } from '@attalabs/aeg-core'
import { nodeDocHref } from '@attalabs/aeg-core/docs'

/**
 * Resolves the in-app "Read more" target for a leaf node. The href comes
 * straight from `@attalabs/aeg-core`'s `nodeDocHref` — the one
 * node→`/docs` derivation the nav, the map, and this resolver all share, so a
 * deep link and a heading anchor can never disagree. It now reaches the exact
 * node at the right granularity: a gate/check lands on
 * `/docs/rings/ring-<n>#<slug>` (its own anchored section, no longer the top of
 * one 42KB page); a role/contract on its own page; an action on
 * `/docs/actions#<slug>` (`ACTIONS` carries its own `summary`/`description`,
 * rendered on that public page).
 */
export function readMoreHref(node: DiagramNode): string | undefined {
  return nodeDocHref(node) ?? undefined
}
