import { z } from 'zod'
import { AGENTS, AGENT_LIST } from '@atta/agents'

// Derive role slugs from @atta/agents — single source of truth.
const agentRoleValues = AGENT_LIST.map((a) => a.role) as [string, ...string[]]
export const AgentRole = z.enum(agentRoleValues)
export type AgentRole = z.infer<typeof AgentRole>

export interface AgentConfig {
  role: AgentRole
  name: string
  temperature: number
}

// temperature is engine config — not part of agent identity.
export const DEFAULT_ROOM: AgentConfig[] = [
  { role: AGENTS.Strategist.role, name: AGENTS.Strategist.name, temperature: 0.7 },
  { role: AGENTS.Critic.role, name: AGENTS.Critic.name, temperature: 0.7 },
  { role: AGENTS["Devil's Advocate"].role, name: AGENTS["Devil's Advocate"].name, temperature: 0.7 },
  { role: AGENTS.Synthesizer.role, name: AGENTS.Synthesizer.name, temperature: 0.5 }
]

export const OPTIONAL_AGENTS: AgentConfig[] = [
  { role: AGENTS.Researcher.role, name: AGENTS.Researcher.name, temperature: 0.7 },
  { role: AGENTS.Operator.role, name: AGENTS.Operator.name, temperature: 0.7 }
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
      { role: AGENTS.Strategist.role, name: AGENTS.Strategist.name, temperature: 0.7 },
      { role: AGENTS.Critic.role, name: AGENTS.Critic.name, temperature: 0.7 }
    ]
  }
]
