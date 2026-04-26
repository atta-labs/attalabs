export type AgentName = 'Strategist' | 'Critic' | "Devil's Advocate" | 'Synthesizer' | 'Researcher' | 'Operator'
export type AgentRole = 'strategist' | 'critic' | 'devils_advocate' | 'synthesizer' | 'researcher' | 'operator'

export interface VadaAgentVisuals {
  displayName: string
  tagline: string
  color: string
  faceIndex: number
}

export interface AgentEntry {
  name: AgentName
  role: AgentRole
  visuals: VadaAgentVisuals
}
