import type { Agent } from '@mastra/core/agent'
import { insertTranscriptEntry } from '../../db/queries'
import type { AgentConfig } from '../../schemas'
import { createDeliberationAgent } from '../agents'
import { composeSystemPrompt } from '../prompts/compose'
import type { SSEEmitter } from '../stream'
import type { ModelConfig } from '../../lib/models'

const ROUND = 1
const TIMEOUT_MS = 30_000

interface AgentWithConfig {
  agent: Agent
  config: AgentConfig
}

function buildAgents(configs: AgentConfig[], modelConfig?: ModelConfig): AgentWithConfig[] {
  return configs.map((config) => ({
    agent: createDeliberationAgent(config, composeSystemPrompt(config.role, ROUND, false), modelConfig),
    config
  }))
}

async function runAgentWithTimeout(
  agent: Agent,
  config: AgentConfig,
  question: string,
  orderInRound: number,
  sessionId: string,
  emitter: SSEEmitter
): Promise<void> {
  emitter.emit({ type: 'agent_start', agent: config.name, round: ROUND })

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Agent ${config.name} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  )

  const generatePromise = agent
    .generate(question, {
      modelSettings: { temperature: config.temperature }
    })
    .then((result) => result.text)

  let content: string
  try {
    content = await Promise.race([generatePromise, timeoutPromise])
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emitter.emit({ type: 'agent_error', agent: config.name, error: message })
    return
  }

  await insertTranscriptEntry({
    sessionId,
    round: ROUND,
    agent: config.name,
    content,
    orderInRound
  })

  emitter.emit({ type: 'agent_complete', agent: config.name, round: ROUND, content })
}

export async function executeRoundOne(
  sessionId: string,
  question: string,
  agentConfigs: AgentConfig[],
  emitter: SSEEmitter,
  modelConfig?: ModelConfig
): Promise<void> {
  const agentsWithConfig = buildAgents(agentConfigs, modelConfig)

  const tasks = agentsWithConfig.map(({ agent, config }, index) =>
    runAgentWithTimeout(agent, config, question, index, sessionId, emitter)
  )

  await Promise.allSettled(tasks)

  emitter.emit({ type: 'round_complete', round: ROUND })
}
