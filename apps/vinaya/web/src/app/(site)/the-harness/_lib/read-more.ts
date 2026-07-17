import type { DiagramNode } from '@atta/aeg-core'

/**
 * Resolves the "Read more" / "View source" targets for a leaf node's own
 * doctrine source. `path`/`line` are the GitHub source location — always
 * present, and the sole target before the docs route existed. `docRoute` is
 * the in-app rendered doc, when one exists to link to.
 *
 * gate/check nodes carry `sourceLine` against `enforcement.md` directly — the
 * source link goes straight to that line, but the rendered doc
 * (`DocPage.tsx`) has no per-row anchor (no `rehype-slug`), so `docRoute`
 * lands at the top of the page, not the row. role/contract nodes carry no
 * `sourceLine` today, but their `label` is literally their doctrine
 * frontmatter id (`role.roleId` / `contract.contractId`, see
 * `diagram-model.ts`), and every `aeg-root/roles/*.md` /
 * `aeg-root/contracts/*.md` file today is named `<id>.md` — the same
 * convention backs both the GitHub path and the docs route, so there is one
 * mapping, not two.
 *
 * action nodes have no doctrine markdown file — `ACTIONS` is a TypeScript
 * const in `packages/aeg-core/src/actions.ts`, not an `aeg-root/**` document
 * — so `docRoute` is omitted; the canonical set is still a real, readable,
 * single-source file (D-119), so `path` still points straight at it. No line
 * anchor — the node carries no `sourceLine` against that file.
 */
export function readMoreTarget(node: DiagramNode): { path: string; line?: number; docRoute?: string } | null {
  if (node.kind === 'gate' || node.kind === 'check') {
    return { path: 'aeg-root/enforcement.md', line: node.sourceLine, docRoute: '/docs/enforcement' }
  }
  if (node.kind === 'role') {
    return { path: `aeg-root/roles/${node.label}.md`, docRoute: `/docs/roles/${node.label}` }
  }
  if (node.kind === 'contract') {
    return { path: `aeg-root/contracts/${node.label}.md`, docRoute: `/docs/contracts/${node.label}` }
  }
  if (node.kind === 'action') {
    return { path: 'packages/aeg-core/src/actions.ts' }
  }
  return null
}
