import type { VadaAgentDef } from '../types'

export const operator = {
  name: 'Operator',
  role: 'operator',
  displayName: 'The Operator',
  tagline: 'Stress-tests execution',
  color: 'var(--agent-operator)',
  faceIndex: 5,
  description: 'Translates theory into actionable, executable outputs'
} satisfies VadaAgentDef
