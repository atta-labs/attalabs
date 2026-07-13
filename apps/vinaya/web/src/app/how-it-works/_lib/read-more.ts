import type { DiagramNode } from '@atta/aeg-core'

/**
 * Resolves the "Read more" target for a leaf node's own doctrine source.
 *
 * gate/check nodes carry `sourceLine` against `enforcement.md` directly —
 * link straight to that line. role/contract nodes carry no `sourceLine`
 * today, but their `label` is literally their doctrine frontmatter id
 * (`role.roleId` / `contract.contractId`, see `diagram-model.ts`), and every
 * `aeg-root/roles/*.md` / `aeg-root/contracts/*.md` file today is named
 * `<id>.md` — verified against the real files at authoring time. Linking via
 * that convention (no line anchor) beats omitting "Read more" outright.
 * action nodes have no single doctrine markdown file backing them (`ACTIONS`
 * lives in `packages/aeg-core/src/actions.ts`, not `aeg-root/**`) — there is
 * no honest doctrine link to offer, so action nodes get none.
 */
export function readMoreTarget(node: DiagramNode): { path: string; line?: number } | null {
  if (node.kind === 'gate' || node.kind === 'check') {
    return { path: 'aeg-root/enforcement.md', line: node.sourceLine }
  }
  if (node.kind === 'role') {
    return { path: `aeg-root/roles/${node.label}.md` }
  }
  if (node.kind === 'contract') {
    return { path: `aeg-root/contracts/${node.label}.md` }
  }
  return null
}
