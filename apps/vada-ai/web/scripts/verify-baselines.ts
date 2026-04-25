import { compileSpec, loadSpec } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const question = 'Should I use PostgreSQL or MongoDB for a small web app?'
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'
const adapter = new LangGraphAdapter({ apiKey })

const yamls = [
  { file: 'a0-baseline-v1.yaml', label: 'A0' },
  { file: 'a1-baseline-v1.yaml', label: 'A1' }
]

for (const { file, label } of yamls) {
  console.log(`\n${'='.repeat(72)}`)
  console.log(`Spec: ${label} — ${file}`)
  console.log(`Question: ${question}`)
  console.log('='.repeat(72))

  const spec = loadSpec(readFileSync(join(process.cwd(), `../yamls/${file}`), 'utf-8'))
  const plan = compileSpec(spec, question, model)
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
