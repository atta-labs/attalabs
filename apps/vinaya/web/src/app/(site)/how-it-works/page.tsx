import { githubBlobUrl } from '@/lib/github-links'
import { DiagramExplorer } from './_components/DiagramExplorer'
import { deriveGroups } from './_lib/groupings'
import { loadDiagramModel } from './_lib/load-diagram'
import { readMoreTarget } from './_lib/read-more'

export const metadata = {
  title: 'How it works — Vinaya',
  description:
    'The enforcement mechanism, rendered at build time from this monorepo’s own doctrine files — nothing hand-transcribed.'
}

export default async function HowItWorksPage() {
  const model = await loadDiagramModel()
  // Derived server-side and passed as plain props — DiagramExplorer is a
  // client component that must never import @atta/aeg-core's value exports,
  // or @/lib/github-links (server-only, reads node:fs), directly (see
  // DiagramExplorer.tsx's and LeafPanel.tsx's own doc comments for why).
  const groups = deriveGroups(model)
  const readMoreHrefs: Record<string, string> = {}
  for (const node of model.nodes) {
    const target = readMoreTarget(node)
    if (target) readMoreHrefs[node.id] = githubBlobUrl(target.path, target.line)
  }

  return (
    // No Footer on this page — TopBar only. Fills exactly the viewport below
    // it (h-14) on `lg`+, since the diagram is the page's dominant element
    // and must be fully visible with zero scrolling there. Below `lg`,
    // `DiagramExplorer` stacks its sidebar under the ring, which no longer
    // fits a fixed viewport-height box — so the wrapper reverts to natural
    // height and the page scrolls instead of clipping.
    <div className='w-full lg:h-[calc(100dvh-56px)] lg:min-h-[560px]'>
      <DiagramExplorer groups={groups} findings={model.findings} readMoreHrefs={readMoreHrefs} />
    </div>
  )
}
