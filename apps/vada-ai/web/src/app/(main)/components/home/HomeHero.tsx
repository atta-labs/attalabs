'use client'

import { Text } from '@atta/ui/shared'
import { HomeCanvas } from './HomeCanvas'
import { LetterReveal } from './LetterReveal'

// Title + subtitle are Vinaya Portal's landing lockup in its hero state (`HeroLockup.tsx`
// scaled by `lockup-flip.js`'s FLIP.HERO_SCALE = 3.6, descriptor counter-scaled by
// DESC_HERO = 0.5): the word is font-mono normal at text-sm × 3.6 = 3.15rem, the descriptor
// font-mono medium uppercase tracking-[0.18em] at text-sm × 1.8 = 1.575rem. Same letter
// cascade, same 40ms / 25ms steps.
export function HomeHero() {
  return (
    <HomeCanvas
      renderTop={({ scrolled }) => (
        <div className={`transition-opacity duration-500 ${scrolled ? 'opacity-0' : ''}`}>
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
        </div>
      )}
    />
  )
}
