import { z } from 'zod'

export const AgentRole = z.enum(['strategist', 'critic', 'devils_advocate', 'synthesizer', 'researcher', 'operator'])
export type AgentRole = z.infer<typeof AgentRole>

export interface AgentConfig {
  role: AgentRole
  name: string
  temperature: number
}

export const DEFAULT_ROOM: AgentConfig[] = [
  { role: 'strategist', name: 'Strategist', temperature: 0.7 },
  { role: 'critic', name: 'Critic', temperature: 0.7 },
  { role: 'devils_advocate', name: "Devil's Advocate", temperature: 0.7 },
  { role: 'synthesizer', name: 'Synthesizer', temperature: 0.5 }
]

export const OPTIONAL_AGENTS: AgentConfig[] = [
  { role: 'researcher', name: 'Researcher', temperature: 0.7 },
  { role: 'operator', name: 'Operator', temperature: 0.7 }
]

export const ALL_AGENTS: AgentConfig[] = [...DEFAULT_ROOM, ...OPTIONAL_AGENTS]

export function getAgentConfig(role: AgentRole): AgentConfig {
  const config = ALL_AGENTS.find((a) => a.role === role)
  if (!config) throw new Error(`Unknown agent role: ${role}`)
  return config
}
