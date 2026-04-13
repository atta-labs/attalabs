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

  // Format unresolved_points properly — they are objects, not strings
  const unresolvedText =
    conclusion.unresolved_points.length > 0
      ? conclusion.unresolved_points
          .map((up) => {
            // Handle both object format and legacy string format
            if (typeof up === 'string') return up
            const point = up as { point: string; agents_involved: string[] }
            return `- ${point.point} (agents: ${point.agents_involved.join(', ')})`
          })
          .join('\n')
      : 'None'

  const message = `Principal's question: ${question}

Conclusion to Review:
[RECOMMENDATION FIELD]:
${conclusion.recommendation}

[KEY CONDITION FIELD]:
${conclusion.key_condition}

[UNRESOLVED POINTS FIELD]:
${unresolvedText}

[REVIEW BY]:
${conclusion.review_by}`

  const result = await agent.generate(message, {
    modelSettings: { temperature: 0.2 }
  })

  const outputText = result.text.trim()

  // Forgiving audit: substring match for PASS (weaker models add filler)
  if (outputText.toUpperCase().includes('PASS') && !outputText.toUpperCase().includes('FLAG')) {
    return 'PASS'
  }

  return outputText
}
