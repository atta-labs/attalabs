import type { AgentRole } from '../../schemas/agent'

const STANDARD_HORIZON =
  'You are participating in a multi-round deliberation. Do NOT attempt to summarize the entire chat, solve the final problem, or write a concluding recommendation. Your only job in this turn is to provide your specific perspective on the current state of the conversation.'

const SYNTHESIZER_HORIZON =
  'You are participating in a multi-round deliberation. Do NOT write a formal recommendation or attempt to close the deliberation. Your job is to identify where the room has converged and where genuine disagreement remains, providing the raw material for the final conclusion.'

export function getTaskHorizon(role: AgentRole): string {
  return role === 'synthesizer' ? SYNTHESIZER_HORIZON : STANDARD_HORIZON
}
