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

export function getAgentConfigByName(name: string): AgentConfig {
  const config = ALL_AGENTS.find((a) => a.name === name)
  if (!config) return { role: 'strategist', name, temperature: 0.7 }
  return config
}

// --- Room Presets ---

export type PresetId = 'crucible' | 'war_room' | 'sparring'

export interface Preset {
  id: PresetId
  name: string
  subtitle: string
  agents: AgentConfig[]
}

export const PRESETS: Preset[] = [
  {
    id: 'crucible',
    name: 'The Crucible',
    subtitle: 'A rigorous teardown that finds fatal flaws and rebuilds your premise.',
    agents: DEFAULT_ROOM
  },
  {
    id: 'war_room',
    name: 'The War Room',
    subtitle: 'Heavyweight analysis forcing abstract strategy to survive physical reality.',
    agents: ALL_AGENTS
  },
  {
    id: 'sparring',
    name: 'The Sparring Match',
    subtitle: 'Fast, adversarial friction. No formal conclusion.',
    agents: [
      { role: 'strategist', name: 'Strategist', temperature: 0.7 },
      { role: 'critic', name: 'Critic', temperature: 0.7 }
    ]
  }
]
