import { compile } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { a0, a1 } from '@vada/teams'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const question = 'Should I use PostgreSQL or MongoDB for a small web app?'
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'
const adapter = new LangGraphAdapter({ apiKey })

for (const team of [a0, a1]) {
  console.log(`\n${'='.repeat(72)}`)
  console.log(`Team: ${team.name} — ${team.description}`)
  console.log(`Question: ${question}`)
  console.log('='.repeat(72))

  const plan = compile({ team, question, model })
  const conclusion = await adapter.execute({ plan, customVars: {} })

  console.log(`terminalState: ${conclusion.terminalState}`)
  console.log(`tokensIn/Out: ${conclusion.totalTokensInput}/${conclusion.totalTokensOutput}`)
  console.log(`elapsedMs: ${conclusion.totalElapsedMs}`)
  if (conclusion.error) console.log(`error: ${conclusion.error}`)

  if (conclusion.structured) {
    console.log('\nStructured output:')
    console.log(JSON.stringify(conclusion.structured, null, 2).slice(0, 1000))
  } else {
    console.log(`\nContent:\n${conclusion.content.slice(0, 500)}`)
  }
}
