import { Separator } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { nodeDocHref } from '@atta/aeg-core/docs'
import { badgeLabels, humanLabel, shortLabel } from '../the-harness/_lib/display-label'
import { HarnessCard } from './_components/HarnessCard'
import { deriveGroups, type GroupKey } from '../the-harness/_lib/groupings'
import { loadDiagramModel } from '../the-harness/_lib/load-diagram'

const INTRO =
  'Vinaya is a series of deterministic checks and workflows that hold agentic and human development to the same discipline — an AI agent and a person answer to the identical rules before anything merges. Each ring below is read at build time from this repo’s own doctrine, not hand-written for this page.'

export const metadata = {
  title: 'Docs — Vinaya',
  description: INTRO
}

const GROUP_TAG_LABEL: Record<GroupKey, string> = {
  ring0: 'ring 0',
  ring1: 'ring 1',
  ring2: 'ring 2',
  actions: 'action',
  contracts: 'contract',
  actors: 'role'
}

/**
 * The generated reference view of the harness. `/docs` used to redirect into a
 * raw-markdown dump that published ~60% of `aeg-root/` — most of it backing no
 * node a reader could reach. It is now the other renderer of the same
 * `DiagramModel` `/the-harness` draws: every part of the harness,
 * grouped by its ring, each carrying the model's own plain-English `detail`,
 * its `category`/`actorType` badges, and — for a ring-0 gate — the action it
 * guards. A part that backs an `aeg-root/**` doc links to it; that doc page
 * renders the raw machine artifact beneath the same model frame.
 *
 * Every word here is the model's or the doc's — nothing is hand-transcribed.
 */
export default async function DocsReferencePage() {
  const model = await loadDiagramModel()
  const groups = deriveGroups(model)

  // The action a ring-0 gate guards, resolved from the model's `guards` edges —
  // `from` is the gate node, `to` the `action:<id>` node whose label we show.
  const actionLabelById = new Map(model.nodes.filter((n) => n.kind === 'action').map((n) => [n.id, n.label]))
  const guardsByNodeId = new Map<string, string[]>()
  for (const edge of model.edges) {
    if (edge.kind !== 'guards') continue
    const label = actionLabelById.get(edge.to)
    if (!label) continue
    guardsByNodeId.set(edge.from, [...(guardsByNodeId.get(edge.from) ?? []), humanLabel(label)])
  }

  return (
    <article className='space-y-8'>
      <header className='space-y-3'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          Reference
        </Text>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          The harness, part by part
        </Heading>
        <Text size='lg' muted className='leading-relaxed'>
          {INTRO}
        </Text>
      </header>

      {groups.map((group) => (
        <section key={group.key} className='space-y-4'>
          <Separator className='opacity-60' />
          <Heading level={2} className='font-serif font-light tracking-normal leading-tight text-foreground'>
            {group.label}
          </Heading>
          <div className='grid gap-3 sm:grid-cols-2'>
            {group.children.map((node) => (
              <HarnessCard
                key={node.id}
                kindTag={GROUP_TAG_LABEL[group.key]}
                title={shortLabel(humanLabel(node.displayLabel ?? node.label), 72)}
                badges={badgeLabels(node)}
                detail={node.detail}
                guards={guardsByNodeId.get(node.id)}
                href={nodeDocHref(node) ?? undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
