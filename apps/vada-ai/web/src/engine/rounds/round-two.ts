import { insertTranscriptEntry } from '../../db/queries'
import type { AgentConfig } from '../../schemas'
import { createDeliberationAgent } from '../agents'
import { composeSystemPrompt } from '../prompts/compose'
import type { SSEEmitter } from '../stream'
import type { ModelConfig } from '../../lib/models'

const TARGET_PATTERN = /\[TARGET:\s*([^\]]+)\]/i

interface TranscriptEntry {
  round: number
  agent: string
  content: string
}

export function buildTranscriptContext(entries: TranscriptEntry[]): string {
  return entries.map((e) => `[Round ${e.round} — ${e.agent}]\n${e.content}`).join('\n\n---\n\n')
}

export function parseTarget(content: string): string | undefined {
  const match = TARGET_PATTERN.exec(content)
  return match?.[1]?.trim()
}

export async function executeSequentialRound(
  sessionId: string,
  question: string,
  round: number,
  agentConfigs: AgentConfig[],
  priorEntries: TranscriptEntry[],
  emitter: SSEEmitter,
  modelConfig?: ModelConfig,
  perAgentModels?: Record<string, ModelConfig>
): Promise<void> {
  const context = buildTranscriptContext(priorEntries)
  const contextMessage =
    context.length > 0
      ? `The following is the deliberation transcript so far:\n\n${context}\n\n---\n\nThe original question is: ${question}`
      : question

  for (let i = 0; i < agentConfigs.length; i++) {
    const config = agentConfigs[i]!
    const systemPrompt = composeSystemPrompt(config.role, round, false, question)
    const agent = createDeliberationAgent(config, systemPrompt, perAgentModels?.[config.role] ?? modelConfig)

    emitter.emit({ type: 'agent_start', agent: config.name, round })

    let fullContent = ''

    try {
      const output = await agent.stream(contextMessage, {
        modelSettings: { temperature: config.temperature }
      })

      for await (const chunk of output.fullStream) {
        if (chunk.type === 'text-delta') {
          const token = chunk.payload.text
          fullContent += token
          emitter.emit({ type: 'agent_token', agent: config.name, token })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      emitter.emit({ type: 'agent_error', agent: config.name, error: message })
      continue
    }

    const target = parseTarget(fullContent)

    await insertTranscriptEntry({
      sessionId,
      round,
      agent: config.name,
      content: fullContent,
      target,
      orderInRound: i
    })

    emitter.emit({ type: 'agent_complete', agent: config.name, round, content: fullContent })
  }

  emitter.emit({ type: 'round_complete', round })
}
