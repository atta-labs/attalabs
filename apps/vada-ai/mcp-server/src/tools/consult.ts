import { z } from 'zod'
import { compileFlow } from '@atta/engine'
import { LangGraphAdapter, createMultiVendorLlmCall } from '@atta/adapter-langgraph'
import type { ProviderKeys } from '@atta/adapter-langgraph'
import { getCatalog, findModelEntryByModelId, isLocalOnly, resolveVendorByPrefix, type VendorId } from '@atta/models'
import { lookupSpec } from '../spec-registry'
import { logSession } from '../session-logger'

type ReviewerProfileName = 'strategist' | 'critic' | 'devils_advocate'

const ROLE_TO_AGENT_NAME: Record<string, string> = {
  strategist: 'Strategist',
  critic: 'Critic',
  devils_advocate: "Devil's Advocate",
  domain_expert: 'DomainExpert'
}

// Sonnet 4.6 pricing (USD per million tokens, May 2026)
const PRICING = { input: 3.0, output: 15.0 }

const DEFAULT_MODEL = process.env.VADA_MODEL ?? 'claude-sonnet-4-6'

// ─── Validation schemas ────────────────────────────────────────────────────────

export const ReviewerSpecSchema = z.object({
  role: z.enum(['strategist', 'critic', 'devils_advocate', 'domain_expert']),
  notes: z.string().min(20, 'notes must be at least 20 characters').optional(),
  domain: z.string().optional()
})

