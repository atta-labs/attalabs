import 'server-only'
import { loadDiagramModel } from '@/app/(site)/docs/(standalone)/harness/_lib/load-diagram'

/**
 * Every diagram node's `summary` field, doctrine-wide — written as a rhetorical
 * question by convention (e.g. "Ever had a branch pushed straight to main by
 * mistake?"). Derived from the exact same `DiagramModel` `/docs/harness` paints
 * its diagram from, so the landing page and the diagram never drift. Never
 * hand-transcribed.
 */
export async function loadDoctrineQuestions(): Promise<string[]> {
  const model = await loadDiagramModel()
  const summaries = model.nodes
    .map((node) => node.summary)
    .filter((summary): summary is string => summary !== undefined)
  return Array.from(new Set(summaries))
}
