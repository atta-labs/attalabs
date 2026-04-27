import { z } from 'zod'

const ClassifierModeSchema = z.enum(['auto', 'skip', 'always_tools'])

const SpecAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  system_prompt: z.string().min(1),
  model: z.string().optional(),
  max_tokens: z.number().optional(),
  tools: z.array(z.string()).optional(),
  output_format: z.enum(['text', 'structured']).optional(),
  output_schema: z.record(z.string(), z.unknown()).optional(),
  classifier: z
    .object({
      mode: ClassifierModeSchema,
      budget: z.number().optional()
    })
    .optional()
})

const RoundsSpecSchema = z.object({
  count: z.number().int().min(1),
  agents: z.array(z.string()).min(1),
  message_template: z.string().min(1)
})

const SynthesisSpecSchema = z.object({
  agent: z.string().min(1),
  message_template: z.string().min(1)
})

const RevisionTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('contains'),
    value: z.string(),
    case_sensitive: z.boolean().optional()
  }),
  z.object({
    type: z.literal('json-field-equals'),
    path: z.string(),
    value: z.unknown()
  }),
  z.object({
    type: z.literal('json-field-truthy'),
    path: z.string()
  })
])

const AuditSpecSchema = z.object({
  agents: z.array(z.string()).min(1),
  message_template: z.string().min(1),
  revision: z.object({
    max: z.number().int().min(1),
    trigger: RevisionTriggerSchema,
    logic: z.enum(['any', 'all']).optional()
  })
})

const ResponseSpecSchema = z.object({
  mode: z.enum(['synthesize', 'concatenate']),
  format: z.string().optional()
})

const FlowSpecSchema = z.object({
  rounds: RoundsSpecSchema.optional(),
  synthesis: SynthesisSpecSchema.optional(),
  audit: AuditSpecSchema.optional(),
  response: ResponseSpecSchema.optional()
})

const ReviewerSpecSchema = z.object({
  agent: z.string().min(1),
  message_template: z.string().min(1)
})

export const DeliberationSpecSchema = z
  .object({
    schema_version: z.literal('1.0'),
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
    display_name: z.string().min(1),
    description: z.string().min(1),
    experimental: z.boolean().default(false),
    benchmarked: z.boolean().default(false),
    defaults: z.object({
      model: z.string().min(1),
      max_tokens: z.number().optional()
    }),
    agents: z.array(SpecAgentSchema).min(1),
    flow: FlowSpecSchema.optional(),
    reviewers: z.array(ReviewerSpecSchema).optional(),
    response: ResponseSpecSchema.optional()
  })
  .refine((d) => d.flow !== undefined || d.reviewers !== undefined, {
    message: 'spec must have either flow or reviewers',
    path: ['flow']
  })
  .refine((d) => !(d.flow?.rounds !== undefined && d.reviewers !== undefined), {
    message: 'flow.rounds and reviewers are mutually exclusive',
    path: ['reviewers']
  })
  .refine((d) => !(d.flow?.rounds !== undefined && d.flow?.synthesis === undefined), {
    message: 'flow.rounds requires flow.synthesis',
    path: ['flow', 'synthesis']
  })
  .refine(
    (d) => {
      const synthAgent = d.flow?.synthesis?.agent
      if (!synthAgent) return true
      return d.agents.some((a) => a.name === synthAgent)
    },
    (d) => ({
      message: `flow.synthesis.agent '${d.flow?.synthesis?.agent}' not found in agents list`,
      path: ['flow', 'synthesis', 'agent']
    })
  )
  .refine(
    (d) => {
      const synthAgentName = d.flow?.synthesis?.agent
      if (!synthAgentName) return true
      const synthAgent = d.agents.find((a) => a.name === synthAgentName)
      if (!synthAgent) return true
      if (synthAgent.output_format === 'structured' && !synthAgent.output_schema) return false
      return true
    },
    (d) => ({
      message: `synthesis agent '${d.flow?.synthesis?.agent}' declares output_format: structured but has no output_schema`,
      path: ['agents']
    })
  )
  .refine((d) => d.agents.every((a) => !(a.output_schema !== undefined && a.output_format !== 'structured')), {
    message: 'agents with output_schema must also declare output_format: structured',
    path: ['agents']
  })
