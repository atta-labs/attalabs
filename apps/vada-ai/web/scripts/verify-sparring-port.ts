import { compileFlow, loadYamlFromCatalog } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const adapter = new LangGraphAdapter({ apiKey })
const questions = ['Should a startup prioritize growth speed or sustainable unit economics in its first two years?']
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const spec = loadYamlFromCatalog('sparring')

for (const question of questions) {
  console.info(`\n${'='.repeat(80)}`)
  console.info(`Question: ${question}`)
  console.info('='.repeat(80))

  const plan = compileFlow(spec, question, model)
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })

  console.info(`\nterminalState: ${conclusion.terminalState}`)
  console.info(`Transcript length: ${conclusion.transcript.length}`)
  console.info('\nExecution order:')
  for (const output of conclusion.transcript) {
    const roundTag = output.roundIndex !== undefined ? ` r${output.roundIndex}` : ''
    console.info(
      `  - ${output.agentName}${roundTag} → ${output.tokensInput}in/${output.tokensOutput}out, ${output.elapsedMs}ms`
    )
  }
  console.info(`\nFinal content:\n${conclusion.content.slice(0, 500)}${conclusion.content.length > 500 ? '...' : ''}`)
  console.info(
    `\nTotal: ${conclusion.totalTokensInput}in/${conclusion.totalTokensOutput}out, ${conclusion.totalElapsedMs}ms`
  )

  if (conclusion.error) {
    console.error(`\nError: ${conclusion.error}`)
  }
}
