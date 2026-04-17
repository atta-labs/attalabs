// Pure state machine. Given a session state + transcript, returns the next command
// the browser should execute. No LLM calls, no DB writes, no SSE — read-only.
// Prompt composition stays server-side; the browser only executes the resulting
// (systemPrompt, userPrompt, model) triple against the user's key. See /trust.

import type { RouteProvider } from '@atta/models'
import { type AgentConfig, getAgentConfig } from '@/schemas'
import { composeSystemPrompt } from './prompts/compose'
import { BLIND_CRITIC_PROMPT, CONCLUSION_MODE_PROMPT, REVISION_MODE_PROMPT } from './prompts/conclusion-prompts'
import type { ModelRef, NextCommand } from './types'

interface TranscriptEntry {
  agent: string
  content: string
  round: number
}

interface SessionLike {
  id: string
  state: string
  question: string
  agents: string[]
  provider: string | null
  modelId: string | null
  agentModels: unknown
  terminalState: string | null
  transcriptEntries: TranscriptEntry[]
  conclusion: {
    originalJson: unknown
    criticVerdict: string
    revisedJson: unknown
    criticReVerdict: string | null
    terminalState: string
  } | null
}

function newTurnId(): string {
  return crypto.randomUUID()
}

function defaultModel(session: SessionLike): ModelRef {
  const provider = (session.provider ?? 'anthropic') as RouteProvider
  const modelId = session.modelId ?? 'claude-sonnet-4-6'
  return { provider, modelId }
}

function modelForAgent(session: SessionLike, role: string): ModelRef {
  const perAgent = (session.agentModels ?? {}) as Record<string, { provider: string; modelId: string }>
  const cfg = perAgent[role]
  if (cfg) return { provider: cfg.provider as RouteProvider, modelId: cfg.modelId }
  return defaultModel(session)
}

function buildTranscriptContext(entries: TranscriptEntry[]): string {
  return entries.map((e) => `[Round ${e.round} — ${e.agent}]\n${e.content}`).join('\n\n---\n\n')
}

function buildRoundUserPrompt(round: number, question: string, transcript: TranscriptEntry[]): string {
  if (round === 1) return question
  const context = buildTranscriptContext(transcript)
  if (!context) return question
  return `The following is the deliberation transcript so far:\n\n${context}\n\n---\n\nThe original question is: ${question}`
}

function buildSynthesizerUserPrompt(question: string, agents: string[], transcript: TranscriptEntry[]): string {
  const context = buildTranscriptContext(transcript)
  const participantList = agents.join(', ')
  return `The original question is: "${question}"

Participants in this deliberation: ${participantList}

Deliberation transcript:

${context}

---

CRITICAL INSTRUCTION — READ THIS BEFORE GENERATING:

1. You MUST output valid JSON matching the conclusion schema. No markdown, no explanation, just the JSON object.

2. The "recommendation" field MUST directly answer the Principal's question: "${question}"
   - If the question is "Should I...?", start with "No," or "Yes," or "Not yet —" followed by the reasoning.
   - Do NOT hedge. Do NOT say "it depends" or "further evaluation is needed."
   - The deliberation already happened. You are delivering the verdict, not asking more questions.

3. The "key_condition" field must state the single most important assumption.

4. The "unresolved_points" field must list specific disagreements from the transcript with the agents involved. Do not invent them.

5. If the Principal's question had formatting constraints (e.g., "5 lines"), apply them to the recommendation text using \\n for line breaks.

GENERATE THE JSON NOW:`
}

function buildAuditUserPrompt(question: string, draft: Record<string, unknown>): string {
  const recommendation = typeof draft.recommendation === 'string' ? draft.recommendation : ''
  const keyCondition = typeof draft.key_condition === 'string' ? draft.key_condition : ''
  const reviewBy = typeof draft.review_by === 'string' ? draft.review_by : ''
  const unresolved = Array.isArray(draft.unresolved_points)
    ? draft.unresolved_points
        .map((up: unknown) => {
          if (typeof up === 'string') return up
          const point = up as { point: string; agents_involved: string[] }
          return `- ${point.point} (agents: ${point.agents_involved.join(', ')})`
        })
        .join('\n')
    : 'None'

  return `Principal's question: ${question}

Conclusion to Review:
[RECOMMENDATION FIELD]:
${recommendation}

[KEY CONDITION FIELD]:
${keyCondition}

[UNRESOLVED POINTS FIELD]:
${unresolved || 'None'}

[REVIEW BY]:
${reviewBy}`
}

function buildRevisionUserPrompt(original: Record<string, unknown>, objection: string): string {
  return `Original conclusion JSON:
${JSON.stringify(original, null, 2)}

The auditor's objection: ${objection}

---

CRITICAL INSTRUCTION — READ THIS BEFORE GENERATING:

1. Output ONLY the revised JSON object. No markdown, no explanation, no preamble.

2. If the objection says the recommendation "does not directly answer the question":
   - Rewrite the recommendation to START with a clear, committed position: "No," or "Yes," or "Not yet —"
   - Follow with the reasoning from the original conclusion.
   - Do NOT hedge. Do NOT say "it depends" or "further evaluation is needed."

3. If the objection is about formatting (e.g., wrong number of lines), fix the recommendation text using \\n for line breaks.

4. Keep all other fields (key_condition, unresolved_points, review_by, participants) unchanged unless the objection specifically targets them.

GENERATE THE REVISED JSON NOW:`
}

