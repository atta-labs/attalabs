'use client'

import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { useEffect, useState } from 'react'
import { HomeCanvas } from './HomeCanvas'
import { LetterReveal } from './LetterReveal'

// Title + subtitle are Vinaya Portal's landing lockup in its hero state (`HeroLockup.tsx`
// scaled by `lockup-flip.js`'s FLIP.HERO_SCALE = 3.6, descriptor counter-scaled by
// DESC_HERO = 0.5): the word is font-mono normal at text-sm × 3.6 = 3.15rem, the descriptor
// font-mono medium uppercase tracking-[0.18em] at text-sm × 1.8 = 1.575rem. Same letter
// cascade, same 40ms / 25ms steps.
// Vinaya's hero scroll cue (`VinayaHeroEmblem.tsx`): a mono "Scroll" over three tapering rules at
// the bottom, faded in once the title has built and gone as soon as the reader scrolls.
function ScrollCue({ shown }: { shown: boolean }) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute bottom-[clamp(1.5rem,5vh,3rem)] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5 transition-opacity duration-700 ease-out motion-reduce:transition-none',
        shown ? 'opacity-100 delay-[1600ms]' : 'opacity-0'
      )}
    >
      <span className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>Scroll</span>
      <span className='flex flex-col items-center gap-[0.1667rem]'>
        <span className='block h-px w-[1.8889rem] bg-foreground' />
        <span className='block h-px w-[1.2222rem] bg-foreground/55' />
        <span className='block h-px w-[0.6667rem] bg-foreground/30' />
      </span>
    </div>
  )
}

export function HomeHero() {
  // flips on after the first paint, so the cue fades in rather than appearing with the page
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <HomeCanvas
      renderTop={({ scrolled }) => (
        // the wordmark leaves at once on scroll (and only fades back in), so a fast scroll can never
        // bring the scroll-driven headline in underneath a wordmark that is still fading out
        <div className={cn('transition-opacity', scrolled ? 'opacity-0 duration-0' : 'opacity-100 duration-500')}>
          <Text
            as='span'
            weight='normal'
            className='absolute top-[15.5%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[3.15rem] max-sm:text-[2.25rem] leading-none tracking-normal text-foreground'
          >
            <LetterReveal text='Vāda' delayStep={40} />
          </Text>
          <Text
            as='span'
            weight='medium'
            className='absolute top-[24%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[1.575rem] leading-none uppercase tracking-[0.18em] text-muted-foreground max-sm:text-xs'
          >
            <LetterReveal text='Multi-model deliberation' delayStep={25} />
          </Text>
          <ScrollCue shown={mounted && !scrolled} />
        </div>
      )}
    />
  )
}
