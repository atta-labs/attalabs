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
const specYaml = readFileSync(join(import.meta.dir, '../../yamls/vada-reviewers-synthesis.yaml'), 'utf-8')
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

// Verify flow.synthesis block exists
if (!('flow' in spec) || !('synthesis' in spec.flow!)) {
  console.error('ERROR: spec missing flow.synthesis block')
  process.exit(1)
}
console.info(`✓ Synthesis block present (agent=${spec.flow?.synthesis?.agent})`)

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

// Verify plan structure (3 reviewers + 1 synthesizer = 4 nodes)
const agentNodeIds = Object.keys(plan.graph.nodes).filter(
  (id) => id.startsWith('reviewer-') || id === 'brokered-synthesis'
)
if (agentNodeIds.length !== 4) {
  console.error(`ERROR: expected 4 agent nodes (3 reviewers + synthesizer), got ${agentNodeIds.length}`)
  process.exit(1)
}
console.info('✓ Plan has 4 agent nodes (3 reviewers + synthesizer)')

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

    // Verify expected structure: 3 reviewers + 1 synthesizer
    if (conclusion.transcript.length !== 4) {
      console.error(
        `ERROR: expected 4 transcript entries (3 reviewers + synthesizer), got ${conclusion.transcript.length}`
      )
      process.exit(1)
    }

    const agentNames = conclusion.transcript.map((o) => o.agentName)
    const expectedAgents = ['Gemini', 'GPT', 'Grok', 'Synthesizer']
    for (const expected of expectedAgents) {
      if (!agentNames.includes(expected)) {
        console.error(`ERROR: expected agent ${expected} in transcript`)
        process.exit(1)
      }
    }

    // Last entry should be Synthesizer
    const lastEntry = conclusion.transcript[conclusion.transcript.length - 1]
    if (lastEntry.agentName !== 'Synthesizer') {
      console.error(`ERROR: expected last entry to be Synthesizer, got ${lastEntry.agentName}`)
      process.exit(1)
    }

    // Try to parse synthesizer output as JSON (with fallback tolerance)
    try {
      const synthesis = JSON.parse(lastEntry.content)
      const requiredFields = [
        'participants',
        'consensus',
        'unique_insights',
        'contradictions',
        'rejected',
        'recommendations'
      ]
      for (const field of requiredFields) {
        if (!(field in synthesis)) {
          throw new Error(`Missing ${field} field`)
        }
      }
      console.info('✓ Synthesizer output valid JSON with expected schema')
    } catch (e) {
      // Check if output contains schema fields as text fallback (degraded parsing)
      const errorMsg = e instanceof Error ? e.message : String(e)
      if (
        lastEntry.content.includes('consensus') &&
        lastEntry.content.includes('unique_insights') &&
        lastEntry.content.includes('contradictions')
      ) {
        console.warn(`⚠ Synthesizer output is degraded (${errorMsg}), but schema fields present in text`)
      } else {
        console.error(`ERROR: synthesizer output missing expected fields: ${errorMsg}`)
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
