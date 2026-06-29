import { compileFlow, loadYamlFromCatalog } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const openrouterKey = process.env.OPENROUTER_API_KEY

const question = 'Should I use PostgreSQL or MongoDB for a small web app?'
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'
const adapter = new LangGraphAdapter({ apiKey })

// A2 uses OpenRouter Fusion — providerKeys path (falls back to OPENROUTER_API_KEY env var)
const a2Adapter = new LangGraphAdapter({ providerKeys: { openrouter: openrouterKey } })

const yamls = [
  { id: 'a0-baseline', label: 'A0', useModel: true },
  { id: 'a1-baseline', label: 'A1', useModel: true },
  // A2: openrouter/fusion — model is fixed in the YAML; skip model override
  { id: 'vada-fusion', label: 'A2 (Fusion)', useModel: false }
]

for (const { id, label, useModel } of yamls) {
  const isA2 = id === 'vada-fusion'

  if (isA2 && !openrouterKey) {
    console.log(`\n${'='.repeat(72)}`)
    console.log(`Spec: ${label} — ${id}.yaml`)
    console.log('SKIPPED: OPENROUTER_API_KEY not set')
    console.log('='.repeat(72))
    continue
  }

  console.log(`\n${'='.repeat(72)}`)
  console.log(`Spec: ${label} — ${id}.yaml`)
  console.log(`Question: ${question}`)
  console.log('='.repeat(72))

  const spec = loadYamlFromCatalog(id)
  const plan = compileFlow(spec, question, useModel ? model : undefined)
  const currentAdapter = isA2 ? a2Adapter : adapter
  const conclusion = await currentAdapter.execute({ plan, customVars: {} })

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
