import type { Conclusion } from '../../schemas'
import { ConclusionSchema } from '../../schemas'
import { createConclusionAgent } from '../agents'
import { CONCLUSION_MODE_PROMPT } from '../prompts/conclusion-prompts'
import { buildTranscriptContext } from '../rounds/round-two'
import type { ModelConfig } from '../../lib/models'

interface TranscriptEntry {
  agent: string
  content: string
  round: number
}

export async function generateConclusion(
  question: string,
  transcript: TranscriptEntry[],
  agents: string[],
  modelConfig?: ModelConfig
): Promise<{ conclusion: Conclusion | null; raw: string }> {
  const agent = createConclusionAgent(CONCLUSION_MODE_PROMPT, modelConfig)

  const context = buildTranscriptContext(transcript)
  const participantList = agents.join(', ')
  const message = `The original question is: ${question}

Participants in this deliberation: ${participantList}

Deliberation transcript:

${context}

---

Now produce the final conclusion JSON for this deliberation.`

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
    // Fallback: build a best-effort conclusion from raw text
    const fallback: Conclusion = {
      recommendation: raw.slice(0, 1000) || 'The deliberation did not produce a structured recommendation.',
      key_condition: 'Unable to extract structured key condition from deliberation output.',
      unresolved_points: agents.map((a) => ({
        point: 'Could not parse structured output',
        agents_involved: [a]
      })),
      review_by: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      participants: agents.map((a) => ({ agent: a, version: 'v1' }))
    }
    return { conclusion: fallback, raw }
  }
}
