import { Agent } from '@mastra/core/agent'
import type { AgentConfig } from '../schemas'

const MODEL = 'anthropic/claude-sonnet-4-5'

/**
 * Create a deliberation agent for in-room participation.
 * Temperature is set via modelSettings at call time; the config's temperature
 * is stored here and forwarded by the round execution functions.
 */
export function createDeliberationAgent(config: AgentConfig, systemPrompt: string): Agent {
  return new Agent({
    id: `deliberation-${config.role}`,
    name: config.name,
    instructions: systemPrompt,
    model: MODEL
  })
}

/**
 * Create the conclusion/revision agent. Uses a low temperature (0.2) for
 * deterministic structured output.
 */
export function createConclusionAgent(systemPrompt: string): Agent {
  return new Agent({
    id: 'conclusion-agent',
    name: 'Conclusion',
    instructions: systemPrompt,
    model: MODEL
  })
}

/**
 * Create the blind critic agent. Uses a low temperature (0.2) for
 * deterministic critique output.
 */
export function createBlindCriticAgent(systemPrompt: string): Agent {
  return new Agent({
    id: 'blind-critic-agent',
    name: 'Blind Critic',
    instructions: systemPrompt,
    model: MODEL
  })
}
