import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * One dashboard card (task 11, #571) — a titled surface with a total count in
 * the header. The body holds whatever the caller passes: a few preview rows
 * that link onward (Projects, Iterations) or a full status-filtered list (the
 * unified Tasks card). The footer "view all" link is optional — omit
 * `href`/`viewAllLabel` for a card that IS the surface, not a window onto
 * another page (the Tasks card has no onward page to link to).
 */
export function DashboardCard({
  title,
  count,
  href,
  viewAllLabel,
  children
}: {
  title: string
  /** Total behind this card — shown next to the title. `null` hides it. */
  count: number | null
  /** Footer "view all" link target. Omit (with `viewAllLabel`) for no footer. */
  href?: string
  viewAllLabel?: string
  children: ReactNode
}) {
  return (
    <Card className='flex flex-col border border-border bg-card'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-baseline justify-between gap-2 font-serif text-xl text-card-foreground'>
          <span>{title}</span>
          {count !== null && <span className='font-mono text-sm text-muted-foreground'>{count}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-3'>
        <div className='flex-1 space-y-2'>{children}</div>
        {href && viewAllLabel ? (
          <NextLink
            variant='unstyled'
            href={href}
            className='group inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-accent'
          >
            {viewAllLabel}
            <ArrowRight className='size-3 transition-transform group-hover:translate-x-0.5' />
          </NextLink>
        ) : null}
      </CardContent>
    </Card>
  )
}
