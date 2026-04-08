import type { Conclusion } from '../../schemas'
import { createBlindCriticAgent } from '../agents'
import { BLIND_CRITIC_PROMPT } from '../prompts/conclusion-prompts'
import type { ModelConfig } from '../../lib/models'

export async function auditConclusion(
  question: string,
  conclusion: Conclusion,
  modelConfig?: ModelConfig
): Promise<string> {
  const agent = createBlindCriticAgent(BLIND_CRITIC_PROMPT, modelConfig)

  const message = `Principal's question: ${question}

Conclusion JSON:
${JSON.stringify(conclusion, null, 2)}`

  const result = await agent.generate(message, {
    modelSettings: { temperature: 0.2 }
  })

  return result.text.trim()
}
