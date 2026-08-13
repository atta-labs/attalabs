import { Heading, Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

interface StudioSectionProps {
  eyebrow: string
  heading: string
  body: string
  shot: ReactNode
  id?: string
  /** Zigzags the section: shot swaps from the right column to the left. */
  reverse?: boolean
  /** Alternating panel tint so consecutive sections read as distinct bands while scrolling. */
  tone?: 'default' | 'alt'
}

// One section per Studio view: eyebrow, display heading, body, then the shot — the shape
// this page repeats seven times. Content-height, not `min-h-screen` (seven full-viewport
// sections would make the page unusable to scan). Side-by-side on `lg`+ (text one column,
// shot the other), alternating which side the shot sits on so the page doesn't read as one
// long repeated block; stacked (text above shot) below `lg`, always in reading order
// regardless of `reverse`.
export function StudioSection({
  eyebrow,
  heading,
  body,
  shot,
  id,
  reverse = false,
  tone = 'default'
}: StudioSectionProps) {
  return (
    <section id={id} className={cn('w-full', tone === 'alt' && 'bg-muted/70')}>
      <div className='mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-8 px-6 py-16 lg:grid-cols-2 lg:gap-12'>
        <div className={cn('flex flex-col gap-3 text-left', reverse ? 'order-1 lg:order-2' : 'order-1 lg:order-1')}>
          <Text as='span' className='font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary'>
            {eyebrow}
          </Text>
          <Heading
            level={2}
            className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl'
          >
            {heading}
          </Heading>
          <Text className='max-w-[560px] text-balance font-sans text-lg leading-relaxed text-muted-foreground'>
            {body}
          </Text>
        </div>
        <div className={cn(reverse ? 'order-2 lg:order-1' : 'order-2 lg:order-2')}>{shot}</div>
      </div>
    </section>
  )
}
