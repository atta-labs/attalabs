import type { CanvasPhase } from '../aia-context'

const FORM_DURATION = 60
const SETTLE_RAMP = 360

export interface PhaseState {
  currentPhase: CanvasPhase
  formingStart: number
  settleProgress: number
  gravityStart: number
}

export function createPhaseState(): PhaseState {
  return { currentPhase: 'wander', formingStart: 0, settleProgress: 0, gravityStart: -1 }
}

/**
 * Advances the phase state machine by one frame.
 * Returns flags indicating which one-shot signals were consumed so the caller
 * can clear the corresponding refs.
 */
export function tickPhaseMachine(
  state: PhaseState,
  time: number,
  sphereCount: number,
  forceSettle: boolean,
  wanderDuration: number,
  autoTriggerGravity: boolean,
  startGravitySignal: boolean,
  onPhaseChange: (phase: CanvasPhase) => void
): { forceSettleConsumed: boolean; gravitySignalConsumed: boolean } {
  let forceSettleConsumed = false
  let gravitySignalConsumed = false

  if (state.currentPhase === 'wander') {
    const shouldForce = forceSettle && sphereCount > 0
    const shouldAutoForm = time > wanderDuration && sphereCount > 0
    if (shouldForce || shouldAutoForm) {
      if (shouldForce) {
        state.currentPhase = 'settled'
        state.gravityStart = time
        state.settleProgress = 1
        onPhaseChange('settled')
      } else {
        state.currentPhase = 'forming'
        state.formingStart = time
        onPhaseChange('forming')
      }
      forceSettleConsumed = true
    }
  }

  if (state.currentPhase === 'forming') {
    const elapsed = time - state.formingStart
    if (elapsed >= FORM_DURATION) {
      state.currentPhase = 'settled'
      if (autoTriggerGravity) state.gravityStart = time
      onPhaseChange('settled')
    }
  }

  if (startGravitySignal) {
    state.gravityStart = time
    gravitySignalConsumed = true
  }

  // Cubic ease-in-out gravity ramp — starts slow, accelerates, then settles
  if (state.gravityStart >= 0) {
    const progress = Math.min(1, (time - state.gravityStart) / SETTLE_RAMP)
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
    state.settleProgress = eased
  }

  return { forceSettleConsumed, gravitySignalConsumed }
}
