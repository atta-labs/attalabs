import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DiagramExplorer } from './_components/DiagramExplorer'
import { deriveGroups } from './_lib/groupings'
import { loadDiagramModel } from './_lib/load-diagram'
import { readMoreHref } from './_lib/read-more'

export const metadata = {
  title: 'The Harness — Vinaya',
  description:
    'The enforcement mechanism, rendered at build time from this monorepo’s own doctrine files — nothing hand-transcribed.'
}

export default async function HowItWorksPage() {
  const model = await loadDiagramModel()
  // Derived server-side and passed as plain props — DiagramExplorer is a
  // client component that must never import @attalabs/aeg-core's value exports,
  // @/lib/github-links, or @/lib/docs/load-aeg-docs (all server-only, reading
  // node:fs), directly (see DiagramExplorer.tsx's and LeafPanel.tsx's own
  // doc comments for why).
  const groups = deriveGroups(model)
  const { nav } = await loadAegDocs()
  const surfacedSlugs = new Set(nav.flat.map((doc) => doc.slug))

  // The public in-app document is the only leaf-panel destination. A role or
  // contract slug that isn't in the surfaced set would ship a dead "Read
  // more" link — fail the build loudly instead.
  const readMoreHrefs: Record<string, string> = {}
  for (const node of model.nodes) {
    const href = readMoreHref(node)
    if (!href) continue
    if (node.kind === 'role' || node.kind === 'contract') {
      const slug = href.replace(/^\/docs\//, '')
      if (!surfacedSlugs.has(slug)) {
        throw new Error(
          `readMoreHref for ${node.kind} node "${node.label}" resolves to doc slug ` +
            `"${slug}", which is not in loadAegDocs().nav.flat — this would ship a dead ` +
            `"Read more" link. Fix the doctrine frontmatter (parent:/exclude) or the ` +
            'mapping in read-more.ts.'
        )
      }
    }
    readMoreHrefs[node.id] = href
  }

  return (
    // No Footer on this page — TopBar only. Fills exactly the viewport below
    // it (h-14) on `lg`+, since the diagram is the page's dominant element
    // and must be fully visible with zero scrolling there. Below `lg`,
    // `DiagramExplorer` stacks its sidebar under the ring, which no longer
    // fits a fixed viewport-height box — so the wrapper reverts to natural
    // height and the page scrolls instead of clipping.
    <div className='w-full lg:h-full lg:overflow-hidden'>
      <DiagramExplorer groups={groups} findings={model.findings} readMoreHrefs={readMoreHrefs} />
    </div>
  )
}
