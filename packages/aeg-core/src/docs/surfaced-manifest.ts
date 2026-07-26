/**
 * The canonical "surfaced doc" manifest for `aeg-root/`. Defines, as
 * data, which docs a public AEG page shows. The rule is **model-backed**: a
 * doc is surfaced if and only if a `DiagramModel` node points at it.
 * The same `DiagramModel` that `/the-harness` renders is the allowlist for
 * `/docs` — the two surfaces are two renderers of one model, and the doc that
 * backs no reachable node stops being public, every build.
 *
 * The node→doc mapping (`modelBackedDocPaths`) is the same one `read-more.ts`
 * uses to resolve a node's "Read more" target: gate/check nodes back
 * `enforcement.md`; a role node backs `roles/<id>.md`; a contract node backs
 * `contracts/<id>.md`. `action`/`ring` nodes back no `aeg-root/**` document
 * (an action's source is `packages/aeg-core/src/actions.ts`, a ring is a
 * summary label), so they add nothing to the set. Today that is 16 files —
 * `enforcement.md` + the 9 `roles/*.md` + the 6 `contracts/*.md`.
 *
 * This is the single source of truth the C6 docs-coherence check
 * (`docs-coherence.ts`) and Vinaya's `/docs` loader both consume. There is
 * **no second, path-based exclusion rule** — a competing rule is the failure
 * mode this manifest exists to prevent, and the model-backed set replaced the
 * old path-exclusion rules outright rather than sitting beside them. The only
 * escape hatch is the per-doc `surfaced` frontmatter override, which wins in
 * both directions.
 *
 * Purity: this module imports only the `DiagramModel` **type** from the
 * diagram layer — no runtime coupling, no I/O. The doctrine is read (and the
 * model derived) by the caller, which passes the derived path set in; aeg-core
 * stays zero-I/O (, #372/#382/#506).
 *
 * Paths are relative to `aeg-root/` (e.g. `roles/developer.md`), matching
 * `DocFrontmatter`'s existing convention.
 */

import type { DiagramModel } from '../diagram-model'
import type { DocFrontmatter } from './types'

/**
 * The set of `aeg-root/`-relative doc paths a `DiagramModel` points at — the
 * allowlist. Mirrors `read-more.ts`'s `docRoute` resolution exactly, so
 * `/docs`'s surfaced set and `/the-harness`'s "Read more" targets can never
 * name different files: gate/check → `enforcement.md`, role → `roles/<id>.md`,
 * contract → `contracts/<id>.md`. A node's `label` is its doctrine id
 * (`role.roleId` / `contract.contractId`), and every `roles/*.md` /
 * `contracts/*.md` file is named `<id>.md` — one convention backs both the
 * GitHub path and the docs route.
 */
export function modelBackedDocPaths(model: DiagramModel): Set<string> {
  const paths = new Set<string>()
  for (const node of model.nodes) {
    if (node.kind === 'gate' || node.kind === 'check') paths.add('enforcement.md')
    else if (node.kind === 'role') paths.add(`roles/${node.label}.md`)
    else if (node.kind === 'contract') paths.add(`contracts/${node.label}.md`)
  }
  return paths
}

const NO_MODEL_BACKED_PATHS: ReadonlySet<string> = new Set()

/**
 * Whether `relPath` (relative to `aeg-root/`) is a surfaced doc. A boolean
 * `surfaced` frontmatter field always wins over the model — the escape hatch
 * in both directions. Otherwise the doc is surfaced iff it is in
 * `surfacedPaths` (the model-backed allowlist from `modelBackedDocPaths`).
 *
 * `surfacedPaths` is optional so a caller that has no model surfaces nothing
 * by default rather than everything — the safe direction for a rule whose
 * whole point is that a doc publishes only when a node points at it.
 */
export function isSurfacedDoc(
  relPath: string,
  frontmatter: Pick<DocFrontmatter, 'surfaced'>,
  surfacedPaths: ReadonlySet<string> = NO_MODEL_BACKED_PATHS
): boolean {
  if (typeof frontmatter.surfaced === 'boolean') return frontmatter.surfaced
  return surfacedPaths.has(relPath)
}

export type SurfacedManifestEntry = {
  relPath: string
  frontmatter: Pick<DocFrontmatter, 'surfaced'>
}

/** Filters a list of parsed doc entries down to the surfaced subset. */
export function surfacedDocs(
  entries: SurfacedManifestEntry[],
  surfacedPaths: ReadonlySet<string> = NO_MODEL_BACKED_PATHS
): string[] {
  return entries.filter((e) => isSurfacedDoc(e.relPath, e.frontmatter, surfacedPaths)).map((e) => e.relPath)
}
