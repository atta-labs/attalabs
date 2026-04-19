#!/usr/bin/env bun
// Smoke test for executeConclusionTurn.
// Calls the function once with a synthesize-phase prompt via the Anthropic provider
// and verifies the result has the expected shape.
// Run: bun scripts/test-execute-conclusion.ts

// Run with: bun --preload ./scripts/preload-server-only.ts scripts/test-execute-conclusion.ts
// The preload replaces server-only with an empty module so server-side code can
// be imported directly in a Bun script.

import { config } from 'dotenv'
config({ path: '.env.local' })

import { executeConclusionTurn } from '@atta/orchestration'

const SYSTEM_PROMPT = `You are a deliberation synthesizer. Given the following debate transcript,
produce a JSON conclusion with this exact schema:
{
  "recommendation": "<string>",
  "key_condition": "<string>",
  "unresolved_points": [{ "point": "<string>", "agents_involved": ["<string>"] }],
  "review_by": "<YYYY-MM-DD>",
  "participants": [{ "agent": "<string>", "version": "v1" }]
}
Return only the JSON object, no prose.`

const USER_PROMPT = `Debate transcript:
Agent A (Strategist): We should use TypeScript for all new projects. Type safety eliminates a class of runtime errors.
Agent B (Critic): TypeScript adds build complexity and slows onboarding for small teams. The tradeoffs only pay off at scale.
Agent A (Strategist): The IDE support alone justifies the cost — autocomplete and refactoring are dramatically better.
Agent B (Critic): That's a tooling preference, not a correctness argument. JavaScript with JSDoc is sufficient for most teams.

Synthesize a conclusion.`

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('❌  ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  console.log('Running executeConclusionTurn smoke test...')
  console.log('Phase: synthesize | Model: anthropic/claude-haiku-4-5-20251001\n')

  const result = await executeConclusionTurn({
    phase: 'synthesize',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT,
    model: { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
    apiKey
  })

  // Shape checks
  const checks: Array<[string, boolean]> = [
    ['phase === synthesize', result.phase === 'synthesize'],
    ['content is string', typeof result.content === 'string'],
    ['content.length > 0', result.content.length > 0],
    ['inputTokens is number', typeof result.inputTokens === 'number'],
    ['outputTokens is number', typeof result.outputTokens === 'number'],
    ['durationMs is number', typeof result.durationMs === 'number'],
    ['durationMs > 0', result.durationMs > 0]
  ]

  let allPass = true
  for (const [label, pass] of checks) {
    console.log(`${pass ? '✅' : '❌'} ${label}`)
    if (!pass) allPass = false
  }

  console.log(`\nTokens: ${result.inputTokens} in / ${result.outputTokens} out | Wall: ${result.durationMs}ms`)
  console.log('\nRaw output (first 400 chars):')
  console.log(result.content.slice(0, 400))

  if (!allPass) {
    console.error('\n❌  Shape checks failed')
    process.exit(1)
  }
  console.log('\n✅  executeConclusionTurn smoke test passed')
}

main()
