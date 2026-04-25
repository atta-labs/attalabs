import { compileSpec, loadSpec } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const adapter = new LangGraphAdapter({ apiKey })
const questions = ['Should a startup prioritize growth speed or sustainable unit economics in its first two years?']
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const spec = loadSpec(readFileSync(join(process.cwd(), '../yamls/crucible-v1.yaml'), 'utf-8'))

for (const question of questions) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Question: ${question}`)
  console.log('='.repeat(80))

  const plan = compileSpec(spec, question, model)
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })

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
