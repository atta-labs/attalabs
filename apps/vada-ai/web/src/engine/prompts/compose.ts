import type { AgentRole } from '../../schemas/agent'
import { getPosture } from './postures'
import { getRoundModifier } from './round-modifiers'
import { getTaskHorizon } from './task-horizons'
import { getWhisperModifier } from './whisper-modifier'

// ADDED: `question` parameter to enforce the Universal Anchor
export function composeSystemPrompt(role: AgentRole, round: number, hasWhispers: boolean, question: string): string {
  const parts = [getPosture(role), getTaskHorizon(role), getRoundModifier(round)]

  if (hasWhispers) {
    parts.push(getWhisperModifier())
  }

  // THE UNIVERSAL ANCHOR: Appended at the very end to prevent context drift and enforce formatting.
  const anchor = `[CRITICAL REMINDER - THE PRINCIPAL'S EXACT QUESTION: "${question}"\nYour current argument MUST directly serve this specific question and STRICTLY obey ANY constraints within it (whether formatting, length, tone, persona, or logic). Do not drift into the abstract.]`
  parts.push(anchor)

  return parts.join('\n\n')
}
