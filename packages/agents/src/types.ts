import type { Agent } from '@atta/agents'

/** Display-capable agent archetype names. */
export type AgentName = 'Strategist' | 'Critic' | "Devil's Advocate" | 'Synthesizer' | 'Researcher' | 'Operator'

/**
 * A Vāda agent definition that carries both engine config and display metadata.
 * Only the 4 primary deliberation agents implement this interface.
 */
export interface VadaAgentDef extends Agent {
  /** Slug used in API responses and schema keys. */
  role: string
  /** Full title with article ("The Strategist"). */
  displayName: string
  /** One-line tagline shown under sphere labels. */
  tagline: string
  /** Agent color — CSS variable, always visible on dark backgrounds. */
  color: string
  /** Index into the face illustration array (0 = Strategist … 3 = Synthesizer). */
  faceIndex: number
}
