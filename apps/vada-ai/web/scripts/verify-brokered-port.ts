import { compileFlow, loadYamlFromCatalog } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const adapter = new LangGraphAdapter({ apiKey })
const questions = ['What are the key risks of migrating a production monolith to microservices in under 6 months?']
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const spec = loadYamlFromCatalog('brokered-trio')

for (const question of questions) {
  console.info(`\n${'='.repeat(80)}`)
  console.info(`Question: ${question}`)
  console.info('='.repeat(80))

  const plan = compileFlow(spec, question, model)

  console.info(
    `\nPlan: ${plan.specId} | ${Object.keys(plan.graph.nodes).length} nodes | ${plan.graph.edges.length} edges`
  )
  console.info(`Entry: ${plan.graph.entryNode}`)

  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 600_000 })

  console.info(`\nterminalState: ${conclusion.terminalState}`)
  console.info(`Transcript length: ${conclusion.transcript.length} (expected 3 — one per reviewer)`)
  console.info('\nExecution order:')
  for (const output of conclusion.transcript) {
    console.info(`  - ${output.agentName} → ${output.tokensInput}in/${output.tokensOutput}out, ${output.elapsedMs}ms`)
  }

  if (conclusion.terminalState !== 'CLEAN') {
    console.error(`\nFAIL: expected terminalState=CLEAN, got ${conclusion.terminalState}`)
    process.exit(1)
  }

  if (conclusion.transcript.length !== 3) {
    console.error(`\nFAIL: expected 3 transcript entries (one per reviewer), got ${conclusion.transcript.length}`)
    process.exit(1)
  }

  console.info(
    `\nCombined output (first 500 chars):\n${conclusion.content.slice(0, 500)}${conclusion.content.length > 500 ? '...' : ''}`
  )
  console.info(
    `\nTotal: ${conclusion.totalTokensInput}in/${conclusion.totalTokensOutput}out, ${conclusion.totalElapsedMs}ms`
  )

  if (conclusion.error) {
    console.error(`\nError: ${conclusion.error}`)
    process.exit(1)
  }
}

console.info('\n✓ verify-brokered-port: PASS')
