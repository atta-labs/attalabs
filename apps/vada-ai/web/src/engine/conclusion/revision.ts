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

  // THE FIX: Same Universal Anchor principle as synthesizer.ts.
  // The revision instruction to "start with Yes/No/Not yet" must be
  // at the very end of the user message where Llama will actually read it.
  const message = `Original conclusion JSON:
${JSON.stringify(originalConclusion, null, 2)}

The auditor's objection: ${objection}

---

CRITICAL INSTRUCTION — READ THIS BEFORE GENERATING:

1. Output ONLY the revised JSON object. No markdown, no explanation, no preamble.

2. If the objection says the recommendation "does not directly answer the question":
   - Rewrite the recommendation to START with a clear, committed position: "No," or "Yes," or "Not yet —"
   - Follow with the reasoning from the original conclusion.
   - Do NOT hedge. Do NOT say "it depends" or "further evaluation is needed."

3. If the objection is about formatting (e.g., wrong number of lines), fix the recommendation text using \\n for line breaks.

4. Keep all other fields (key_condition, unresolved_points, review_by, participants) unchanged unless the objection specifically targets them.

GENERATE THE REVISED JSON NOW:`

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
