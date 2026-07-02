/**
 * The canonical "surfaced doc" manifest for `aeg-root/` (D-079). Defines, as
 * data, which docs count as generic AEG framework documentation — the set a
 * public AEG page would show — versus this repo's execution-state/registry
 * artifacts. This is the single source of truth the C6 docs-coherence check
 * (`docs-coherence.ts`) and `aeg-studio-cleanup`'s Studio `/docs` curation
 * both consume. A second, competing exclusion rule is the failure mode this
 * manifest exists to prevent — do not hardcode exclusion logic elsewhere.
 *
 * Paths are relative to `aeg-root/` (e.g. `roles/developer.md`,
 * `iterations/README.md`), matching `DocFrontmatter`'s existing convention.
 */

import type { DocFrontmatter } from './types'

export type SurfacedRule = {
  id: string
  description: string
  matches: (relPath: string) => boolean
}

/**
 * Ordered exclusion rules. A path matching ANY rule is excluded by default
 * (subject to the frontmatter override below). Anything matching none of
 * these rules defaults to surfaced — a new generic doc must not silently
 * vanish from the manifest.
 */
export const SURFACED_EXCLUSION_RULES: SurfacedRule[] = [
  {
    id: 'iteration-execution-files',
    description:
      "Active iteration topology/execution files are this repo's execution state, not generic framework docs. `iterations/README.md` is the one exception (a generic explainer of the iterations mechanism itself).",
    matches: (relPath) => relPath.startsWith('iterations/') && relPath !== 'iterations/README.md'
  },
  {
    id: 'token-ledgers',
    description: 'Per-iteration token ledgers are execution state.',
    matches: (relPath) => relPath.endsWith('.tokens.md')
  },
  {
    id: 'projects-registry',
    description: "This repo's project registry, not a generic framework doc.",
    matches: (relPath) => relPath === 'projects.md'
  },
  {
    id: 'discovery-artifacts',
    description: 'Dated discovery/session artifacts are execution state.',
    matches: (relPath) => relPath === 'discovery' || relPath.startsWith('discovery/')
  }
]

/**
 * Whether `relPath` (relative to `aeg-root/`) is a surfaced doc. A boolean
 * `surfaced` frontmatter field always wins over the path rules — the escape
 * hatch for the enumerated exceptions in either direction.
 */
export function isSurfacedDoc(relPath: string, frontmatter: Pick<DocFrontmatter, 'surfaced'>): boolean {
  if (typeof frontmatter.surfaced === 'boolean') return frontmatter.surfaced
  return !SURFACED_EXCLUSION_RULES.some((rule) => rule.matches(relPath))
}

export type SurfacedManifestEntry = {
  relPath: string
  frontmatter: Pick<DocFrontmatter, 'surfaced'>
}

/** Filters a list of parsed doc entries down to the surfaced subset. */
export function surfacedDocs(entries: SurfacedManifestEntry[]): string[] {
  return entries.filter((e) => isSurfacedDoc(e.relPath, e.frontmatter)).map((e) => e.relPath)
}
