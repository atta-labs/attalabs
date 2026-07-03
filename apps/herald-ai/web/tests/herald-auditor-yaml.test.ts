import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { compileFlow, loadFlow } from '@atta/engine'
import { MATCH_REPORT_SCHEMA } from '../src/lib/prompts'

// The auditor YAML lives in the @atta/forensic-hiring-auditor package (moved
// there by D-045/D-051); route.ts reaches it transitively via that package's
// `run()`, which resolves its own internal path and does not export it. This
// constant re-derives the same on-disk location directly so a future move of
// either side fails here instead of surfacing only at runtime as a silent
// partial-report fallback.
const YAML_PATH = join(
  import.meta.dirname,
  '../../../../packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml'
)

function load() {
  return loadFlow(readFileSync(YAML_PATH, 'utf-8'))
}

describe('herald-auditor.yaml', () => {
  it('loads as a v2.0 flow', () => {
    const flow = load()
    expect(flow.schemaVersion).toBe('2.0')
    expect(flow.id).toBe('herald-auditor')
    expect(flow.defaults.model).toBe('claude-sonnet-4-6')
    expect(flow.rounds).toHaveLength(1)
    expect(flow.rounds[0]?.agents).toHaveLength(1)
    expect(flow.agents).toHaveLength(1)
    expect(flow.agents[0]?.name).toBe('SkepticalAuditor')
    expect(flow.agents[0]?.classifier?.mode).toBe('skip')
  })

  it('pins defaults.max_tokens at the headroom the audit report needs', () => {
    // Production logs from June 2026 showed the model emitting 3.5k–4k output
    // tokens for a single audit report; the prior 2000-token cap silently
    // truncated the JSON and the parser fell into its partial-report fallback.
    // 8000 leaves room for the schema-bound output plus the report's own
    // reasoning. This is the regression guard — if someone lowers it back to
    // ≤ 4000 the audit will start truncating in prod and this test will catch
    // it in CI.
    const flow = load()
    expect(flow.defaults.maxTokens).toBe(8000)
  })

  it('compiles to a solo Plan with the auditor as the single node', () => {
    const flow = load()
    const plan = compileFlow(flow, 'test question', undefined, { schema: MATCH_REPORT_SCHEMA })

    expect(plan.schemaVersion).toBe('1.0')
    expect(plan.graph.entryNode).toBe('solo')
    expect(plan.responseNode).toBe('solo')
    expect(plan.responseMode).toBe('synthesize')
    expect(plan.maxRevisions).toBe(0)
    expect(Object.keys(plan.graph.nodes)).toEqual(['solo'])
    expect(plan.graph.nodes.solo?.agentName).toBe('SkepticalAuditor')
    expect(plan.graph.edges).toHaveLength(0)
    expect(plan.graph.conditionalEdges).toHaveLength(0)
  })

  it('propagates defaults.max_tokens onto the compiled SkepticalAuditor agent', () => {
    // The adapter reads agent.maxTokens to set the Anthropic request param.
    // If compileFlow drops it (the bug PR #129 fixes), the adapter falls back
    // to its built-in 4096 default and the audit truncates again.
    const flow = load()
    const plan = compileFlow(flow, 'test question', undefined, { schema: MATCH_REPORT_SCHEMA })
    expect(plan.agents.SkepticalAuditor?.maxTokens).toBe(8000)
  })

  it('substitutes {{schema}} into the auditor system prompt at compileFlow time', () => {
    const flow = load()
    const plan = compileFlow(flow, 'test question', undefined, { schema: MATCH_REPORT_SCHEMA })

    const systemPrompt = plan.agents.SkepticalAuditor?.systemPrompt ?? ''
    expect(systemPrompt).not.toContain('{{schema}}')
    expect(systemPrompt).toContain(MATCH_REPORT_SCHEMA)
    // Sanity check on the locked auditor doctrine
    expect(systemPrompt).toContain('forensic technical auditor')
    expect(systemPrompt).toContain('NO FIT')
  })

  it('passes the user message through the {{question}} template', () => {
    const flow = load()
    expect(flow.rounds[0]?.messageTemplate).toBe('{{question}}')
  })

  it('is reachable at the location @atta/forensic-hiring-auditor resolves internally', () => {
    // If this fails, the package's internal YAML_PATH math is wrong (or the
    // YAML moved). Without this guard, the bug surfaces only at runtime as a
    // silent partial-report fallback.
    expect(existsSync(YAML_PATH)).toBe(true)
  })
})
