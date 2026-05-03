import jsYaml from 'js-yaml'
import type {
  DeliberationSpec,
  SpecAgent,
  FlowSpec,
  ReviewerSpec,
  AuditSpec,
  SynthesisSpec,
  RoundsSpec,
  RevisionTrigger
} from './spec-types'
import { DeliberationSpecSchema } from './spec-schema'

/**
 * Parse a YAML string into a validated DeliberationSpec.
 * Throws if the YAML is malformed or fails schema validation.
 */
export function loadSpec(yamlContent: string): DeliberationSpec {
  const raw = jsYaml.load(yamlContent)
  const result = DeliberationSpecSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`DeliberationSpec validation failed:\n${issues}`)
  }

  const d = result.data

  const agents: SpecAgent[] = d.agents.map((a) => ({
    name: a.name,
    description: a.description,
    systemPrompt: a.system_prompt,
    model: a.model,
    editable: a.editable,
    maxTokens: a.max_tokens,
    tools: a.tools,
    outputFormat: a.output_format,
    outputSchema: a.output_schema,
    classifier: a.classifier ? { mode: a.classifier.mode, budget: a.classifier.budget } : undefined,
    role: a.role
  }))

  const flow: FlowSpec | undefined = d.flow
    ? {
        rounds: d.flow.rounds
          ? ({
              count: d.flow.rounds.count,
              agents: d.flow.rounds.agents,
              messageTemplate: d.flow.rounds.message_template
            } satisfies RoundsSpec)
          : undefined,
        synthesis: d.flow.synthesis
          ? ({
              agent: d.flow.synthesis.agent,
              messageTemplate: d.flow.synthesis.message_template
            } satisfies SynthesisSpec)
          : undefined,
        audit: d.flow.audit
          ? ((): AuditSpec => {
              const rawTrigger = d.flow!.audit!.revision.trigger
              let trigger: RevisionTrigger
              if (rawTrigger.type === 'contains') {
                trigger = {
                  type: 'contains',
                  value: rawTrigger.value,
                  caseSensitive: rawTrigger.case_sensitive
                }
              } else if (rawTrigger.type === 'json-field-equals') {
                trigger = {
                  type: 'json-field-equals',
                  path: rawTrigger.path,
                  value: rawTrigger.value as string | undefined
                }
              } else {
                trigger = {
                  type: 'json-field-truthy',
                  path: rawTrigger.path
                }
              }
              return {
                agents: d.flow!.audit!.agents,
                messageTemplate: d.flow!.audit!.message_template,
                revision: {
                  max: d.flow!.audit!.revision.max,
                  trigger,
                  logic: d.flow!.audit!.revision.logic
                }
              }
            })()
          : undefined,
        response: d.flow.response ? { mode: d.flow.response.mode, format: d.flow.response.format } : undefined
      }
    : undefined

  const reviewers: ReviewerSpec[] | undefined = d.reviewers?.map((r) => ({
    agent: r.agent,
    messageTemplate: r.message_template
  }))

  return {
    schemaVersion: '1.0',
    id: d.id,
    displayName: d.display_name,
    description: d.description,
    experimental: d.experimental,
    benchmarked: d.benchmarked,
    defaults: { model: d.defaults.model, maxTokens: d.defaults.max_tokens },
    agents,
    flow,
    reviewers,
    response: d.response ? { mode: d.response.mode, format: d.response.format } : undefined
  }
}
