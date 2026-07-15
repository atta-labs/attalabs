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
  // Backticks: the `Action` cell is the one cell `registry-parse.ts` never
  // sanitizes (it runs `stripBold` only, where every other column gets
  // `stripBackticks`), so rows written as `` `git push` `` keep their markers
  // all the way here and render as literal backticks in the wedge, the
  // breadcrumb and the panel title. Stripped for display only — same contract
  // as the G-prefix below. Not fixed in the parser because `action` IS
  // `node.label`, which doubles as the node's identity (ring-0 gate matching
  // keys off it); sanitizing it there would silently move an id, and a label
  // that reads wrong is a smaller problem than an id that shifts.
  const unticked = label.replace(/`/g, '')
  const stripped = unticked.replace(/^G\d+\s*—\s*/, '')
  if (stripped === unticked) return unticked
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

/**
 * The node's name, for anywhere a name is what's wanted — a wedge, a
 * breadcrumb, a title.
 *
 * A doctrine row's `Action` cell is not a name. It is whatever phrase pins
 * the gated act down precisely, which for most rows reads as a name
 * ("Merging", "Post-merge archivist") and for ten of the fifty-nine runs to a
 * full sentence with the timing spelled out ("Starting the Dig (before
 * authoring a brief) / starting Step 0 (before executing one) / every push on
 * a task branch before its PR exists"). That precision belongs in the
 * doctrine — a gate's spec cannot be vague to suit a diagram — so the cut
 * happens here, at the display edge, not there.
 *
 * Cuts at the first clause boundary, then hard-truncates only as a fallback.
 * The parenthetical, the alternate phrasings and the emphasis are exactly the
 * part that isn't the name, so the first clause is the name in practice.
 * `node.label` stays whole for anything that needs the real string.
 */
export function shortLabel(label: string, maxChars = 24): string {
  // `\/` requires surrounding whitespace so it only matches a genuine
  // alternate-phrasing slash ("...brief) / starting Step 0..."), never a
  // slash inside a compound word ("role/contract", "hook/CLI") — those must
  // survive intact, not get chopped down to "role"/"hook".
  const clause = label.split(/ \(| \/ |—|–|: /)[0]?.trim() ?? label
  if (clause.length <= maxChars) return clause
  return `${clause.slice(0, maxChars - 1).trimEnd()}…`
}
