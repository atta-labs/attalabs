'use client'

import { Heading, Text } from '@atta/ui/shared'
import { HomeCanvas } from './HomeCanvas'

export function HomeHero() {
  return (
    <HomeCanvas
      render={({ animationComplete, ringVisible }) => (
        <div
          className={`relative z-10 flex w-full flex-col items-center gap-5 transition-opacity duration-150 ${ringVisible ? '' : 'pointer-events-none opacity-0'}`}
        >
          {/* Wordmark + subtitle — Phase 5 (cognitive flow): the summary,
              fades in once all 4 nodes and 3 segments have animated in. */}
          <div
            className={`flex flex-col items-center gap-2 transition-opacity duration-400 ease-out ${ringVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <Text className='text-xl font-mono uppercase tracking-widest text-muted-foreground'>The</Text>
            <Heading level={1} className='text-6xl font-serif text-foreground'>
              The Atta
            </Heading>
            <Text className='text-xl font-mono uppercase tracking-widest text-muted-foreground'>Ecosystem</Text>
          </div>
          <div className='flex flex-col items-center gap-2'>
            <Text
              as='p'
              className={`text-balance text-xl text-center text-foreground transition-opacity duration-800 ease-out ${animationComplete ? 'opacity-100' : 'opacity-0'}`}
            >
              Where deep thinking happens
            </Text>
            <Text
              as='p'
              className={`text-balance text-xl text-center text-foreground transition-opacity duration-900 ease-out ${animationComplete ? 'opacity-100' : 'opacity-0'}`}
            >
              with any AI.
            </Text>
          </div>
        </div>
      )}
    />
  )
}
