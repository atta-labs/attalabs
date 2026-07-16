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
 *
 * action nodes have no doctrine markdown file — `ACTIONS` is a TypeScript
 * const in `packages/aeg-core/src/actions.ts`, not an `aeg-root/**` document
 * — so they used to get no link at all, which left an action's panel with
 * nothing under its question and no way out. The canonical set is still a
 * real, readable, single-source file (D-119), so it is linked directly: the
 * honest bar for "Read more" is that the target IS where this node is
 * defined, not that the target happens to be markdown. No line anchor — the
 * node carries no `sourceLine` against that file.
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
  if (node.kind === 'action') {
    return { path: 'packages/aeg-core/src/actions.ts' }
  }
  return null
}