function orderedAgents(session: SessionLike): AgentConfig[] {
  const agents = session.agents.map((role) => getAgentConfig(role as Parameters<typeof getAgentConfig>[0]))
  const synthesizer = agents.find((a) => a.role === 'synthesizer')
  const nonSynth = agents.filter((a) => a.role !== 'synthesizer')
  return synthesizer ? [...nonSynth, synthesizer] : agents
}

export function getNextCommand(session: SessionLike): NextCommand {
  const agents = session.agents.map((role) => getAgentConfig(role as Parameters<typeof getAgentConfig>[0]))
  const ordered = orderedAgents(session)
  const dflt = defaultModel(session)

  switch (session.state) {
    case 'PENDING':
      return { type: 'state_change', state: 'ROUND_1' }

    case 'ROUND_1': {
      const done = new Set(session.transcriptEntries.filter((e) => e.round === 1).map((e) => e.agent))
      const remaining = agents.filter((a) => !done.has(a.name))
      const next = remaining[0]
      if (!next) return { type: 'state_change', state: 'ROUND_2' }
      return {
        type: 'run_agent',
        turnId: newTurnId(),
        agent: next.name,
        round: 1,
        model: modelForAgent(session, next.role),
        systemPrompt: composeSystemPrompt(next.role, 1, false, session.question),
        userPrompt: buildRoundUserPrompt(1, session.question, session.transcriptEntries)
      }
    }

    case 'ROUND_2': {
      const done = new Set(session.transcriptEntries.filter((e) => e.round === 2).map((e) => e.agent))
      const remaining = ordered.filter((a) => !done.has(a.name))
      const next = remaining[0]
      if (!next) return { type: 'state_change', state: 'ROUND_3' }
      const prior = session.transcriptEntries.filter((e) => e.round <= 1)
      return {
        type: 'run_agent',
        turnId: newTurnId(),
        agent: next.name,
        round: 2,
        model: modelForAgent(session, next.role),
        systemPrompt: composeSystemPrompt(next.role, 2, false, session.question),
        userPrompt: buildRoundUserPrompt(2, session.question, prior)
      }
    }

    case 'ROUND_3': {
      const done = new Set(session.transcriptEntries.filter((e) => e.round === 3).map((e) => e.agent))
      const remaining = ordered.filter((a) => !done.has(a.name))
      const next = remaining[0]
      const synthesizer = agents.find((a) => a.role === 'synthesizer')
      if (!next) {
        if (!synthesizer) return { type: 'terminal', terminal_state: 'SPARRING_COMPLETE' }
        return { type: 'state_change', state: 'CONCLUDING' }
      }
      const prior = session.transcriptEntries.filter((e) => e.round <= 2)
      return {
        type: 'run_agent',
        turnId: newTurnId(),
        agent: next.name,
        round: 3,
        model: modelForAgent(session, next.role),
        systemPrompt: composeSystemPrompt(next.role, 3, false, session.question),
        userPrompt: buildRoundUserPrompt(3, session.question, prior)
      }
    }

    case 'CONCLUDING': {
      const synthesizer = agents.find((a) => a.role === 'synthesizer')
      const model = synthesizer ? modelForAgent(session, synthesizer.role) : dflt
      return {
        type: 'run_conclusion',
        turnId: newTurnId(),
        phase: 'synthesize',
        model,
        systemPrompt: CONCLUSION_MODE_PROMPT,
        userPrompt: buildSynthesizerUserPrompt(session.question, session.agents, session.transcriptEntries),
        expected: 'json'
      }
    }

    case 'AUDITING': {
      const draftRaw = session.conclusion?.revisedJson ?? session.conclusion?.originalJson
      if (!draftRaw) return { type: 'terminal', terminal_state: 'UNCONVERGED' }
      const draft = draftRaw as Record<string, unknown>
      const isReaudit = !!session.conclusion?.revisedJson
      return {
        type: 'run_conclusion',
        turnId: newTurnId(),
        phase: isReaudit ? 'reaudit' : 'audit',
        model: dflt,
        systemPrompt: BLIND_CRITIC_PROMPT,
        userPrompt: buildAuditUserPrompt(session.question, draft),
        expected: 'verdict'
      }
    }

    case 'REVISING': {
      const original = session.conclusion?.originalJson as Record<string, unknown> | undefined
      const verdict = session.conclusion?.criticVerdict ?? ''
      if (!original) return { type: 'terminal', terminal_state: 'UNCONVERGED' }
      return {
        type: 'run_conclusion',
        turnId: newTurnId(),
        phase: 'revise',
        model: dflt,
        systemPrompt: REVISION_MODE_PROMPT(verdict),
        userPrompt: buildRevisionUserPrompt(original, verdict),
        expected: 'json'
      }
    }

    case 'TERMINAL':
      return {
        type: 'terminal',
        terminal_state: (session.terminalState ?? 'UNCONVERGED') as TerminalStateValue
      }

    default:
      return { type: 'done' }
  }
}

type TerminalStateValue = 'CLEAN' | 'REVISED' | 'UNCONVERGED' | 'SPARRING_COMPLETE'
