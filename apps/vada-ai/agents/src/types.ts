/** Display-capable agent archetype names. */
export type AgentName = 'Strategist' | 'Critic' | "Devil's Advocate" | 'Synthesizer' | 'Researcher' | 'Operator'

/** Display metadata for a Vāda agent — name, visual identity, role slug. Engine config lives in YAML. */
export interface VadaAgentDef {
  name: string
  description: string
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
