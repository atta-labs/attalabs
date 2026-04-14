'use client'

import { useAuth } from '@clerk/nextjs'
import { Heading, Separator, Text } from '@atta/ui'
import { HomeCanvas } from './components/HomeCanvas'
import { SignUpAction } from './components/SignUpAction'
import { StartAction } from './components/StartAction'

export default function Home() {
  const { isSignedIn } = useAuth()

  return (
    <main className='overflow-hidden'>
      <HomeCanvas
        render={({ animationStarted, animationComplete }) => (
          <div className='relative z-10 flex flex-col items-center gap-10'>
            <Text
              as='small'
              className='uppercase tracking-widest transition-opacity duration-700'
              style={{ opacity: animationStarted ? 1 : 0 }}
            >
              vada.ai
            </Text>

            <div className='flex flex-col items-center gap-4'>
              <Heading level={1} className='text-6xl text-foreground'>
                Vāda
              </Heading>
              <Text as='p' className='text-lg text-foreground'>
                vāda · from the Pāli, deliberation
              </Text>
            </div>

            <Separator className='w-10' />

            <div
              className='flex flex-col items-center gap-6 transition-opacity duration-[2000ms]'
              style={{ opacity: animationComplete ? 1 : 0 }}
            >
              <Text as='p' className='text-2xl text-foreground text-center max-w-md'>
                The room outperforms the individual.
              </Text>

              <div className='flex flex-col items-center gap-6'>{isSignedIn ? <StartAction /> : <SignUpAction />}</div>
            </div>

            <Text
              as='small'
              className='uppercase transition-opacity duration-700'
              style={{ opacity: animationStarted ? 1 : 0 }}
            >
              an atta.ai product
            </Text>
          </div>
        )}
      />
    </main>
  )
}
