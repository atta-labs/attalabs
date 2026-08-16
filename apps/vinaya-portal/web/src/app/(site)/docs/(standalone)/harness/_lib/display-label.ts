/**
 * Zero imports, deliberately — this file must never pull in `groupings.ts`
 * or `@attalabs/aeg-core`. `DiagramCanvas.tsx` and `LeafPanel.tsx` are client
 * components; importing anything that transitively touches aeg-core's
 * value exports (`ACTIONS`, `deriveGroups`, ...) drags `@attalabs/aeg-forge-state`'s
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
 * The badges a node shows: its `category` (gate/check) or its `actorType`
 * (role), never both — no node carries both fields. Structurally typed rather
 * than importing `DiagramNode`, per this module's zero-import rule.
 *
 * `either` expands to HUMAN + AGENT rather than rendering the literal word.
 * The doctrine says "either" because it is constraining one role in one
 * field; a reader is asking "who does this?", and "EITHER" answers a question
 * they did not ask — it only means anything once you already know the other
 * two values exist. Two badges state the same fact without that prerequisite.
 * A display expansion of one value, NOT a third actor type: `actorType` stays
 * `agent | human | either` in the model.
 *
 * Shared by the leaf panel's badges and the drilled hub's legend, so the two
 * cannot drift into disagreeing about what a node is.
 */
export function badgeLabels(node: { category?: string; actorType?: string; crosses?: string }): string[] {
  if (node.category) return [node.category]
  if (node.actorType === 'either') return ['human', 'agent']
  if (node.actorType) return [node.actorType]
  // Actions: does this act reach GitHub, or stay on the machine? Rendered as
  // words rather than left to ring membership — the ring holds all ten.
  if (node.crosses) return [node.crosses === 'into-github' ? 'reaches github' : 'stays local']
  return []
}

/**
 * Every badge value present in a ring, first-seen order, deduped — the drilled
 * hub's legend.
 *
 * Derived from the ring's own children, never a hardcoded list of what a ring
 * "should" contain. `category`/`actorType` are TypeScript unions, erased at
 * runtime, so the only honest runtime source for "what values exist here" is
 * the nodes themselves. That also makes the legend self-correcting: delete the
 * last `event` row from a ring's doctrine table and its EVENT chip goes with
 * it, with no page change — the same property the diagram itself has.
 *
 * Consequently this lists what a ring HAS, not what it could have. A ring with
 * only `ci` checks shows one chip, because a second chip would assert a
 * variety that ring does not actually have.
 */
export function ringBadgeLabels(children: Array<{ category?: string; actorType?: string }>): string[] {
  return Array.from(new Set(children.flatMap(badgeLabels)))
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
