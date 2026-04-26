import { z } from 'zod'
import { AGENT_LIST } from '@vada/agent-metadata'

const agentRoleValues = AGENT_LIST.map((a) => a.role) as [string, ...string[]]
export const AgentRole = z.enum(agentRoleValues)
export type AgentRole = z.infer<typeof AgentRole>

export interface AgentConfig {
  role: AgentRole
  name: string
  temperature: number
}

const AGENT_TEMPERATURE: Record<string, number> = {
  strategist: 0.7,
  critic: 0.7,
  devils_advocate: 0.7,
  synthesizer: 0.5,
  researcher: 0.7,
  operator: 0.7
}

export function getAgentConfig(role: AgentRole): AgentConfig {
  const agent = AGENT_LIST.find((a) => a.role === role)
  if (!agent) throw new Error(`Unknown agent role: ${role}`)
  return { role, name: agent.name, temperature: AGENT_TEMPERATURE[role] ?? 0.7 }
}

export function getAgentConfigByName(name: string): AgentConfig {
  const agent = AGENT_LIST.find((a) => a.name === name)
  if (!agent) return { role: 'strategist' as AgentRole, name, temperature: 0.7 }
  return { role: agent.role as AgentRole, name: agent.name, temperature: AGENT_TEMPERATURE[agent.role] ?? 0.7 }
}
