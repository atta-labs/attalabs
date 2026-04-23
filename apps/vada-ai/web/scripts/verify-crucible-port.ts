import { compile } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { crucible } from '../src/examples/teams/crucible.js'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const adapter = new LangGraphAdapter({ apiKey })

const questions = [
  'Should a startup prioritize growth speed or sustainable unit economics in its first two years?',
  'Is it ethical for AI systems to persuade users toward healthier behaviors?'
]

const model = process.env.VADA_TEST_MODEL ?? 'claude-sonnet-4-6'

for (const question of questions) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Question: ${question}`)
  console.log('='.repeat(80))

  const plan = compile({ team: crucible, question, model })
  const conclusion = await adapter.execute({ plan, customVars: {} })

  console.log(`\nterminalState: ${conclusion.terminalState}`)
  console.log(`Transcript length: ${conclusion.transcript.length}`)
  console.log('\nExecution order:')
  for (const output of conclusion.transcript) {
    const roundTag = output.roundIndex !== undefined ? ` r${output.roundIndex}` : ''
    console.log(
      `  - ${output.agentName}${roundTag} → ${output.tokensInput}in/${output.tokensOutput}out, ${output.elapsedMs}ms`
    )
  }
  console.log(`\nFinal content:\n${conclusion.content.slice(0, 500)}${conclusion.content.length > 500 ? '...' : ''}`)
  console.log(
    `\nTotal: ${conclusion.totalTokensInput}in/${conclusion.totalTokensOutput}out, ${conclusion.totalElapsedMs}ms`
  )

  if (conclusion.error) {
    console.log(`\nError: ${conclusion.error}`)
  }
}
