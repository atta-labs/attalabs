import { Badge, Card, CardContent, Separator } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowUpRight } from 'lucide-react'
import type { DiagramNode } from '@atta/aeg-core'
import { badgeLabels, humanLabel, shortLabel } from '../how-it-works/_lib/display-label'
import { deriveGroups, type GroupKey } from '../how-it-works/_lib/groupings'
import { loadDiagramModel } from '../how-it-works/_lib/load-diagram'
import { readMoreTarget } from '../how-it-works/_lib/read-more'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'

export const metadata = {
  title: 'Docs — Vinaya',
  description:
    'Every part of the harness, generated at build time from this repo’s own doctrine — each part with its plain-English description, the machine doctrine beneath.'
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
 * `DiagramModel` `/how-it-works` draws (D-087): every part of the harness,
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
  const { nav } = await loadAegDocs()
  const surfacedSlugs = new Set(nav.flat.map((doc) => doc.slug))

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

  const docRouteFor = (node: DiagramNode): string | undefined => {
    const target = readMoreTarget(node)
    if (!target?.docRoute) return undefined
    const slug = target.docRoute.replace(/^\/docs\//, '')
    return surfacedSlugs.has(slug) ? target.docRoute : undefined
  }

  return (
    <article className='space-y-8 pt-4'>
      <header className='space-y-3'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-[0.15em]'>
          Reference
        </Text>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          The harness, part by part
        </Heading>
        <Text size='lg' muted className='leading-relaxed'>
          {metadata.description}
        </Text>
        <Text size='sm' muted className='leading-relaxed'>
          Generated from the same model{' '}
          <NextLink href='/how-it-works' variant='unstyled' className='text-accent underline-offset-4 hover:underline'>
            How it works
          </NextLink>{' '}
          draws — nothing on this page is hand-written.
        </Text>
      </header>

      {groups.map((group) => (
        <section key={group.key} className='space-y-4'>
          <Separator className='opacity-60' />
          <Heading level={2} className='font-serif font-light tracking-normal leading-tight text-foreground'>
            {group.label}
          </Heading>
          <div className='grid gap-3 sm:grid-cols-2'>
            {group.children.map((node) => {
              const guards = guardsByNodeId.get(node.id) ?? []
              const docRoute = docRouteFor(node)
              return (
                <Card key={node.id} className='bg-card'>
                  <CardContent className='flex flex-col gap-2 p-4'>
                    <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-[0.1em]'>
                      {GROUP_TAG_LABEL[group.key]}
                    </Text>
                    <Heading level={3} className='font-mono text-card-foreground text-sm uppercase tracking-[0.06em]'>
                      {shortLabel(humanLabel(node.label), 48)}
                    </Heading>
                    {badgeLabels(node).length > 0 && (
                      <div className='flex flex-wrap gap-1.5'>
                        {badgeLabels(node).map((label) => (
                          <Badge key={label} className='w-fit font-mono text-xs uppercase'>
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {node.detail && (
                      <Text size='sm' className='font-sans text-card-foreground leading-relaxed'>
                        {node.detail}
                      </Text>
                    )}
                    {guards.length > 0 && (
                      <Text size='xs' muted className='font-sans leading-relaxed'>
                        Guards: {guards.join(', ')}
                      </Text>
                    )}
                    {docRoute && (
                      <NextLink
                        href={docRoute}
                        variant='link'
                        className='inline-flex w-fit items-center gap-1 text-card-foreground text-sm hover:text-accent'
                      >
                        Read the doctrine
                        <ArrowUpRight className='h-3.5 w-3.5' />
                      </NextLink>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ))}
    </article>
  )
}
