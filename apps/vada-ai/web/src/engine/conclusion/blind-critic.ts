import type { Conclusion } from '../../schemas'
import { createBlindCriticAgent } from '../agents'
import { BLIND_CRITIC_PROMPT } from '../prompts/conclusion-prompts'

export async function auditConclusion(question: string, conclusion: Conclusion): Promise<string> {
  const agent = createBlindCriticAgent(BLIND_CRITIC_PROMPT)

  const message = `Principal's question: ${question}

Conclusion JSON:
${JSON.stringify(conclusion, null, 2)}`

  const result = await agent.generate(message, {
    modelSettings: { temperature: 0.2 }
  })

  return result.text.trim()
}
