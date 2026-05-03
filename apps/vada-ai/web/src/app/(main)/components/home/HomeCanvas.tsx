'use client'

import { AIACanvas, AIARing } from '@atta/ui/canvas'
import { VadaAgent as AIAgent, type AgentName } from '@/components/agents'
import React, { type ReactNode, useRef } from 'react'
import { useHomeCanvas } from './useHomeCanvas'
import { useSphereAbsorb } from './useSphereAbsorb'
import { useUserPreferences } from '@/lib/user-preferences-context'
import { renderAutonomousFabric } from './fabric-autonomous'
import { useRotatingEncryptedLabel } from './RotatingEncryptedLabel'
import { AGENT_WORD_LISTS } from './agent-words'

// Wrapper component to use the hook
function AgentSphereWithRotatingLabel({
  id,
  name,
  faceStyle,
  size,
  state,
  showMatrix,
  solidBg,
  visible,
  revealed,
  onSphereAbsorb
}: {
  id: string
  name: AgentName
  faceStyle: any
  size: any
  state: any
  showMatrix: boolean
  solidBg: boolean
  visible: boolean
  revealed: boolean
  onSphereAbsorb: (sphereId: string, callback: () => void) => void
}) {
  const [nextWordCallback, setNextWordCallback] = React.useState<(() => void) | null>(null)

  const encryptedLabel = useRotatingEncryptedLabel(AGENT_WORD_LISTS[name] ?? [], (callback) => {
    setNextWordCallback(() => callback)
  })

  // Register this sphere's callback with the absorption handler
  React.useEffect(() => {
    if (nextWordCallback) {
      onSphereAbsorb(id, nextWordCallback)
    }
  }, [id, nextWordCallback, onSphereAbsorb])

  return (
    <AIAgent
      id={id}
      name={name}
      faceStyle={faceStyle}
      size={size}
      state={state}
      showMatrix={showMatrix}
      matrixOpacity={0.3}
      label={revealed ? encryptedLabel : undefined}
      solidBg={solidBg}
      visible={visible}
    />
  )
}

interface HomeCanvasProps {
  render: (state: { animationStarted: boolean; animationComplete: boolean; ringVisible: boolean }) => ReactNode
}

interface HomeCanvasInnerProps extends HomeCanvasProps {
  registerSphere: (id: string, el: HTMLElement | null) => void
  onOriginCompleteRef: React.MutableRefObject<(() => void) | null>
  labelCallbacksRef: React.MutableRefObject<Map<string, () => void>>
}

const AGENTS: AgentName[] = ['Strategist', 'Critic', "Devil's Advocate", 'Synthesizer', 'Researcher', 'Operator']

const SPHERE_IDS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const

// Inner — must be inside AIACanvas to access canvas context
function HomeCanvasInner({ render, registerSphere, onOriginCompleteRef, labelCallbacksRef }: HomeCanvasInnerProps) {
  const {
    activeAgent,
    activeStep,
    revealedCount,
    animationStarted,
    animationComplete,
    ringSize,
    sphereSize,
    sphereRadius,
    ringDivRef,
    ringVisible
  } = useHomeCanvas(onOriginCompleteRef)
  const { faceStyle } = useUserPreferences()

  // Register particle absorption callback for each sphere's label
  const handleSphereAbsorb = (sphereId: string, callback: () => void) => {
    labelCallbacksRef.current.set(sphereId, callback)
  }

  const isTouched = (index: number) => activeStep > index
  const getSphereState = (id: string, index: number) => {
    if (activeAgent === id || isTouched(index)) return 'speaking' as const
    return 'idle' as const
  }

  return (
    <div className='relative flex h-dvh w-full items-center justify-center overflow-hidden'>
      {/* opacity driven directly by scroll via ringDivRef — no CSS transition */}
      <div ref={ringDivRef}>
        <AIARing
          size={ringSize}
          activeStep={activeStep}
          thinking={animationComplete && ringVisible}
          sphereRadius={sphereRadius}
          matrixOpacity={0.2}
          bgOpacity={ringVisible ? 0.5 : 0}
          orbit={SPHERE_IDS.map((id, i) => {
            const revealed = revealedCount > i
            const showMatrix = (activeAgent === id || isTouched(i)) && ringVisible
            return (
              <div
                key={id}
                ref={(el) => registerSphere(id, el)}
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'scale(1)' : 'scale(0.85)',
                  transition: 'opacity 500ms ease-in, transform 500ms ease-out'
                }}
              >
                <AgentSphereWithRotatingLabel
                  id={id}
                  name={AGENTS[i]!}
                  faceStyle={faceStyle}
                  size={sphereSize}
                  state={getSphereState(id, i)}
                  showMatrix={showMatrix}
                  solidBg={revealed && ringVisible}
                  visible={revealed && ringVisible}
                  revealed={revealed}
                  onSphereAbsorb={handleSphereAbsorb}
                />
              </div>
            )
          })}
        >
          {render({ animationStarted, animationComplete, ringVisible })}
        </AIARing>
      </div>
    </div>
  )
}

// Outer — sets up AIACanvas (the context provider), renders HomeCanvasInner inside it
export function HomeCanvas({ render }: HomeCanvasProps) {
  const { onSphereAbsorb, registerSphere } = useSphereAbsorb()
  const onOriginCompleteRef = useRef<(() => void) | null>(null)
  const labelCallbacksRef = useRef<Map<string, () => void>>(new Map())

  // Wrap onSphereAbsorb to also trigger label update
  const handleCanvasAbsorb = (sphereId: string) => {
    onSphereAbsorb(sphereId)
    const labelCallback = labelCallbacksRef.current.get(sphereId)
    if (labelCallback) labelCallback()
  }

  return (
    <>
      <section id='hero' className='relative h-dvh w-full' />
      {/* Canvas wrapper always visible — fabric persists as background when ring fades */}
      <div className='pointer-events-none fixed inset-0 z-0'>
        <AIACanvas
          bg={renderAutonomousFabric}
          wanderDuration={30}
          alwaysRenderSpheres
          autoTriggerGravity={false}
          onSphereAbsorb={handleCanvasAbsorb}
          onOriginComplete={() => onOriginCompleteRef.current?.()}
          className='h-full w-full'
        >
          <HomeCanvasInner
            render={render}
            registerSphere={registerSphere}
            onOriginCompleteRef={onOriginCompleteRef}
            labelCallbacksRef={labelCallbacksRef}
          />
        </AIACanvas>
      </div>
    </>
  )
}
