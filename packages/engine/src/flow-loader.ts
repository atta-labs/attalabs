import type { z } from 'zod'
import jsYaml from 'js-yaml'
import { FlowSchema, type FlowAgentSchema } from './flow-schema'
import type {
  Flow,
  FlowAgent,
  Round,
  AgentInRound,
  OnFailureSpec,
  FailureSignal,
  StepsFlow,
  AgentRole,
  Step,
  StepDecision
} from './flow-types'

type RawFlowAgent = z.infer<typeof FlowAgentSchema>

function parseFlowYaml(yamlContent: string) {
  const raw = jsYaml.load(yamlContent)
  const result = FlowSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Flow validation failed:\n${issues}`)
  }
  return result.data
}

/**
 * Parse a YAML string into a validated, rounds-shaped Flow (v2 schema).
 * Throws if the YAML is malformed, fails schema validation, or declares
 * `steps` instead of `rounds` — use loadStepsFlow for that shape.
 */
export function loadFlow(yamlContent: string): Flow {
  const d = parseFlowYaml(yamlContent)
  if (d.rounds === undefined) {
    throw new Error('Flow validation failed:\n  rounds: this Flow declares steps, not rounds — use loadStepsFlow')
  }

  const agents: FlowAgent[] = d.agents.map((raw): FlowAgent => {
    const a = raw as RawFlowAgent
    return {
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
    }
  })

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

/**
 * Parse a YAML string into a validated, steps-shaped Flow (v2 schema).
 * Throws if the YAML is malformed, fails schema validation, or declares
 * `rounds` instead of `steps` — use loadFlow for that shape.
 */
export function loadStepsFlow(yamlContent: string): StepsFlow {
  const d = parseFlowYaml(yamlContent)
  if (d.steps === undefined) {
    throw new Error('Flow validation failed:\n  steps: this Flow declares rounds, not steps — use loadFlow')
  }

  const agents: AgentRole[] = d.agents.map((a) => ({ role: (a as { role: string }).role }))

  const steps: Step[] = d.steps.map((s): Step => {
    const decision: StepDecision | undefined = s.decision
      ? {
          examine: s.decision.examine,
          ifTrue: s.decision.if_true,
          ifFalse: s.decision.if_false,
          maxRevisions: s.decision.max_revisions
        }
      : undefined

    if (s.type === 'agent') {
      return {
        id: s.id,
        type: 'agent',
        role: s.role,
        promptTemplate: s.prompt_template,
        permission: s.permission,
        workingDirectory: s.working_directory,
        maxTurns: s.max_turns,
        resume: s.resume,
        decision
      }
    }
    return {
      id: s.id,
      type: 'mechanical',
      action: s.action,
      decision
    }
  })

  return {
    schemaVersion: '2.0',
    id: d.id,
    displayName: d.display_name,
    description: d.description,
    experimental: d.experimental,
    benchmarked: d.benchmarked,
    defaults: { model: d.defaults.model, maxTokens: d.defaults.max_tokens },
    agents,
    steps
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
