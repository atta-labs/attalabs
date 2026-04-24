import { z } from 'zod'
import { compile } from '@atta/engine'
import type { Team } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { reviewerProfiles, type ReviewerProfileName } from '../reviewer-profiles'
import { logSession } from '../session-logger'

// Sonnet 4.6 pricing (USD per million tokens, May 2026)
const PRICING = { input: 3.0, output: 15.0 }

const DEFAULT_MODEL = process.env.VADA_MODEL ?? 'claude-sonnet-4-6'

const BASE_TEMPLATE = '{{question}}'

// ─── Validation schemas ────────────────────────────────────────────────────────

export const ReviewerSpecSchema = z.object({
  role: z.enum(['strategist', 'critic', 'devils_advocate', 'domain_expert']),
  notes: z.string().min(20, 'notes must be at least 20 characters').optional(),
  domain: z.string().optional()
})

export const ConsultInputStructuredSchema = z
  .object({
    context: z.string().min(50, 'context must be at least 50 characters'),
    question: z.string().min(10, 'question must be at least 10 characters'),
    reviewers: z
      .array(ReviewerSpecSchema)
      .min(2, 'at least 2 reviewers required')
      .max(5, 'at most 5 reviewers allowed'),
    session_title: z.string().optional(),
    current_leaning: z.string().optional(),
    stakes: z.string().optional()
  })
  .refine(
    (input) => {
      const roles = input.reviewers.map((r) => r.role)
      return new Set(roles).size === roles.length
    },
    { message: 'reviewers must have distinct roles', path: ['reviewers'] }
  )

// Backward-compat: old brief + string[] reviewers shape
export const ConsultInputLegacySchema = z.object({
  brief: z.string().min(1, 'brief must be a non-empty string'),
  reviewers: z
    .array(z.enum(['strategist', 'critic', 'devils_advocate']))
    .min(2, 'at least 2 reviewers required')
    .max(5, 'at most 5 reviewers allowed')
})

export type ConsultInputStructured = z.infer<typeof ConsultInputStructuredSchema>
export type ConsultInputLegacy = z.infer<typeof ConsultInputLegacySchema>

// ─── Internal normalized type ─────────────────────────────────────────────────

export interface ConsultInput {
  question: string
  reviewerSpecs: Array<{ profileName: ReviewerProfileName; notes?: string }>
  sessionTitle?: string
  contextText?: string
  currentLeaning?: string
  stakes?: string
}

// ─── Structured error types ───────────────────────────────────────────────────

export interface ValidationError {
  field: string
  reason: string
  min?: number
}

export type ValidationOutcome =
  | { valid: true; data: ConsultInput }
  | { valid: false; errors: ValidationError[] }

// ─── Validation helpers ───────────────────────────────────────────────────────

function mapZodErrors(issues: z.ZodIssue[]): ValidationError[] {
  return issues.map((issue): ValidationError => {
    const field = issue.path.length > 0 ? issue.path.map(String).join('.') : 'input'
    if (issue.code === 'too_small') {
      const min = typeof issue.minimum === 'bigint' ? Number(issue.minimum) : issue.minimum
      if (issue.type === 'string') return { field, reason: 'too_short', min }
      if (issue.type === 'array') return { field, reason: 'too_few_items', min }
    }
    if (issue.code === 'too_big') return { field, reason: 'too_many_items' }
    if (issue.code === 'invalid_enum_value') return { field, reason: 'invalid_value' }
    return { field, reason: issue.message }
  })
}

function composeQuestion(input: ConsultInputStructured): string {
  const parts = [input.context, `## Question\n${input.question}`]
  if (input.current_leaning) parts.push(`## Current Leaning\n${input.current_leaning}`)
  if (input.stakes) parts.push(`## Stakes\n${input.stakes}`)
  return parts.join('\n\n')
}

