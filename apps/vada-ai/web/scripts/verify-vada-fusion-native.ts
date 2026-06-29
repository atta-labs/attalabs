/**
 * verify-vada-fusion-native.ts — compile + optional end-to-end verification
 *
 * Phase 1 (compile-only, no API key required):
 *   bun run scripts/verify-vada-fusion-native.ts
 *
 * Phase 2 (end-to-end with adapter, API key required):
 *   ANTHROPIC_API_KEY=sk-... bun run scripts/verify-vada-fusion-native.ts --run
 */

import { compileFlow, loadYamlFromCatalog } from '@atta/engine'

const QUESTION =
  'We are a Series B SaaS startup with $8M ARR and 18 months of runway. The board is pushing us to raise a Series C now at current valuations. Should we raise immediately or wait until we have stronger metrics?'

// ── Phase 1: load + compile ───────────────────────────────────────────────────

console.info('Loading vada-fusion-native from catalog...')
const flow = loadYamlFromCatalog('vada-fusion-native')
console.info(`  id:           ${flow.id}`)
console.info(`  display_name: ${flow.displayName}`)
console.info(`  experimental: ${flow.experimental}`)
console.info(`  agents:       ${flow.agents.map((a) => a.name).join(', ')}`)
console.info(`  rounds:       ${flow.rounds.map((r) => r.id).join(' → ')}`)

console.info('\nCompiling flow...')
const plan = compileFlow(flow, QUESTION, 'claude-haiku-4-5-20251001')
const nodeIds = Object.keys(plan.graph.nodes)
console.info('  shape detected (node ids):')
for (const id of nodeIds) {
  const node = plan.graph.nodes[id]!
  console.info(`    ${id}  [${node.kind}]  agent=${node.agentName}`)
}
console.info(`  edges: ${plan.graph.edges.length} flow/ordering`)
console.info(`  conditionalEdges: ${plan.graph.conditionalEdges.length}`)
console.info(`  maxRevisions: ${plan.maxRevisions}`)
console.info(`  responseMode: ${plan.responseMode}`)
console.info(`  responseNode: ${plan.responseNode ?? '(none)'}`)

// Expect: panel (4 round-0-* nodes) + terminal-0 + terminal-1 + audit-*-0 +
// audit-*-1 + __END__
const panelNodes = nodeIds.filter((id) => id.startsWith('round-0-'))
const terminalNodes = nodeIds.filter((id) => id.startsWith('terminal-'))
const auditNodes = nodeIds.filter((id) => id.startsWith('audit-'))

console.info('\nShape verification:')
console.info(`  panel nodes:    ${panelNodes.length} (expected 4)`)
console.info(`  terminal nodes: ${terminalNodes.length} (expected 2 with max_revisions=1)`)
console.info(`  audit nodes:    ${auditNodes.length} (expected 4: BlindCritic+FactChecker × 2 slots)`)
console.info(`  __END__:        ${nodeIds.includes('__END__') ? 'present' : 'MISSING'}`)

const ok =
  panelNodes.length === 4 && terminalNodes.length === 2 && auditNodes.length === 4 && nodeIds.includes('__END__')

if (!ok) {
  console.error('\nERROR: Shape verification failed — node counts do not match expected.')
  process.exit(1)
}

console.info('\nCompile-only verification PASSED ✓')
console.info('(To run end-to-end, set ANTHROPIC_API_KEY and pass --run)')

// ── Phase 2: end-to-end adapter run (optional, requires API key) ──────────────

if (!process.argv.includes('--run')) {
  process.exit(0)
}

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set. Required for --run.')
  process.exit(1)
}

const { LangGraphAdapter, webSearchHandler } = await import('@atta/adapter-langgraph')
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const testPlan = compileFlow(flow, QUESTION, model)

console.info(`\nRunning end-to-end with model: ${model}`)
console.info('(This will take several minutes — panel has 4 agents + synth + audit)')

const adapter = new LangGraphAdapter({
  apiKey,
  customTools: { web_search: webSearchHandler }
})

const conclusion = await adapter.execute({ plan: testPlan, customVars: {}, timeoutMs: 1_200_000 })

console.info(`\nTerminal state: ${conclusion.terminalState}`)
console.info(`Transcript length: ${conclusion.transcript.length}`)
for (const output of conclusion.transcript) {
  const rTag = output.roundIndex !== undefined ? ` r${output.roundIndex}` : ''
  console.info(`  - ${output.agentName}${rTag} → ${output.tokensInput}in/${output.tokensOutput}out`)
}

if (conclusion.structured) {
  console.info('\nBattlefield map (structured output):')
  console.info(JSON.stringify(conclusion.structured, null, 2))
}

if (!['CLEAN', 'REVISED', 'MAX_REVISIONS'].includes(conclusion.terminalState)) {
  console.error(`\nERROR: Unexpected terminal state: ${conclusion.terminalState}`)
  process.exit(1)
}

console.info('\nEnd-to-end verification PASSED ✓')
