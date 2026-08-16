import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * One dashboard card (task 11, #571) — a titled surface with a total count in
 * the header. The body holds whatever the caller passes: a few preview rows
 * that link onward (Projects, Tranches) or a full status-filtered list (the
 * unified Tasks card). The footer "view all" link is optional — omit
 * `href`/`viewAllLabel` for a card that IS the surface, not a window onto
 * another page (the Tasks card has no onward page to link to).
 *
 * Header-to-body spacing is set here rather than left to the active library:
 * `Card`'s own flex gap differs per library (none in `basic`, `gap-6` in
 * `brutal`, `--card-spacing` in `retro`), so the card pins `gap-2` and zeroes
 * the header's bottom padding — one modest gap in every library.
 *
 * The footer link reuses the docs "Read the doctrine" treatment verbatim
 * (`(site)/docs/_components/HarnessCard.tsx`): `NextLink variant='link'`
 * (underline + underline-offset) with a trailing `ArrowUpRight`.
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
    <Card className='flex flex-col gap-2'>
      <CardHeader className='pb-0'>
        <CardTitle className='flex items-baseline justify-between gap-2 font-serif text-xl text-card-foreground'>
          <span>{title}</span>
          {count !== null && <span className='font-mono text-sm text-muted-foreground'>{count}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-3'>
        <div className='flex-1 space-y-2'>{children}</div>
        {href && viewAllLabel ? (
          <NextLink
            variant='link'
            href={href}
            className='mt-auto inline-flex w-fit items-center gap-1 pt-1 text-card-foreground text-sm hover:text-primary'
          >
            {viewAllLabel}
            <ArrowUpRight className='h-3.5 w-3.5' />
          </NextLink>
        ) : null}
      </CardContent>
    </Card>
  )
}
