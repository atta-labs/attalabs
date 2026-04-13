import type { AgentRole } from '../../schemas/agent'

// ADDED: Explicit brevity and formatting enforcement for standard agents.
const STANDARD_HORIZON =
  'You are participating in a multi-round deliberation. Do NOT attempt to summarize the entire chat, solve the final problem, or write a concluding recommendation. Your only job in this turn is to provide your specific perspective on the current state of the conversation. IMPORTANT: You must keep your responses concise and strictly respect any formatting or length constraints requested by the Principal.'

const SYNTHESIZER_HORIZON =
  'You are participating in a multi-round deliberation. Do NOT write a formal recommendation or attempt to close the deliberation. Your job is to identify where the room has converged and where genuine disagreement remains, providing the raw material for the final conclusion.'

export function getTaskHorizon(role: AgentRole): string {
  return role === 'synthesizer' ? SYNTHESIZER_HORIZON : STANDARD_HORIZON
}
