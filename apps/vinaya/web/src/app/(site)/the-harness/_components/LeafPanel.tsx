import type { DiagramNode } from '@atta/aeg-core'
import { Badge } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowUpRight, Lock } from 'lucide-react'
import { badgeLabels, humanLabel, shortLabel } from '../_lib/display-label'
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
 * The leaf drill-down panel. Reading order is the whole design:
 *
 *   kind tag → question → NAME → badges → render-state → description →
 *   "Read more →"
 *
 * The question (`node.summary`) leads because it is the one line authored for
 * a reader rather than for a gate ("Ever had a teammate change code they
 * clearly never read the docs for?" — every doctrine table calls that column
 * "Summary," but its content is always phrased as a question). The name only
 * says WHICH node, which someone who just clicked a wedge already knows. Then
 * `node.detail` answers the question in one plain sentence, and "Read more"
 * goes to the node's own doctrine source. Why care → what is it → where's the
 * whole truth.
 *
 * `detail` is every kind's own `description` (see `DiagramNode.detail`) — one
 * sentence, present on gate/check/action/role/contract alike. It is NEVER the
 * enforcement table's spec column, which is written to enforce and reads like
 * it; that column is what "Read more" reaches. #508's amended panel spec lists
 * `summary` and a link with no field between them, which left the panel
 * asking a question it never answered — `description` (#553) closed that.
 *
 * The name is `shortLabel(humanLabel(...))`: `humanLabel` strips a `G1 —`..
 * "G5 —" prefix and stray backticks for display, `shortLabel` cuts a doctrine
 * `Action` cell down to its first clause — 29% carry a parenthetical or a
 * D-###/#NNN citation, and a name is not a citation. `node.label` keeps the
 * full string as the stable id everywhere else.
 *
 * The badge is one flat fill for every value, never keyed to WHICH category
 * ("hook" green, "gate" red) — the doctrine grades no category above another,
 * and a per-value palette would assert a severity ranking that does not
 * exist. #508 specifies `variant='outline'`; outline renders near-invisible
 * against this page's cream background, so the fill is a deliberate departure
 * on that one point, preserving the brief's actual constraint (no per-value
 * colour coding). `either` renders as two badges — see `badgeLabels`.
 *
 * No live-status pill — `DiagramModel.iteration` never backs this panel (see
 * `load-diagram.ts`).
 *
 * `readMoreHref`/`viewSourceHref` both arrive pre-computed from the server
 * (`page.tsx`) — this component must never import `@/lib/github-links` or
 * `@/lib/docs/load-aeg-docs` itself: both are `server-only` (read `node:fs`),
 * and this panel renders from a client component in response to a click.
 *
 * Two link shapes, not one: `readMoreHref` is the in-app doc route (present
 * for gate/check/role/contract, absent for action — no doctrine markdown
 * backs an action node) and renders as a `next/link`, no new tab. `View
 * source` is the GitHub blob (present whenever `readMoreHref` is, plus
 * action) and always opens in a new tab — it is the same-page navigation vs.
 * leave-the-app distinction, and the two must not be conflated into one
 * link or one label.
 */
export function LeafPanel({
  node,
  groupKey,
  readMoreHref,
  viewSourceHref
}: {
  node: DiagramNode
  groupKey: GroupKey
  readMoreHref: string | undefined
  viewSourceHref: string | undefined
}) {
  return (
    <div className='flex flex-col gap-4'>
      <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-[0.1em]'>
        {GROUP_TAG_LABEL[groupKey]}
      </Text>

      {/* Question first, name second. The question is the one line written
          for a reader — it earns the attention the name then collects. A
          reader who has just clicked a wedge already knows WHICH node they
          clicked; what they do not know is why it matters. */}
      {node.summary && (
        <Text size='xl' weight='semibold' className='font-serif text-card-foreground italic leading-snug'>
          {node.summary}
        </Text>
      )}

      <Heading level={3} className='font-mono text-card-foreground text-base uppercase tracking-[0.08em]'>
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

      {node.renderState !== 'active' && (
        <div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
          {node.renderState === 'locked' && <Lock className='h-3 w-3' />}
          <Text as='span' className='font-mono uppercase tracking-[0.08em]'>
            {node.renderState === 'locked' ? `locked${node.lock ? ` — ${node.lock}` : ''}` : 'disabled'}
          </Text>
        </div>
      )}

      {/* Plain text, not a markdown renderer. `detail` used to be the
          doctrine's enforcement column — 2.7k chars, dense with backticked
          identifiers — so this rendered through `react-markdown` and clamped
          to six lines. Since `detail` became `description` (one plain
          sentence, no markdown in any of the 56), both were dead: a clamp
          that can never fire and a parser with nothing to parse. Root
          font-size here is 18px, so `text-sm` (0.875rem) renders at 15.75px,
          under the 16px body floor — `size='md'` is the smallest that clears
          it. */}
      {node.detail && (
        <Text size='md' className='font-sans text-card-foreground leading-relaxed'>
          {node.detail}
        </Text>
      )}

      {(readMoreHref || viewSourceHref) && (
        <div className='flex flex-col gap-2'>
          {readMoreHref && (
            <NextLink
              href={readMoreHref}
              variant='link'
              className='inline-flex w-fit items-center gap-1 text-card-foreground text-sm hover:text-accent'
            >
              Read more
              <ArrowUpRight className='h-3.5 w-3.5' />
            </NextLink>
          )}
          {viewSourceHref && (
            <NextLink
              href={viewSourceHref}
              target='_blank'
              rel='noreferrer'
              variant='link'
              className='inline-flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-accent'
            >
              View source
              <ArrowUpRight className='h-3.5 w-3.5' />
            </NextLink>
          )}
        </div>
      )}
    </div>
  )
}
