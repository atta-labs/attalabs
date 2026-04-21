import 'server-only'
// createStep is intentionally NOT used. Reason: Mastra's createStep has 5 overloads
// that require TypeScript to check Zod schemas against PublicSchema<T>, a 7-way union
// type. At 12+ steps this causes TS2589 (type instantiation depth limit) + OOM.
// Fix: construct Step interface objects directly — see SCHEMA CAST PATTERN below.
//
// SCHEMA CAST PATTERN: `as typeof <schemaConst>` is an identity cast that breaks the
// bidirectional inference path Mastra's Step<> type triggers on schema properties.
// Without it, TypeScript resolves PublicSchema<T>'s 7-way union per step, causing
// TS2589 at ~12 steps and OOM. The cast is a no-op at runtime and loses no type
// information — the variable already IS that type. Inline z.object({}) literals must
// be hoisted to named consts so typeof can reference them.
import type { Step } from '@mastra/core/workflows'
import { z } from 'zod'
import { classifyVerdict, createDeliberationContext } from '@atta/orchestration'
import type { DeliberationAgent } from '@atta/orchestration'
import { executeAgentTurn, executeConclusionTurn } from '@atta/orchestration/server'
import { getSessionWithTranscript, updateSessionState } from '@/db/queries'
import { persistTurn } from '@/engine/turn-logic'
import { getNextCommand } from '@/engine/orchestrator'
import {
  criticAgent,
  devilsAdvocateAgent,
  operatorAgent,
  researcherAgent,
  strategistAgent,
  synthesizerAgent
} from '@/engine/agents'

// OBSERVABILITY HAZARD: inputData contains apiKey. When tracing is added
// (Step 5.5), configure the tracer to redact apiKey from step inputs/outputs.
export const workflowInputSchema = z.object({
  sessionId: z.string(),
  apiKey: z.string().optional()
})
export type WorkflowInput = z.infer<typeof workflowInputSchema>

export type AuditStepOutput = { verdict: string }

const stepOkSchema = z.object({ ok: z.literal(true) })
const verdictSchema = z.object({ verdict: z.string() })

type OkOutput = { ok: true }
type EntryOutput = OkOutput

// Step type aliases — plain TS types, no schema inference needed by the chain
type OkStep = Step<string, unknown, OkOutput, OkOutput>
type EntryStep = Step<string, unknown, WorkflowInput, EntryOutput>
type AuditStepType = Step<string, unknown, OkOutput, AuditStepOutput>
type BranchStepType = Step<string, unknown, AuditStepOutput, OkOutput>

const agentByName: Record<string, DeliberationAgent> = {
  Strategist: strategistAgent,
  Critic: criticAgent,
  "Devil's Advocate": devilsAdvocateAgent,
  Synthesizer: synthesizerAgent,
  Researcher: researcherAgent,
  Operator: operatorAgent
}

async function loadFreshSession(sessionId: string) {
  const session = await getSessionWithTranscript(sessionId)
  if (!session) throw new Error(`Session not found: ${sessionId}`)
  return session
}

async function runAgentTurn(sessionId: string, apiKey: string | undefined) {
  let session = await loadFreshSession(sessionId)
  if (session.transcriptEntries.length === 0)
    // biome-ignore lint/suspicious/noConsole: intentional workflow observability log — model/provider audit trail
    console.log(
      `[workflow] model=${session.modelId ?? 'claude-sonnet-4-6'} provider=${session.provider ?? 'anthropic'}`
    )
  let command = getNextCommand(session)
  for (let i = 0; i < 4 && command.type === 'state_change'; i++) {
    await updateSessionState(sessionId, command.state)
    session = await loadFreshSession(sessionId)
    command = getNextCommand(session)
  }
  if (command.type !== 'run_agent') return
  const agent = agentByName[command.agent]
  if (!agent) return
  const ctx = createDeliberationContext({
    provider: command.model.provider,
    modelId: command.model.modelId,
    apiKey,
    question: session.question,
    round: command.round,
    hasWhispers: session.interventions.length > 0
  })
  const agentStart = Date.now()
  const result = await executeAgentTurn(agent, command.userPrompt, ctx)
  await persistTurn(sessionId, {
    turnId: command.turnId,
    content: result.text,
    phase: 'run_agent',
    agent: command.agent,
    round: command.round,
    tokensInput: result.usage.inputTokens ?? null,
    tokensOutput: result.usage.outputTokens ?? null,
    elapsedMs: Date.now() - agentStart
  })
}

// Entry step (Round 1 Strategist) — accepts WorkflowInput (sessionId + apiKey).
// Split from makeAgentStep to avoid conditional schema union that triggers TS2589.
export function makeFirstAgentStep(round: 1 | 2 | 3, role: string): EntryStep {
  return {
    id: `step-r${round}-${role}`,
    inputSchema: workflowInputSchema as typeof workflowInputSchema,
    outputSchema: stepOkSchema as typeof stepOkSchema,
    execute: async ({ getInitData }) => {
      const { sessionId, apiKey } = getInitData<WorkflowInput>()
      await runAgentTurn(sessionId, apiKey)
      return { ok: true as const }
    }
  }
}

