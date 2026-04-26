'use client'

import { Heading, Text } from '@atta/ui/shared'
import { useContext } from 'react'
import { ChooserAnimationContext } from './ChooserScene'

export function ChooserHero() {
  const { animationComplete } = useContext(ChooserAnimationContext)

  return (
    <div
      className={`flex flex-col items-center justify-between h-full transition-all duration-700 ease-out ${animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <div className='flex flex-col items-center'>
        <Heading level={1} className='text-6xl text-foreground font-serif'>
          Vāda
        </Heading>
        <Text as='small' className='font-mono uppercase tracking-widest text-muted-foreground'>
          Deliberation Engine
        </Text>
      </div>
      <div className='flex flex-col'>
        <Text
          as='p'
          className={`text-2xl text-foreground text-center max-w-md transition-[clip-path] duration-[900ms] ease-out ${animationComplete ? '[clip-path:inset(0_0_0_0)]' : '[clip-path:inset(0_100%_0_0)]'}`}
        >
          The room outperforms
        </Text>
        <Text
          as='p'
          className={`text-2xl text-foreground text-center max-w-md transition-[clip-path] duration-[900ms] ease-out ${animationComplete ? '[clip-path:inset(0_0_0_0)]' : '[clip-path:inset(0_100%_0_0)]'}`}
        >
          the individual
        </Text>
      </div>
    </div>
  )
}
