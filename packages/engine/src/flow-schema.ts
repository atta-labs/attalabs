import { z } from 'zod'

export const FailureSignalSchema = z.object({
  type: z.enum(['contains', 'equals', 'matches']),
  value: z.string().min(1),
  case_sensitive: z.boolean().optional()
})

export const OnFailureSpecSchema = z.object({
  action: z.enum(['abort', 'continue', 'revise']),
  target: z.string().optional(),
  max_revisions: z.number().int().min(1).optional(),
  signal: FailureSignalSchema
})

export const AgentInRoundSchema = z.object({
  name: z.string().min(1),
  message_template: z.string().optional()
})

export const RoundSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'round id must be kebab-case'),
  name: z.string().min(1),
  agents: z.array(AgentInRoundSchema).min(1),
  layout: z.enum(['parallel', 'serial']),
  repeats: z.number().int().min(1).optional(),
  message_template: z.string().optional(),
  agent_failure: z.enum(['abort', 'continue']).optional(),
  on_failure: OnFailureSpecSchema.optional()
})

export const CustomToolSpecSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.record(z.string(), z.unknown())
})

export const FlowAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  system_prompt: z.string().min(1),
  model: z.string().optional(),
  max_tokens: z.number().int().min(1).optional(),
  tools: z.array(z.string()).optional(),
  custom_tools: z.array(CustomToolSpecSchema).optional(),
  output_format: z.enum(['text', 'structured']).optional(),
  output_schema: z.record(z.string(), z.unknown()).optional(),
  classifier: z
    .object({
      mode: z.enum(['auto', 'skip', 'always_tools']),
      budget: z.number().int().min(0).optional()
    })
    .optional(),
  editable: z.boolean().optional(),
  role: z.string().optional()
})

export const FlowSchema = z.object({
  schema_version: z.literal('2.0'),
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
    max_tokens: z.number().int().min(1).optional()
  }),
  agents: z.array(FlowAgentSchema).min(1),
  rounds: z.array(RoundSchema).min(1)
})
