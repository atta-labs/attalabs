import type { AgentRole } from '../../schemas/agent'
import { getPosture } from './postures'
import { getRoundModifier } from './round-modifiers'
import { getTaskHorizon } from './task-horizons'
import { getWhisperModifier } from './whisper-modifier'

export function composeSystemPrompt(role: AgentRole, round: number, hasWhispers: boolean): string {
  const parts = [getPosture(role), getTaskHorizon(role), getRoundModifier(round)]
  if (hasWhispers) {
    parts.push(getWhisperModifier())
  }
  return parts.join('\n\n')
}
