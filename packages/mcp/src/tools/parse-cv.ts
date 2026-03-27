import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { CV_PARSER_PROMPT } from '../prompts/cv-parser'
import type { CandidateProfile } from '../types'

export async function parseCv(cvText: string, apiKey: string): Promise<CandidateProfile> {
  const anthropic = createAnthropic({ apiKey })

  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: CV_PARSER_PROMPT,
    prompt: `Here is the CV text to extract:\n\n${cvText.slice(0, 8000)}`,
    maxOutputTokens: 4000,
    temperature: 0.1
  })

  // Extract JSON from response — strip markdown fences, find the JSON object
  let jsonStr = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')

  // Find the first { and last } to extract the JSON object
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
  }

  let parsed: any
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[Herald MCP] Failed to parse LLM response. Raw text:', text.slice(0, 500))
    throw new Error('LLM returned invalid JSON for CV parsing')
  }

  return {
    name: (parsed.name as string) ?? 'Unknown',
    title: (parsed.title as string) ?? 'Professional',
    location: (parsed.location as string | undefined) ?? undefined,
    availability: (parsed.availability as string | undefined) ?? undefined,
    summary: (parsed.summary as string) ?? '',
    stack: (parsed.stack as string[]) ?? [],
    projects: (parsed.projects as CandidateProfile['projects']) ?? [],
    experience: (parsed.experience as CandidateProfile['experience']) ?? []
  }
}
