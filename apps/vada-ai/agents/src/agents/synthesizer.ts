import type { VadaAgentDef } from '../types'

export const synthesizer = {
  name: 'Synthesizer',
  role: 'synthesizer',
  displayName: 'The Synthesizer',
  tagline: 'Draws threads together',
  color: 'var(--agent-synthesizer)',
  faceIndex: 3,
  description: 'Maps borders of agreement and irreducible disagreement across deliberation rounds'
} satisfies VadaAgentDef
