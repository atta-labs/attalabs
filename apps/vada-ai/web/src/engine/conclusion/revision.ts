import type { Conclusion } from '../../schemas'
import { ConclusionSchema } from '../../schemas'
import { createConclusionAgent } from '../agents'
import { REVISION_MODE_PROMPT } from '../prompts/conclusion-prompts'
import type { ModelConfig } from '../../lib/models'

export async function reviseConclusion(
  originalConclusion: Conclusion,
  objection: string,
  modelConfig?: ModelConfig
): Promise<{ conclusion: Conclusion | null; raw: string }> {
  const systemPrompt = REVISION_MODE_PROMPT(objection)
  const agent = createConclusionAgent(systemPrompt, modelConfig)

  const message = `Original conclusion JSON:
${JSON.stringify(originalConclusion, null, 2)}

Revise this conclusion to address the auditor's objection. Output the revised JSON matching the exact schema.`

  let raw = ''
  try {
    const result = await agent.generate(message, {
      modelSettings: { temperature: 0.2 }
    })
    raw = result.text
  } catch {
    return { conclusion: null, raw }
  }

  // Extract JSON from response (may be wrapped in markdown code fences)
  const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw) ?? /(\{[\s\S]*\})/i.exec(raw)
  const jsonStr = jsonMatch?.[1]?.trim() ?? raw.trim()

  try {
    const parsed: unknown = JSON.parse(jsonStr)
    const validated = ConclusionSchema.parse(parsed)
    return { conclusion: validated, raw }
  } catch {
    return { conclusion: null, raw }
  }
}
