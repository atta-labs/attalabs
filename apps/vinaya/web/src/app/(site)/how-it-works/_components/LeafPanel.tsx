import type { DiagramNode } from '@atta/aeg-core'
import { Badge } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowUpRight, Lock } from 'lucide-react'
import { humanLabel } from '../_lib/display-label'
import type { GroupKey } from '../_lib/groupings'

const GROUP_TAG_LABEL: Record<GroupKey, string> = {
  ring0: 'ring 0',
  ring1: 'ring 1',
  ring2: 'ring 2',
  actions: 'action',
  contracts: 'contract',
  actors: 'role'
}

/**
 * The leaf drill-down panel. Content model is Title → Question → Summary →
 * link (round-2 fix): the title is `humanLabel(node.label)` — a few
 * doctrine rows carry a leading `G1 —`.."G5 —" code prefix, stripped for
 * display only (see `display-label.ts`'s `humanLabel` doc comment); `node.label`
 * itself, G-number included, stays the stable id everywhere else. `node.summary`
 * is the doctrine row's rhetorical question ("Ever had a teammate change code they
 * clearly never read the docs for?" — every doctrine table literally labels
 * this column "Summary," but its actual content is always phrased as a
 * question), `node.detail` is the real mechanism explanation (`gate`/`check`
 * nodes only — the doctrine column right before `implementation`, e.g. "what
 * must be true," "Re-verifies," "Catches"; `action`/`role`/`contract` nodes
 * have no equivalent doctrine column, so no detail renders for them — never
 * hand-authored to fill the gap). Also: ring/kind tag, category-or-actorType
 * badge (neutral, never color-coded), a render-state indicator when not
 * `active`, and a GitHub "Read more" link. No live-status pill —
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
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-[0.1em]'>
          {GROUP_TAG_LABEL[groupKey]}
        </Text>
        <Heading level={3} className='font-serif text-card-foreground text-xl'>
          {humanLabel(node.label)}
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

      {/* The question is the lead element of this panel, not a secondary
          caption — round-3 fix: it was rendering at the same `sm` size as
          every other line, with nothing setting it apart. */}
      {node.summary && (
        <Text size='xl' weight='semibold' className='font-serif text-card-foreground italic leading-snug'>
          {node.summary}
        </Text>
      )}

      {/* Round-4 floor: body text (question/detail) >=16px. This app's root
          font-size is 18px, so Tailwind's rem-based `text-sm` (0.875rem)
          actually renders at 15.75px — under the floor. `size='md'`
          (1rem) is the smallest Text size that clears it. */}
      {node.detail && (
        <Text size='md' className='font-sans text-card-foreground leading-relaxed'>
          {node.detail}
        </Text>
      )}

      {readMoreHref && (
        <a
          href={readMoreHref}
          target='_blank'
          rel='noreferrer'
          className='inline-flex w-fit items-center gap-1 text-card-foreground text-sm hover:text-accent'
        >
          Read more
          <ArrowUpRight className='h-3.5 w-3.5' />
        </a>
      )}
    </div>
  )
}
