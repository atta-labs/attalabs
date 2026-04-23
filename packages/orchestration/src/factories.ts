import type { AgentName, AgentRole } from '@vada/agents'
import type { DeliberationAgent, DeliberationContext, DeliberationTool } from './types'

export function defineDeliberationAgent(config: {
  role: AgentRole
  name: AgentName
  instructions: (ctx: DeliberationContext) => string
  tools?: readonly DeliberationTool[]
}): DeliberationAgent {
  return {
    role: config.role,
    name: config.name,
    instructions: config.instructions,
    ...(config.tools !== undefined && { tools: config.tools })
  }
}

// Thin factory — validates at the type boundary, returns the same values.
// The single creation point makes it easy to add validation later (e.g. round >= 1).
export function createDeliberationContext(values: DeliberationContext): DeliberationContext {
  return { ...values }
}
