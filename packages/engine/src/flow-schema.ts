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

// ── steps[] — the agent-spawn alternative to rounds[] ───────────────────────
//
// A Flow carries `rounds` XOR `steps`, never both — see the FlowSchema
// superRefine below. `steps` describes how to *launch* an agent (role,
// permission scope, working directory, turn ceiling, prior session to
// resume) and nothing about what it does once running: no tool bindings,
// no binary names. A mechanical step carries no model fields at all.

export const AgentRoleSchema = z
  .object({
    role: z.string().min(1)
  })
  .strict()

// A step-shaped decision: which step's result is examined, and where each
// of the two outcomes routes. Bare step-id references only — no
// contains/equals/matches predicate vocabulary; the meaning of the outcome
// is resolved by the executor's caller at run time, never here.
export const StepDecisionSchema = z.object({
  examine: z.string().min(1),
  if_true: z.string().min(1),
  if_false: z.string().min(1),
  max_revisions: z.number().int().min(1)
})

export const AgentStepSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'step id must be kebab-case'),
  type: z.literal('agent'),
  role: z.string().min(1),
  prompt_template: z.string().min(1),
  permission: z.string().min(1),
  working_directory: z.string().min(1),
  max_turns: z.number().int().min(1),
  resume: z.string().optional(),
  decision: StepDecisionSchema.optional(),
  depends_on: z.array(z.string().min(1)).optional()
})

export const MechanicalStepSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'step id must be kebab-case'),
  type: z.literal('mechanical'),
  action: z.string().min(1),
  decision: StepDecisionSchema.optional(),
  depends_on: z.array(z.string().min(1)).optional()
})

export const StepSchema = z.discriminatedUnion('type', [AgentStepSchema, MechanicalStepSchema])

export const FlowSchema = z
  .object({
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
    // Loosely typed here on purpose: which shape is actually required (FlowAgentSchema
    // for a rounds-shaped Flow, AgentRoleSchema for a steps-shaped one) depends on
    // `rounds` vs `steps`, decided below in superRefine — never both accepted for the
    // same Flow. Do not swap this for z.union([FlowAgentSchema, AgentRoleSchema]): a
    // union lets a rounds-shaped Flow parse with role-only agents (or vice versa) by
    // silently matching the wrong branch, which is exactly the XOR guarantee this
    // schema exists to hold.
    agents: z.array(z.record(z.string(), z.unknown())).min(1),
    rounds: z.array(RoundSchema).min(1).optional(),
    steps: z.array(StepSchema).min(1).optional()
  })
  .superRefine((data, ctx) => {
    const hasRounds = data.rounds !== undefined
    const hasSteps = data.steps !== undefined
    if (hasRounds === hasSteps) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: hasRounds
          ? 'Flow must declare exactly one of `rounds` or `steps` (XOR) — found both'
          : 'Flow must declare exactly one of `rounds` or `steps` (XOR) — found neither',
        path: hasRounds ? ['steps'] : ['rounds']
      })
      return
    }

    const agentSchema = hasRounds ? FlowAgentSchema : AgentRoleSchema
    data.agents.forEach((agent, i) => {
      const result = agentSchema.safeParse(agent)
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `agents[${i}]${issue.path.length ? `.${issue.path.join('.')}` : ''}: ${issue.message}`,
            path: ['agents', i, ...issue.path]
          })
        }
      }
    })
  })
