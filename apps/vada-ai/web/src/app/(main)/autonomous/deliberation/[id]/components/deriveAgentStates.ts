// Derive per-agent state for one round strip. Pure function — no React, no
// canvas. `agentRoles` is the turn order from the session; `entries` is the
// completed transcript; `streamingMessage` is the currently-streaming
// message, if any. One AgentState per role in `agentRoles` order (not the
// order messages arrived — turn order is the source of truth for the row).

import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

export type AgentStatus = 'idle' | 'speaking' | 'done'

export interface AgentState {
  role: string
  status: AgentStatus
  message: string
}

export function deriveAgentStates(
  agentRoles: string[],
  entries: DeliberationMessage[],
  streamingMessage: StreamingMessage | null,
  round: number
): AgentState[] {
  return agentRoles.map((role) => {
    const streaming = streamingMessage?.agentRole === role && streamingMessage.round === round
    if (streaming) {
      return { role, status: 'speaking', message: streamingMessage.content }
    }
    const entry = entries.find((e) => e.agentRole === role && e.round === round)
    if (entry) {
      return { role, status: 'done', message: entry.content }
    }
    return { role, status: 'idle', message: '' }
  })
}

export function findCurrentSpeaker(states: AgentState[]): string | null {
  return states.find((s) => s.status === 'speaking')?.role ?? null
}

// Last agent in turn order that has completed. This is the default display
// when the round is NOT currently streaming — effectively the Synthesizer
// in Crucible/War Room, the Critic in Sparring. The live-streaming speaker
// takes precedence over this; `findCurrentSpeaker` already handles that case.
export function findLastDoneSpeaker(states: AgentState[]): string | null {
  for (let i = states.length - 1; i >= 0; i--) {
    const s = states[i]
    if (s && s.status === 'done') return s.role
  }
  return null
}
