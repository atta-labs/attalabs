import { Badge, Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowUpRight } from 'lucide-react'

/**
 * The one map card, reused for every node kind on `/docs` (roles, contracts,
 * actions, gates/checks). Uniform by construction: the card fills its grid
 * cell (`h-full`) and the grid stretches every cell in a row to the tallest,
 * so a whole row is one height. Inside, the title and description boxes each
 * reserve two lines (`min-h-[2lh]` + `line-clamp-2`), so a short title/detail
 * leaves whitespace rather than shifting the rows below, and anything longer
 * truncates at the second line rather than ballooning the card —
 * and the "Read the doctrine" footer is pinned to the bottom (`mt-auto`), so
 * every footer in a row lines up regardless of how much content sits above it.
 */
export type HarnessCardProps = {
  /** Kind label — "role" / "contract" / "action" / "ring 0" … */
  kindTag: string
  title: string
  badges: string[]
  detail?: string
  /** ring-0 gates only: the action(s) this gate guards. */
  guards?: string[]
  /** the in-app deep link; omitted renders no footer. */
  href?: string
}

export function HarnessCard({ kindTag, title, badges, detail, guards, href }: HarnessCardProps) {
  return (
    <Card className='h-full bg-card'>
      <CardContent className='flex h-full flex-col gap-2 px-4 py-3'>
        <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-widest'>
          {kindTag}
        </Text>

        <Heading
          level={3}
          className='line-clamp-2 min-h-[2lh] font-mono text-card-foreground text-sm uppercase leading-snug tracking-widest'
        >
          {title}
        </Heading>

        {badges.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {badges.map((label) => (
              <Badge key={label} className='w-fit font-mono text-xs uppercase'>
                {label}
              </Badge>
            ))}
          </div>
        )}

        {detail && (
          <Text size='sm' className='line-clamp-2 min-h-[2lh] font-sans text-card-foreground leading-relaxed'>
            {detail}
          </Text>
        )}

        {guards && guards.length > 0 && (
          <Text size='xs' muted className='line-clamp-1 font-sans leading-relaxed'>
            Guards: {guards.join(', ')}
          </Text>
        )}

        {href && (
          <NextLink
            href={href}
            variant='link'
            className='mt-auto inline-flex w-fit items-center gap-1 pt-1 text-card-foreground text-sm hover:text-primary'
          >
            Read the doctrine
            <ArrowUpRight className='h-3.5 w-3.5' />
          </NextLink>
        )}
      </CardContent>
    </Card>
  )
}
