import { z } from 'zod'
import { AGENTS, AGENT_LIST } from '@vada/agents'
import { TEAM_LIST, type TeamId } from '@/lib/teams-metadata'

// Derive role slugs from @vada/agents — single source of truth.
const agentRoleValues = AGENT_LIST.map((a) => a.role) as [string, ...string[]]
export const AgentRole = z.enum(agentRoleValues)
export type AgentRole = z.infer<typeof AgentRole>

// AgentConfig = agent identity + temperature (engine-only concern).
export interface AgentConfig {
  role: AgentRole
  name: string
  temperature: number
}

// Temperature is LLM engine config — not part of agent identity in @vada/agents.
const AGENT_TEMPERATURE: Record<string, number> = {
  strategist: 0.7,
  critic: 0.7,
  devils_advocate: 0.7,
  synthesizer: 0.5,
  researcher: 0.7,
  operator: 0.7
}

// Preset wraps a TeamDef with engine-level AgentConfig (adds temperature).
export type PresetId = TeamId

export interface Preset {
  id: PresetId
  name: string
  subtitle: string
  agents: AgentConfig[]
}

export const PRESETS: Preset[] = TEAM_LIST.map((team) => ({
  id: team.id,
  name: team.name,
  subtitle: team.subtitle,
  agents: team.agents.map((agentName) => ({
    role: AGENTS[agentName].role,
    name: AGENTS[agentName].name,
    temperature: AGENT_TEMPERATURE[AGENTS[agentName].role] ?? 0.7
  }))
}))

// Convenience shorthands used by the API route and engine.
export const DEFAULT_ROOM = PRESETS.find((p) => p.id === 'crucible')!.agents
export const ALL_AGENTS = PRESETS.find((p) => p.id === 'war_room')!.agents
export const OPTIONAL_AGENTS = ALL_AGENTS.filter((a) => !DEFAULT_ROOM.some((d) => d.role === a.role))

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
