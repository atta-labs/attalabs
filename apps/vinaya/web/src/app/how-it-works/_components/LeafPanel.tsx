import type { DiagramNode } from '@atta/aeg-core'
import { Badge } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowUpRight, Lock } from 'lucide-react'
import type { GroupKey } from '../_lib/groupings'

const GROUP_TAG_LABEL: Record<GroupKey, string> = {
  ring0: 'ring 0',
  ring1: 'ring 1',
  ring2: 'ring 2',
  'action-github': 'action',
  'action-internal': 'action',
  actors: 'role'
}

/**
 * The leaf drill-down panel. Exactly the fields Issue #508's amendments
 * allow — label, ring/kind tag, category-or-actorType badge (neutral,
 * never color-coded), a render-state indicator when not `active`, the
 * doctrine summary, and a GitHub "Read more" link. No live-status pill —
 * `DiagramModel.iteration` never backs this panel (see `load-diagram.ts`).
 *
 * `readMoreHref` arrives pre-computed from the server (`page.tsx`) — this
 * component must never import `@/lib/github-links` itself: that module is
 * `server-only` (reads `node:fs` to locate the repo root), and this panel
 * renders from a client component in response to a click.
 */
export function LeafPanel({
  node,
  groupKey,
  readMoreHref
}: {
  node: DiagramNode
  groupKey: GroupKey
  readMoreHref: string | undefined
}) {
  return (
    <div className='flex flex-col gap-4 border-border border-l bg-card p-6'>
      <div className='flex flex-col gap-2'>
        <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-[0.1em]'>
          {GROUP_TAG_LABEL[groupKey]}
        </Text>
        <Heading level={3} className='font-serif text-card-foreground text-xl'>
          {node.label}
        </Heading>
      </div>

      {(node.category || node.actorType) && (
        <Badge variant='outline' className='w-fit font-mono text-xs uppercase'>
          {node.category ?? node.actorType}
        </Badge>
      )}

      {node.renderState !== 'active' && (
        <div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
          {node.renderState === 'locked' && <Lock className='h-3 w-3' />}
          <Text as='span' className='font-mono uppercase tracking-[0.08em]'>
            {node.renderState === 'locked' ? `locked${node.lock ? ` — ${node.lock}` : ''}` : 'disabled'}
          </Text>
        </div>
      )}

      {node.summary && (
        <Text size='sm' className='font-sans text-card-foreground leading-relaxed'>
          {node.summary}
        </Text>
      )}

      {readMoreHref && (
        <a
          href={readMoreHref}
          target='_blank'
          rel='noreferrer'
          className='inline-flex w-fit items-center gap-1 text-foreground text-sm hover:text-accent'
        >
          Read more
          <ArrowUpRight className='h-3.5 w-3.5' />
        </a>
      )}
    </div>
  )
}
