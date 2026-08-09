import 'server-only'
import { deriveDiagramModel, type DiagramModel } from '@atta/aeg-core'
import { createFileDoctrineSource } from '@atta/vinaya-sources'
import { findAegRoot } from '@/lib/github-links'

/**
 * Request-time data spine for `/the-harness`: reads doctrine off disk and
 * derives the render model. `config` is `null` — v1 ships no
 * `vinaya.config.json` UI, so nothing is disabled. `tranche` is `null` —
 * `DiagramModel.tranche` is passthrough task-lifecycle data with no
 * per-check pass/fail signal (see `diagram-model.ts`'s own doc comment), so
 * there is nothing honest to render from it beyond a label this page doesn't
 * need. Throws if the doctrine read or derivation fails — a broken build is
 * the correct failure mode here, not a silently empty diagram.
 */
export async function loadDiagramModel(): Promise<DiagramModel> {
  const doctrineSource = createFileDoctrineSource({ root: findAegRoot() })
  const doctrine = await doctrineSource.getDoctrine()
  return deriveDiagramModel(doctrine, null, null)
}
