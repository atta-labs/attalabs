import jsYaml from 'js-yaml'
import { FlowSchema } from './flow-schema'
import type { Flow, FlowAgent, Round, AgentInRound, OnFailureSpec, FailureSignal } from './flow-types'

/**
 * Parse a YAML string into a validated Flow (v2 schema).
 * Throws if the YAML is malformed or fails schema validation.
 */
export function loadFlow(yamlContent: string): Flow {
  const raw = jsYaml.load(yamlContent)
  const result = FlowSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Flow validation failed:\n${issues}`)
  }

  const d = result.data

  const agents: FlowAgent[] = d.agents.map(
    (a): FlowAgent => ({
      name: a.name,
      description: a.description,
      systemPrompt: a.system_prompt,
      model: a.model,
      maxTokens: a.max_tokens,
      tools: a.tools,
      customTools: a.custom_tools,
      outputFormat: a.output_format,
      outputSchema: a.output_schema,
      classifier: a.classifier ? { mode: a.classifier.mode, budget: a.classifier.budget } : undefined,
      editable: a.editable,
      role: a.role
    })
  )

  const rounds: Round[] = d.rounds.map(
    (r): Round => ({
      id: r.id,
      name: r.name,
      layout: r.layout,
      repeats: r.repeats,
      agents: r.agents.map(
        (a): AgentInRound => ({
          name: a.name,
          messageTemplate: a.message_template
        })
      ),
      messageTemplate: r.message_template,
      agentFailure: r.agent_failure,
      onFailure: r.on_failure ? transformOnFailure(r.on_failure) : undefined
    })
  )

  return {
    schemaVersion: '2.0',
    id: d.id,
    displayName: d.display_name,
    description: d.description,
    experimental: d.experimental,
    benchmarked: d.benchmarked,
    defaults: { model: d.defaults.model, maxTokens: d.defaults.max_tokens },
    agents,
    rounds
  }
}

function transformOnFailure(raw: {
  action: 'abort' | 'continue' | 'revise'
  target?: string
  max_revisions?: number
  signal: { type: 'contains' | 'equals' | 'matches'; value: string; case_sensitive?: boolean }
}): OnFailureSpec {
  const signal: FailureSignal = {
    type: raw.signal.type,
    value: raw.signal.value,
    caseSensitive: raw.signal.case_sensitive
  }
  return {
    action: raw.action,
    target: raw.target,
    maxRevisions: raw.max_revisions,
    signal
  }
}
