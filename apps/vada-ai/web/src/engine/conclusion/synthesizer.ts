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

  // THE FIX: The decisiveness instruction MUST be at the very end of the message.
  // Llama (and weaker models) have strong recency bias — they forget system prompt
  // instructions after reading a long transcript. The last thing the model reads
  // before generating is the last paragraph of the user message. That's where
  // the "answer the question directly" instruction must live.
  const message = `The original question is: "${question}"

Participants in this deliberation: ${participantList}

Deliberation transcript:

${context}

---

CRITICAL INSTRUCTION — READ THIS BEFORE GENERATING:

1. You MUST output valid JSON matching the conclusion schema. No markdown, no explanation, just the JSON object.

2. The "recommendation" field MUST directly answer the Principal's question: "${question}"
   - If the question is "Should I...?", start with "No," or "Yes," or "Not yet —" followed by the reasoning.
   - Do NOT hedge. Do NOT say "it depends" or "further evaluation is needed."
   - The deliberation already happened. You are delivering the verdict, not asking more questions.

3. The "key_condition" field must state the single most important assumption.

4. The "unresolved_points" field must list specific disagreements from the transcript with the agents involved. Do not invent them.

5. If the Principal's question had formatting constraints (e.g., "5 lines"), apply them to the recommendation text using \\n for line breaks.

GENERATE THE JSON NOW:`

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
