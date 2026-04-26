import type { VadaAgentDef } from '../types'

/** Base domain expert — system prompt contains {{DOMAIN}} placeholder. */
export const domainExpert = {
  name: 'Domain Expert',
  role: 'domain_expert',
  displayName: 'The Domain Expert',
  tagline: 'Grounds in field practice',
  color: 'var(--foreground)',
  faceIndex: 0,
  description: 'Context-specific expertise grounded in a named domain'
} satisfies VadaAgentDef
