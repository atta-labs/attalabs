import type { CanvasPhase, RingRegistration } from '../aia-context'

export interface RingEnvoyState {
  ringCompletion: number
  ringEnvoyProgress: number
  ringEnvoyActive: boolean
}

export function createRingEnvoyState(): RingEnvoyState {
  return { ringCompletion: 0, ringEnvoyProgress: 0, ringEnvoyActive: false }
}

/**
 * Advances the ring envoy one frame, incrementing ringCompletion when each
 * envoy pass completes. Mutates state in place.
 */
export function tickRingEnvoy(state: RingEnvoyState, rings: RingRegistration[], currentPhase: CanvasPhase): void {
  for (const ring of rings) {
    if (currentPhase !== 'settled') continue
    if (!state.ringEnvoyActive && state.ringCompletion < ring.sphereCount) {
      state.ringEnvoyActive = true
      state.ringEnvoyProgress = 0
    }
    if (state.ringEnvoyActive) {
      state.ringEnvoyProgress += 0.015
      if (state.ringEnvoyProgress >= 1) {
        state.ringEnvoyProgress = 0
        state.ringCompletion++
        if (state.ringCompletion >= ring.sphereCount) state.ringEnvoyActive = false
      }
    }
  }
}
