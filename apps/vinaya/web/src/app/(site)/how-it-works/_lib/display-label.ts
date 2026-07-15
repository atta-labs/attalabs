/**
 * Zero imports, deliberately — this file must never pull in `groupings.ts`
 * or `@atta/aeg-core`. `DiagramCanvas.tsx` and `LeafPanel.tsx` are client
 * components; importing anything that transitively touches aeg-core's
 * value exports (`ACTIONS`, `deriveGroups`, ...) drags `@atta/aeg-forge-state`'s
 * `node:child_process` usage into the browser bundle, which Turbopack
 * cannot build (this bit the page for real once already — see
 * `DiagramExplorer.tsx`'s own doc comment on the same hazard).
 *
 * A few doctrine rows carry a leading `G1 —`.."G5 —" code prefix (the
 * enforcement-derivation-v1 G-checks) — real content, useful as a stable
 * id/reference, but meaningless on its own to a reader of the diagram. This
 * strips that prefix for DISPLAY only (wedge label, panel title); the full
 * string — G-number included — stays on `node.id`/`node.label` untouched
 * for anything that needs it. Every other label passes through unchanged.
 */
export function humanLabel(label: string): string {
  const stripped = label.replace(/^G\d+\s*—\s*/, '')
  if (stripped === label) return label
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}
