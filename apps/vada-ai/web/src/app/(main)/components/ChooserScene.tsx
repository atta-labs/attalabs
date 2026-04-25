'use client'

import { createContext, useEffect, type MutableRefObject, type ReactNode } from 'react'
import { VadaAgent } from '@/components/agents'
import { useUserPreferences } from '@/lib/user-preferences-context'
import { useChooserScene } from './useChooserScene'

export const ChooserAnimationContext = createContext<{ animationComplete: boolean }>({
  animationComplete: false
})

const SPHERE_SIZE = 500

interface ChooserSceneProps {
  onSphereAbsorbRef: MutableRefObject<((sphereId: string) => void) | null>
  children?: ReactNode
}

export function ChooserScene({ onSphereAbsorbRef, children }: ChooserSceneProps) {
  const { currentAgent, isFlashing, animationComplete, handleAbsorb } = useChooserScene()
  const { faceStyle } = useUserPreferences()

  useEffect(() => {
    onSphereAbsorbRef.current = handleAbsorb
    return () => {
      onSphereAbsorbRef.current = null
    }
  }, [handleAbsorb, onSphereAbsorbRef])

  return (
    <ChooserAnimationContext.Provider value={{ animationComplete }}>
      <div className='relative flex h-dvh w-full items-center justify-center'>
        {/* Central sphere — always registered for Tron particle targeting */}
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none'>
          {/* Dark ring — visible while waiting (not flashing, animation not done) */}
          <div
            className={`absolute rounded-full border border-border/25 transition-opacity duration-500 ${!isFlashing && !animationComplete ? 'opacity-100' : 'opacity-0'}`}
            style={{ width: SPHERE_SIZE, height: SPHERE_SIZE }}
          />
          {/* Agent sphere — canvas-renders only when flashing; still registered for particles when not */}
          <VadaAgent
            id='chooser-main'
            name={currentAgent}
            faceStyle={faceStyle}
            size={SPHERE_SIZE}
            state='speaking'
            showMatrix={isFlashing}
            solidBg={isFlashing}
            visible={isFlashing}
          />
        </div>

        {children}
      </div>
    </ChooserAnimationContext.Provider>
  )
}
