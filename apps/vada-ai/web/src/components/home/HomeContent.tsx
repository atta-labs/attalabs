'use client'

import { Heading, Separator, Text } from '@atta/ui'
import { AIACanvas, AIARing, AIASphere } from '@atta/ui/canvas'
import { SignUpAction } from './SignUpAction'
import { StartAction } from './StartAction'
import { useHomeContent } from './useHomeContent'

// Inner component — rendered INSIDE AIACanvas so useHomeContent can access the canvas context
function HomeScene({ isSignedIn }: { isSignedIn: boolean }) {
  const { activeAgent, activeStep } = useHomeContent()

  // Once a sphere is touched (receives a message), it stays in speaking mode — thinking together
  const isTouched = (index: number) => activeStep > index
  const getSphereState = (id: string, index: number) => {
    if (activeAgent === id || isTouched(index)) return 'speaking' as const
    return 'idle' as const
  }

  const animationComplete = activeStep >= 6

  return (
    <div className='relative z-10 flex min-h-dvh w-full items-center justify-center overflow-hidden'>
      <AIARing
        size={600}
        activeStep={activeStep}
        thinking={animationComplete}
        sphereRadius={50}
        orbit={[
          <AIASphere
            key='s1'
            id='s1'
            size='lg'
            state={getSphereState('s1', 0)}
            showMatrix={activeAgent === 's1' || isTouched(0)}
          />,
          <AIASphere
            key='s2'
            id='s2'
            size='lg'
            state={getSphereState('s2', 1)}
            showMatrix={activeAgent === 's2' || isTouched(1)}
          />,
          <AIASphere
            key='s3'
            id='s3'
            size='lg'
            state={getSphereState('s3', 2)}
            showMatrix={activeAgent === 's3' || isTouched(2)}
          />,
          <AIASphere
            key='s4'
            id='s4'
            size='lg'
            state={getSphereState('s4', 3)}
            showMatrix={activeAgent === 's4' || isTouched(3)}
          />,
          <AIASphere
            key='s5'
            id='s5'
            size='lg'
            state={getSphereState('s5', 4)}
            showMatrix={activeAgent === 's5' || isTouched(4)}
          />,
          <AIASphere
            key='s6'
            id='s6'
            size='lg'
            state={getSphereState('s6', 5)}
            showMatrix={activeAgent === 's6' || isTouched(5)}
          />
        ]}
      >
        <div className='relative z-10 flex flex-col items-center gap-10'>
          <Text as='small' className='uppercase tracking-widest text-muted-foreground'>
            vada.ai
          </Text>

          <div className='flex flex-col items-center gap-4'>
            <Heading level={1} className='text-7xl text-foreground'>
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
          <Text as='small' className='uppercase text-muted-foreground'>
            an atta.ai product
          </Text>
        </div>
      </AIARing>
    </div>
  )
}

// Outer shell — sets up AIACanvas (the context provider), then renders HomeScene inside it
export function HomeContent({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <AIACanvas particleCount={300} ambientRatio={0.35} className='fixed inset-0 w-full h-full bg-background z-0'>
      <HomeScene isSignedIn={isSignedIn} />
    </AIACanvas>
  )
}
