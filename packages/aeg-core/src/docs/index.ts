export type { Doc, DocFrontmatter, DocNav, DocSection } from './types'
export { parseDocFrontmatter, deriveTitle, stripLeadingH1 } from './parse-doc'
export type { ParsedDoc } from './parse-doc'
export { buildDocNav } from './build-doc-nav'
export type { BuildDocNavOptions } from './build-doc-nav'
export { findDoc, getNextDoc, getPrevDoc } from './nav-helpers'
export { isSurfacedDoc, surfacedDocs, modelBackedDocPaths } from './surfaced-manifest'
export type { SurfacedManifestEntry } from './surfaced-manifest'
export { nodeDocRoute, nodeDocHref } from './node-route'
export type { NodeDocRoute } from './node-route'
export { evaluateDocsCoherence } from './docs-coherence'
export type { DocsCoherenceEntry, DocsCoherenceResult } from './docs-coherence'
export {
  ALLOWED_MECHANICS,
  CONTRACT_BLOCKS,
  countWords,
  enforcementPublishedText,
  evaluatePublishedProse,
  extractShortVersion,
  publishedDoctrineBody,
  REFERENCE_HEADING,
  ROLE_BLOCKS,
  SHORT_VERSION_HEADING,
  SHORT_VERSION_MAX_WORDS,
  SHORT_VERSION_MIN_WORDS
} from './published-prose'
export type { PublishedProseEntry, PublishedProseResult } from './published-prose'