export const ConsultInputStructuredSchema = z
  .object({
    spec_id: z
      .string()
      .optional()
      .describe('Spec ID to route to. Defaults to brokered-trio. Routes to YAMLs from the catalog.'),
    context: z.string().min(50, 'context must be at least 50 characters'),
    question: z.string().min(10, 'question must be at least 10 characters'),
    reviewers: z
      .array(ReviewerSpecSchema)
      .min(2, 'at least 2 reviewers required')
      .max(5, 'at most 5 reviewers allowed'),
    reviewer_config: z
      .record(z.string())
      .optional()
      .describe('Maps agent display name to model ID. Every model must have a configured provider key.'),
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

export type ReviewerSpec =
  | { profileName: ReviewerProfileName; notes?: string; domain?: never }
  | { profileName: 'domain_expert'; notes?: string; domain: string }

export interface ConsultInput {
  specId?: string
  question: string
  reviewerSpecs: ReviewerSpec[]
  /** Maps agent display name → modelId; used to build agentVendorOverrides in runConsult. */
  reviewerConfig?: Record<string, string>
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

export type ValidationOutcome = { valid: true; data: ConsultInput } | { valid: false; errors: ValidationError[] }

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

    const domainExpertEnabled = process.env.VADA_DOMAIN_EXPERT === 'true'
    const hasDomainExpert = data.reviewers.some((r) => r.role === 'domain_expert')
    if (hasDomainExpert && !domainExpertEnabled) {
      return { valid: false, errors: [{ field: 'reviewers', reason: 'domain_expert_not_available' }] }
    }

    const reviewerSpecs: ReviewerSpec[] = data.reviewers.map((r) =>
      r.role === 'domain_expert'
        ? { profileName: 'domain_expert' as const, notes: r.notes, domain: r.domain! }
        : { profileName: r.role as ReviewerProfileName, notes: r.notes }
    )

    return {
      valid: true,
      data: {
        specId: data.spec_id,
        question: composeQuestion(data),
        reviewerSpecs,
        reviewerConfig: data.reviewer_config,
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
      specId: undefined,
      question: data.brief,
      reviewerSpecs: data.reviewers.map((r) => ({ profileName: r as ReviewerProfileName }))
    }
  }
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ReviewerResponse {
  reviewer: ReviewerProfileName | 'domain_expert'
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

export async function runConsult(
  input: ConsultInput,
  providerKeys: ProviderKeys,
  origin?: string
): Promise<ConsultOutput> {
  // Load flow by spec_id (default to brokered-trio for backward compatibility)
  const baseFlow = lookupSpec(input.specId ?? 'brokered-trio')

  // Try role-based reviewer selection from the flow's first round agents.
  // Fall back to the flow's default round agents if role selection fails or is inapplicable.
  let flowToRun = baseFlow
  let customVars: Record<string, string> | undefined

  const reviewRound = baseFlow.rounds[0]
  if (reviewRound && reviewRound.agents.length > 1 && input.reviewerSpecs.length > 0) {
    try {
      const selectedAgents = input.reviewerSpecs.map((spec) => {
        const agentName = ROLE_TO_AGENT_NAME[spec.profileName]!
        const roundAgent = reviewRound.agents.find((a) => a.name === agentName)
        if (!roundAgent) throw new Error(`Reviewer '${agentName}' not found in spec '${baseFlow.id}'`)
        const messageTemplate = spec.notes
          ? `${roundAgent.messageTemplate ?? '{{question}}'}\n\n## Specific Request For You\n${spec.notes}`
          : roundAgent.messageTemplate
        return { ...roundAgent, messageTemplate }
      })

      flowToRun = {
        ...baseFlow,
        rounds: baseFlow.rounds.map((r, i) => (i === 0 ? { ...r, agents: selectedAgents } : r))
      }
      const domainInput = input.reviewerSpecs.find((s) => s.profileName === 'domain_expert')
      customVars = domainInput?.domain ? { domain: domainInput.domain } : undefined
    } catch {
      // Role selection failed; use flow's default round agents as-is
      flowToRun = baseFlow
    }
  }

  const plan = compileFlow(flowToRun, input.question, DEFAULT_MODEL, customVars)

  // Build agentVendorOverrides from reviewerConfig. Catalog lookup is authoritative
  // (handles cross-vendor models like deepseek-r1-distill-llama-70b served by Groq).
  let agentVendorOverrides: Record<string, VendorId> | undefined
  if (input.reviewerConfig && Object.keys(input.reviewerConfig).length > 0) {
    const catalog = await getCatalog()
    agentVendorOverrides = {}
    for (const [agentName, modelId] of Object.entries(input.reviewerConfig)) {
      const entry = findModelEntryByModelId(catalog, modelId)
      const vendorId = entry?.vendorId ?? resolveVendorByPrefix(modelId)
      if (!vendorId) continue
      if (isLocalOnly(vendorId)) {
        throw Object.assign(
          new Error(
            `Model '${modelId}' routes to '${vendorId}' which is local-only and cannot be used in a hosted execution context.`
          ),
          {
            code: 'local_only_vendor',
            vendorId,
            modelId,
            agentName
          }
        )
      }
      if (!providerKeys[vendorId]) {
        throw Object.assign(
          new Error(`Missing provider key for '${vendorId}' (required by model '${modelId}' on agent '${agentName}').`),
          {
            code: 'missing_provider_key',
            vendorId,
            modelId,
            agentName
          }
        )
      }
      agentVendorOverrides[agentName] = vendorId
    }
    if (Object.keys(agentVendorOverrides).length === 0) agentVendorOverrides = undefined
  }

  const llmCall = createMultiVendorLlmCall(providerKeys, agentVendorOverrides)
  const adapter = new LangGraphAdapter({ apiKey: providerKeys.anthropic, agentVendorOverrides })
  const startedAt = Date.now()
  const conclusion = await adapter.execute({ plan, customVars: {}, llmCall })
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
    reviewer: input.reviewerSpecs[i]!.profileName as ReviewerProfileName | 'domain_expert',
    response: entry.content
  }))

  return {
    responses,
    session_id: sessionId,
    session_url: `https://vada.attalabs.dev/sessions/${sessionId}`,
    cost_breakdown: {
      estimated_usd: estimatedUsd,
      tokens_input: conclusion.totalTokensInput,
      tokens_output: conclusion.totalTokensOutput,
      duration_ms: durationMs
    }
  }
}
