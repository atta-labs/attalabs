import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { compileFlow, loadFlow } from '@atta/engine'
import { MATCH_REPORT_SCHEMA } from '../src/lib/prompts'

const YAML_PATH = join(import.meta.dirname, '../yamls/herald-auditor.yaml')

function load() {
  return loadFlow(readFileSync(YAML_PATH, 'utf-8'))
}

describe('herald-auditor.yaml', () => {
  it('loads as a v2.0 flow', () => {
    const flow = load()
    expect(flow.schemaVersion).toBe('2.0')
    expect(flow.id).toBe('herald-auditor')
    expect(flow.defaults.model).toBe('claude-sonnet-4-20250514')
    expect(flow.rounds).toHaveLength(1)
    expect(flow.rounds[0]?.agents).toHaveLength(1)
    expect(flow.agents).toHaveLength(1)
    expect(flow.agents[0]?.name).toBe('SkepticalAuditor')
    expect(flow.agents[0]?.classifier?.mode).toBe('skip')
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
})