export function validateAndNormalize(args: unknown): ValidationOutcome {
  if (typeof args !== 'object' || args === null) {
    return { valid: false, errors: [{ field: 'input', reason: 'must be an object' }] }
  }

  const obj = args as Record<string, unknown>

  // New structured shape: presence of 'context' field
  if ('context' in obj) {
    const result = ConsultInputStructuredSchema.safeParse(args)
    if (!result.success) return { valid: false, errors: mapZodErrors(result.error.issues) }
    const data = result.data
    return {
      valid: true,
      data: {
        question: composeQuestion(data),
        reviewerSpecs: data.reviewers
          .filter((r) => r.role !== 'domain_expert')
          .map((r) => ({ profileName: r.role as ReviewerProfileName, notes: r.notes })),
        sessionTitle: data.session_title,
        contextText: data.context,
        currentLeaning: data.current_leaning,
        stakes: data.stakes
      }
    }
  }

  // Legacy shape: brief + string[] reviewers
  const result = ConsultInputLegacySchema.safeParse(args)
  if (!result.success) return { valid: false, errors: mapZodErrors(result.error.issues) }
  const data = result.data
  return {
    valid: true,
    data: {
      question: data.brief,
      reviewerSpecs: data.reviewers.map((r) => ({ profileName: r as ReviewerProfileName }))
    }
  }
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ReviewerResponse {
  reviewer: ReviewerProfileName
  response: string
}

export interface ConsultOutput {
  responses: ReviewerResponse[]
  session_id: string
  session_url: string
  cost_breakdown: {
    estimated_usd: number
    tokens_input: number
    tokens_output: number
    duration_ms: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateShareToken(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes)
    .map((b) => chars[b % 62])
    .join('')
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function runConsult(input: ConsultInput, apiKey: string, origin?: string): Promise<ConsultOutput> {
  const selectedAgents = input.reviewerSpecs.map((s) => reviewerProfiles[s.profileName])

  const team: Team = {
    name: 'BrokeredConsult',
    description: `Brokered consultation: ${input.reviewerSpecs.map((s) => s.profileName).join(', ')}`,
    agents: selectedAgents,
    workflow: {
      type: 'brokered',
      reviewers: input.reviewerSpecs.map((s) => ({
        agentName: reviewerProfiles[s.profileName].name,
        messageTemplate: s.notes ? `${BASE_TEMPLATE}\n\n## Your Focus\n${s.notes}` : BASE_TEMPLATE
      }))
    }
  }

  const plan = compile({ team, question: input.question, model: DEFAULT_MODEL })

  const adapter = new LangGraphAdapter({ apiKey })
  const startedAt = Date.now()
  const conclusion = await adapter.execute({ plan, customVars: {} })
  const durationMs = Date.now() - startedAt

  const estimatedUsd =
    (conclusion.totalTokensInput * PRICING.input + conclusion.totalTokensOutput * PRICING.output) / 1_000_000

  const sessionId = crypto.randomUUID()

  await logSession({
    id: sessionId,
    toolName: 'vada__consult',
    reviewerProfile: input.reviewerSpecs.map((s) => s.profileName).join(','),
    prompt: input.question,
    response: conclusion.content,
    costUsd: estimatedUsd.toFixed(6),
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    toolCalls: null,
    durationMs,
    sessionTitle: input.sessionTitle ?? null,
    context: input.contextText ?? null,
    currentLeaning: input.currentLeaning ?? null,
    stakes: input.stakes ?? null,
    origin: origin ?? 'other',
    isShared: false,
    shareToken: generateShareToken()
  })

  const responses: ReviewerResponse[] = conclusion.transcript.map((entry, i) => ({
    reviewer: input.reviewerSpecs[i]!.profileName,
    response: entry.content
  }))

  return {
    responses,
    session_id: sessionId,
    session_url: `https://vada.ai/s/${sessionId}`,
    cost_breakdown: {
      estimated_usd: estimatedUsd,
      tokens_input: conclusion.totalTokensInput,
      tokens_output: conclusion.totalTokensOutput,
      duration_ms: durationMs
    }
  }
}
