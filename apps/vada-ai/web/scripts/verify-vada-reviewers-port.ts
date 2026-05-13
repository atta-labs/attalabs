import { loadFlow } from '@atta/engine'
import { compileFlow } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Google key is stored as GOOGLE_GENERATIVE_AI_API_KEY in this repo's .env.local.
// The adapter receives it via providerKeys.google (same as the production path
// where the UI passes it in the request body).
const anthropicKey = process.env.ANTHROPIC_API_KEY
const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY
const openaiKey = process.env.OPENAI_API_KEY
const xaiKey = process.env.XAI_API_KEY

console.info('API keys:')
console.info(`  anthropic: ${anthropicKey ? 'set' : 'MISSING'}`)
console.info(`  google:    ${googleKey ? 'set' : 'MISSING'}`)
console.info(`  openai:    ${openaiKey ? 'set' : 'MISSING'}`)
console.info(`  xai:       ${xaiKey ? 'set' : 'MISSING'}`)

const reviewersWithKeys = [...(googleKey ? ['Gemini'] : []), ...(openaiKey ? ['GPT'] : []), ...(xaiKey ? ['Grok'] : [])]

if (reviewersWithKeys.length === 0) {
  console.error(
    'ERROR: no reviewer API keys set — need at least one of GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, XAI_API_KEY'
  )
  process.exit(1)
}

console.info(`Reviewers expected to succeed: ${reviewersWithKeys.join(', ')}`)
const reviewersWithoutKeys = ['Gemini', 'GPT', 'Grok'].filter((r) => !reviewersWithKeys.includes(r))
if (reviewersWithoutKeys.length > 0) {
  console.info(`Reviewers expected to fail (no key): ${reviewersWithoutKeys.join(', ')}`)
}

// Load the YAML spec
const specYaml = readFileSync(join(import.meta.dir, '../../yamls/vada-reviewers.yaml'), 'utf-8')
const spec = loadFlow(specYaml)

console.info(`\n✓ Spec loaded: ${spec.id}`)
if (!spec.reviewers) {
  console.error('ERROR: spec missing reviewers array')
  process.exit(1)
}

const reviewerNames = spec.reviewers.map((r) => r.agent)
const expectedReviewers = ['Gemini', 'GPT', 'Grok']
for (const expected of expectedReviewers) {
  if (!reviewerNames.includes(expected)) {
    console.error(`ERROR: expected reviewer ${expected}, got ${reviewerNames.join(', ')}`)
    process.exit(1)
  }
}
console.info(`✓ Reviewers declared: ${reviewerNames.join(', ')}`)

// Compile spec — model here is the plan default, not used for reviewer LLM calls
// (each reviewer agent has its own model declared in the YAML, overridden below)
const compilationModel = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'
const testQuestion = `You are reviewing the following draft recommendation for Vāda Reviewers v1:

Draft: "Ship API mode only in v1, defer CLI mode to v1.5."

Brief: Pressure-test this recommendation. Is API-mode-first the right choice? Would missing tool access (web search, filesystem) make the v1 benchmark uninterpretable? Consider the fidelity gap to chat products and whether it affects the outcome.

Original question: Should Vāda Reviewers v1 ship with API mode only or with both API and CLI modes?`

const plan = compileFlow(spec, testQuestion, compilationModel)
if (!plan?.graph?.nodes) {
  console.error('ERROR: compileFlow returned invalid plan')
  process.exit(1)
}
console.info('✓ Plan compiled')

const reviewerNodes = Object.keys(plan.graph.nodes).filter((id) => id.startsWith('reviewer-'))
if (reviewerNodes.length !== 3) {
  console.error(`ERROR: expected 3 reviewer nodes, got ${reviewerNodes.length}`)
  process.exit(1)
}
console.info('✓ Plan has 3 reviewer nodes')

// Build providerKeys from whatever is available
const providerKeys = {
  ...(anthropicKey ? { anthropic: anthropicKey } : {}),
  ...(googleKey ? { google: googleKey } : {}),
  ...(openaiKey ? { openai: openaiKey } : {}),
  ...(xaiKey ? { xai: xaiKey } : {})
}

// Override YAML defaults to cheapest tier — exercises the applyReviewerConfig path
const reviewerConfig = {
  Gemini: 'gemini-2.5-flash-lite',
  GPT: 'gpt-5-mini',
  Grok: 'grok-3'
}

console.info('\nRunning smoke test with API...')
console.info(`Model overrides (reviewerConfig): ${JSON.stringify(reviewerConfig)}`)

const adapter = new LangGraphAdapter({ providerKeys, reviewerConfig })

try {
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })

  console.info(`\nterminalState: ${conclusion.terminalState}`)
  console.info(`transcript entries: ${conclusion.transcript.length}`)
  if (conclusion.error) console.info(`conclusion error: ${conclusion.error}`)

  let totalTokensIn = 0
  let totalTokensOut = 0

  for (const entry of conclusion.transcript) {
    const succeeded = !entry.error && entry.content.length > 0 && entry.tokensOutput > 0
    console.info(
      `  ${entry.agentName}: ${succeeded ? 'SUCCESS' : 'FAILED'} — ${entry.tokensInput}in/${entry.tokensOutput}out`
    )
    if (entry.error) console.info(`    error: ${entry.error}`)
    if (succeeded) {
      console.info(`    preview: "${entry.content.slice(0, 200).replace(/\n/g, ' ')}..."`)
    }
    totalTokensIn += entry.tokensInput
    totalTokensOut += entry.tokensOutput
  }

  console.info(`\ntotal tokens: ${totalTokensIn}in / ${totalTokensOut}out`)

  // Every reviewer with an available API key must produce real output
  let failed = false
  for (const name of reviewersWithKeys) {
    const entry = conclusion.transcript.find((o) => o.agentName === name)
    if (!entry) {
      console.error(`ERROR: no transcript entry for ${name} (had API key)`)
      failed = true
      continue
    }
    if (entry.error || entry.content.length === 0 || entry.tokensOutput === 0) {
      console.error(
        `ERROR: ${name} had API key but produced no real output — ${entry.error ?? 'no content / zero tokens'}`
      )
      failed = true
    }
  }

  if (conclusion.terminalState === 'FAILED') {
    console.error('ERROR: terminal state is FAILED (all reviewers failed)')
    failed = true
  }

  if (failed) {
    process.exit(1)
  }

  console.info('\n✓ All checks passed')
  console.info(`  multi-vendor routing: verified for ${reviewersWithKeys.join(', ')}`)
  console.info('  applyReviewerConfig: exercised (models overridden to cheapest tier)')
} catch (e) {
  console.error(`ERROR: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
}