// Continuation steps (all rounds except first) — accept OkOutput from prior step.
export function makeAgentStep(round: 1 | 2 | 3, role: string): OkStep {
  return {
    id: `step-r${round}-${role}`,
    inputSchema: stepOkSchema as typeof stepOkSchema,
    outputSchema: stepOkSchema as typeof stepOkSchema,
    execute: async ({ getInitData }) => {
      const { sessionId, apiKey } = getInitData<WorkflowInput>()
      await runAgentTurn(sessionId, apiKey)
      return { ok: true as const }
    }
  }
}

export const conclusionSynthesizeStep: OkStep = {
  id: 'step-conclusion-synthesize',
  inputSchema: stepOkSchema as typeof stepOkSchema,
  outputSchema: stepOkSchema as typeof stepOkSchema,
  execute: async ({ getInitData }) => {
    const { sessionId, apiKey } = getInitData<WorkflowInput>()
    const session = await loadFreshSession(sessionId)
    const command = getNextCommand(session)
    if (command.type !== 'run_conclusion' || command.phase !== 'synthesize') {
      return { ok: true as const }
    }
    const result = await executeConclusionTurn({
      phase: command.phase,
      systemPrompt: command.systemPrompt,
      userPrompt: command.userPrompt,
      model: command.model,
      apiKey
    })
    await persistTurn(sessionId, {
      turnId: command.turnId,
      content: result.content,
      phase: command.phase,
      tokensInput: result.inputTokens,
      tokensOutput: result.outputTokens,
      elapsedMs: result.durationMs
    })
    return { ok: true as const }
  }
}

export const conclusionAuditStep: AuditStepType = {
  id: 'step-conclusion-audit',
  inputSchema: stepOkSchema as typeof stepOkSchema,
  outputSchema: verdictSchema as typeof verdictSchema,
  execute: async ({ getInitData }) => {
    const { sessionId, apiKey } = getInitData<WorkflowInput>()
    const session = await loadFreshSession(sessionId)
    const command = getNextCommand(session)
    if (command.type !== 'run_conclusion') return { verdict: 'SKIP' }
    const result = await executeConclusionTurn({
      phase: command.phase,
      systemPrompt: command.systemPrompt,
      userPrompt: command.userPrompt,
      model: command.model,
      apiKey
    })
    const verdict = classifyVerdict(result.content)
    await persistTurn(sessionId, {
      turnId: command.turnId,
      content: result.content,
      phase: command.phase,
      tokensInput: result.inputTokens,
      tokensOutput: result.outputTokens,
      elapsedMs: result.durationMs
    })
    return { verdict }
  }
}

// No-op step for the PASS branch — session is already in TERMINAL state.
export const conclusionPassStep: BranchStepType = {
  id: 'step-conclusion-pass',
  inputSchema: verdictSchema as typeof verdictSchema,
  outputSchema: stepOkSchema as typeof stepOkSchema,
  execute: async () => ({ ok: true as const })
}

// Handles both revise + reaudit in a single step.
export const conclusionReviseReauditStep: BranchStepType = {
  id: 'step-conclusion-revise-reaudit',
  inputSchema: verdictSchema as typeof verdictSchema,
  outputSchema: stepOkSchema as typeof stepOkSchema,
  execute: async ({ getInitData }) => {
    const { sessionId, apiKey } = getInitData<WorkflowInput>()

    let session = await loadFreshSession(sessionId)
    let command = getNextCommand(session)

    if (command.type === 'run_conclusion' && command.phase === 'revise') {
      const result = await executeConclusionTurn({
        phase: command.phase,
        systemPrompt: command.systemPrompt,
        userPrompt: command.userPrompt,
        model: command.model,
        apiKey
      })
      await persistTurn(sessionId, {
        turnId: command.turnId,
        content: result.content,
        phase: command.phase,
        tokensInput: result.inputTokens,
        tokensOutput: result.outputTokens,
        elapsedMs: result.durationMs
      })
    }

    session = await loadFreshSession(sessionId)
    command = getNextCommand(session)

    if (command.type === 'run_conclusion' && command.phase === 'reaudit') {
      const result = await executeConclusionTurn({
        phase: command.phase,
        systemPrompt: command.systemPrompt,
        userPrompt: command.userPrompt,
        model: command.model,
        apiKey
      })
      await persistTurn(sessionId, {
        turnId: command.turnId,
        content: result.content,
        phase: command.phase,
        tokensInput: result.inputTokens,
        tokensOutput: result.outputTokens,
        elapsedMs: result.durationMs
      })
    }

    return { ok: true as const }
  }
}
