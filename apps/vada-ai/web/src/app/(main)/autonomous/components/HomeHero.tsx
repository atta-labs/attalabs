'use client'

import { Heading, Text } from '@atta/ui'
import { Suspense, useEffect, useState } from 'react'
import { AuthModalTrigger } from './AuthModalTrigger'
import { DeliberateAction } from './DeliberateAction'
import { HomeCanvas } from './HomeCanvas'
import { LearnMoreAction } from './LearnMoreAction'

export function HomeHero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <HomeCanvas
      render={({ animationComplete }) => (
        <div className='relative z-10 flex flex-col items-center gap-10'>
          <Suspense fallback={null}>
            <AuthModalTrigger />
          </Suspense>

          <div
            className={`flex flex-col items-center gap-4 transition-all duration-700 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
          >
            <Heading level={1} className='text-6xl text-foreground font-serif'>
              Vāda
            </Heading>
            <Text as='small' className='font-mono uppercase tracking-widest text-muted-foreground'>
              Deliberation Engine
            </Text>
          </div>

          <div className='flex flex-col items-center gap-6'>
            <Text
              as='p'
              className={`text-2xl text-foreground text-center max-w-md transition-[clip-path] duration-[900ms] ease-out ${animationComplete ? '[clip-path:inset(0_0_0_0)]' : '[clip-path:inset(0_100%_0_0)]'}`}
            >
              The room outperforms the individual.
            </Text>

            <div
              className={`pointer-events-auto flex flex-row items-center gap-4 transition-opacity duration-500 ease-out ${animationComplete ? 'opacity-100 delay-300' : 'opacity-0 delay-0'}`}
            >
              <DeliberateAction />
              <LearnMoreAction />
            </div>
          </div>

          <Text
            as='small'
            className={`uppercase tracking-widest transition-opacity duration-700 ease-out ${animationComplete ? 'opacity-100 delay-1000' : 'opacity-0 delay-0'}`}
          >
            AN ATTĀ PRODUCT
          </Text>
        </div>
      )}
    />
  )
}
