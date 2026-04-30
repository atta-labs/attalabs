import { loadSpec } from '@atta/engine'
import { compileSpec } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set — skipping smoke test')
  console.error('Proceeding with schema/compilation validation only')
}

const adapter = apiKey ? new LangGraphAdapter({ apiKey }) : null
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

// Load the YAML spec
const specYaml = readFileSync(join(import.meta.dir, '../../yamls/vada-reviewers.yaml'), 'utf-8')
const spec = loadSpec(specYaml)

console.info(`✓ Spec loaded: ${spec.id}`)
if (!spec.reviewers) {
  console.error('ERROR: spec missing reviewers array')
  process.exit(1)
}

// Verify reviewers
const reviewerNames = spec.reviewers.map((r) => r.agent)
const expectedReviewers = ['Gemini', 'GPT', 'Grok']
for (const expected of expectedReviewers) {
  if (!reviewerNames.includes(expected)) {
    console.error(`ERROR: expected reviewer ${expected}, got ${reviewerNames.join(', ')}`)
    process.exit(1)
  }
}
console.info(`✓ Reviewers present: ${reviewerNames.join(', ')}`)

// Compile a test invocation
const testQuestion = `You are reviewing the following draft recommendation for Vāda Reviewers v1:

Draft: "Ship API mode only in v1, defer CLI mode to v1.5."

Brief: Pressure-test this recommendation. Is API-mode-first the right choice? Would missing tool access (web search, filesystem) make the v1 benchmark uninterpretable? Consider the fidelity gap to chat products and whether it affects the outcome.

Original question: Should Vāda Reviewers v1 ship with API mode only or with both API and CLI modes?`

const plan = compileSpec(spec, testQuestion, model)
if (!plan?.graph?.nodes) {
  console.error('ERROR: compileSpec returned invalid plan')
  process.exit(1)
}
console.info('✓ Plan compiled')

// Verify plan structure
const reviewerNodes = Object.keys(plan.graph.nodes).filter((id) => id.startsWith('reviewer-'))
if (reviewerNodes.length !== 3) {
  console.error(`ERROR: expected 3 reviewer nodes, got ${reviewerNodes.length}`)
  process.exit(1)
}
console.info('✓ Plan has 3 reviewer nodes')

// Execute if API key is available
if (adapter) {
  console.info('Running smoke test with API...')
  try {
    const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })

    console.info(`✓ terminalState: ${conclusion.terminalState}`)
    console.info(`✓ Transcript length: ${conclusion.transcript.length} entries`)
    for (const output of conclusion.transcript) {
      console.info(`  - ${output.agentName} → ${output.tokensInput}in/${output.tokensOutput}out`)
    }

    // Verify expected structure
    if (conclusion.transcript.length !== 3) {
      console.error(`ERROR: expected 3 reviewer responses, got ${conclusion.transcript.length}`)
      process.exit(1)
    }

    const agentNames = new Set(conclusion.transcript.map((o) => o.agentName))
    for (const expected of expectedReviewers) {
      if (!agentNames.has(expected)) {
        console.error(`ERROR: expected agent ${expected} in transcript, got ${Array.from(agentNames).join(', ')}`)
        process.exit(1)
      }
    }

    console.info('✓ All checks passed')
  } catch (e) {
    console.error(`ERROR during execution: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }
} else {
  console.info('✓ Schema and compilation validation passed (smoke test skipped — no API key)')
}
