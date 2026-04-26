import type { VadaAgentDef } from '../types'

export const critic = {
  name: 'Critic',
  role: 'critic',
  displayName: 'The Critic',
  tagline: "Finds what's wrong",
  color: 'var(--agent-critic)',
  faceIndex: 1,
  description: 'Attacks assumptions, timelines, and logistical leaps to strengthen the final answer'
} satisfies VadaAgentDef
