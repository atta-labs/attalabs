import type { DiagramNode } from '@atta/aeg-core'
import { Badge } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowUpRight, Lock } from 'lucide-react'
import { humanLabel, shortLabel } from '../_lib/display-label'
import type { GroupKey } from '../_lib/groupings'
import { DoctrineProse } from './DoctrineProse'

const GROUP_TAG_LABEL: Record<GroupKey, string> = {
  ring0: 'ring 0',
  ring1: 'ring 1',
  ring2: 'ring 2',
  actions: 'action',
  contracts: 'contract',
  actors: 'role'
}

/**
 * The leaf drill-down panel. Reading order is the whole design:
 *
 *   label → badge → question → truncated explanation → "Read more →"
 *
 * The question (`node.summary`) leads, because it is the one line written for
 * a reader rather than for a gate ("Ever had a teammate change code they
 * clearly never read the docs for?" — every doctrine table calls this column
 * "Summary," but its content is always phrased as a question). Under it,
 * `node.detail` gives the opening of the real explanation, clamped, and
 * "Read more" carries the reader to the source line for the rest. So the
 * panel answers "why do I care?", then "what is it?", then "where's the full
 * text?" — a taste, not a transcript.
 *
 * `detail` is the doctrine column right before `implementation` (`gate`/
 * `check` rows only — `action`/`role`/`contract` rows have no equivalent
 * column, so nothing renders for them; it is never hand-authored to fill that
 * gap). It runs 1.5k–2.7k chars, which is why it is clamped and never shown
 * whole: #508's original "~40 words from doctrine tables" plan died on
 * exactly that discovery (#551: "25–600+ words with no consistent short
 * form"). #508's amended panel spec lists `summary` without `detail`; the
 * clamped explanation is a deliberate addition on top of it — the question
 * alone left the panel with nothing under it.
 *
 * The title is `humanLabel(node.label)` — a few rows carry a leading
 * `G1 —`.."G5 —" prefix, stripped for display only; `node.label` itself keeps
 * it as the stable id everywhere else.
 *
 * The badge is one flat fill for every value, never keyed to WHICH category
 * ("hook" green, "gate" red) — the doctrine grades no category above another,
 * and a per-value palette would assert a severity ranking that does not
 * exist. #508 specifies `variant='outline'`; outline renders near-invisible
 * against this page's cream background, so the fill is a deliberate departure
 * on that one point, preserving the brief's actual constraint (no per-value
 * colour coding).
 *
 * No live-status pill — `DiagramModel.iteration` never backs this panel (see
 * `load-diagram.ts`).
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
          {shortLabel(humanLabel(node.label), 48)}
        </Heading>
      </div>

      {(node.category || node.actorType) && (
        <Badge className='w-fit font-mono text-xs uppercase'>{node.category ?? node.actorType}</Badge>
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

      {node.detail && <DoctrineProse>{node.detail}</DoctrineProse>}

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
