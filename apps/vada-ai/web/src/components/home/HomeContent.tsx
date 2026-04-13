'use client'

import { AgentThinkingText, Heading, Separator, Text } from '@atta/ui'
import { AIACanvas, AIARing, AIASphere } from '@atta/ui/canvas'
import { SignUpAction } from './SignUpAction'
import { StartAction } from './StartAction'
import { useHomeContent } from './useHomeContent'
import { AGENT_THEME } from '@/app/deliberation/[id]/components/agent-theme'

const SPHERE_COLORS = [
  AGENT_THEME.Strategist!.color,
  AGENT_THEME.Critic!.color,
  AGENT_THEME["Devil's Advocate"]!.color,
  AGENT_THEME.Synthesizer!.color,
  AGENT_THEME.Researcher!.color,
  AGENT_THEME.Operator!.color
]

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

  const SPHERE_PHRASES = ['Framing...', 'Risks?', 'Counter...', 'Patterns...', 'Data...', 'Synthesis...']

  const spheres = ['s1', 's2', 's3', 's4', 's5', 's6'] as const

  return (
    <div className='relative z-10 flex min-h-dvh w-full items-center justify-center overflow-hidden'>
      <AIARing
        size={600}
        activeStep={activeStep}
        thinking={animationComplete}
        sphereRadius={50}
        matrixOpacity={0.2}
        orbit={spheres.map((id, i) => {
          const showMatrix = activeAgent === id || isTouched(i)
          return (
            <AIASphere
              key={id}
              id={id}
              size='lg'
              color={SPHERE_COLORS[i]}
              state={getSphereState(id, i)}
              showMatrix={showMatrix}
              matrixOpacity={0.2}
            >
              {showMatrix && (
                <AgentThinkingText
                  text={SPHERE_PHRASES[i] ?? '...'}
                  className='text-[8px] text-center leading-tight opacity-80'
                />
              )}
            </AIASphere>
          )
        })}
      >
        <div className='relative z-10 flex flex-col items-center gap-10'>
          <Text as='small' className='uppercase tracking-widest '>
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
          <Text as='small' className='uppercase '>
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
    <AIACanvas
      particleCount={1500}
      ambientRatio={0.5}
      wanderDuration={30}
      alwaysRenderSpheres
      matchContentHeight
      className='fixed inset-0 h-full w-full z-0'
    >
      <HomeScene isSignedIn={isSignedIn} />
    </AIACanvas>
  )
}
