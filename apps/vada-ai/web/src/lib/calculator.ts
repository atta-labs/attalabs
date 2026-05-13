import type { Flow } from '@atta/engine'
import { detectShape } from './flow-helpers'

export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.5-pro': { input: 1.25, output: 5.0 },
  'grok-3': { input: 5.0, output: 15.0 }
}

export const CALCULATOR_MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'grok-3', label: 'Grok 3' }
] as const

export const BRIEF_TOKENS = 800
export const SYSTEM_PROMPT_TOKENS = 500

const OUTPUT_TOKENS = {
  reviewer: { low: 400, high: 1200 },
  roundAgent: { low: 500, high: 1500 },
  synthesizer: { low: 800, high: 2000 },
  auditor: { low: 200, high: 600 }
} as const

export interface StepEstimate {
  name: string
  role: 'reviewer' | 'roundAgent' | 'synthesizer' | 'auditor'
  inputLow: number
  inputHigh: number
  outputLow: number
  outputHigh: number
}

export interface CalculatorResult {
  stepCount: number
  agentCount: number
  steps: StepEstimate[]
  inputTokens: { low: number; high: number }
  outputTokens: { low: number; high: number }
  cost: { low: number; high: number }
}

function roundAgentInput(roundIndex: number, roundAgentCount: number): { low: number; high: number } {
  const priorContextLow = roundIndex * roundAgentCount * OUTPUT_TOKENS.roundAgent.low
  const priorContextHigh = roundIndex * roundAgentCount * OUTPUT_TOKENS.roundAgent.high
  return {
    low: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + priorContextLow,
    high: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + priorContextHigh
  }
}

function synthInput(roundCount: number, agentCount: number): { low: number; high: number } {
  const allLow = roundCount * agentCount * OUTPUT_TOKENS.roundAgent.low
  const allHigh = roundCount * agentCount * OUTPUT_TOKENS.roundAgent.high
  return {
    low: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + allLow,
    high: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + allHigh
  }
}

export function calculateCost(flow: Flow, modelId: string): CalculatorResult {
  const steps: StepEstimate[] = []
  const prices = MODEL_PRICES[modelId] ?? MODEL_PRICES['claude-sonnet-4-6']!
  const shape = detectShape(flow)

  if (shape === 'rounds-audit') {
    const debateRound = flow.rounds[0]!
    const auditRoundIdx = flow.rounds.findIndex((r) => r.onFailure?.action === 'revise')
    const synthRound = flow.rounds[auditRoundIdx - 1]
    const auditRound = flow.rounds[auditRoundIdx]!

    const roundCount = debateRound.repeats ?? 1
    const agentCount = debateRound.agents.length

    for (let ri = 0; ri < roundCount; ri++) {
      for (const agent of debateRound.agents) {
        const input = roundAgentInput(ri, agentCount)
        steps.push({
          name: `${agent.name} (round ${ri + 1})`,
          role: 'roundAgent',
          inputLow: input.low,
          inputHigh: input.high,
          outputLow: OUTPUT_TOKENS.roundAgent.low,
          outputHigh: OUTPUT_TOKENS.roundAgent.high
        })
      }
    }

    const synthInp = synthInput(roundCount, agentCount)
    const synthAgentName = synthRound?.agents[0]?.name ?? 'Synthesizer'
    steps.push({
      name: synthAgentName,
      role: 'synthesizer',
      inputLow: synthInp.low,
      inputHigh: synthInp.high,
      outputLow: OUTPUT_TOKENS.synthesizer.low,
      outputHigh: OUTPUT_TOKENS.synthesizer.high
    })

    for (const agent of auditRound.agents) {
      steps.push({
        name: agent.name,
        role: 'auditor',
        inputLow: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + OUTPUT_TOKENS.synthesizer.low,
        inputHigh: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + OUTPUT_TOKENS.synthesizer.high,
        outputLow: OUTPUT_TOKENS.auditor.low,
        outputHigh: OUTPUT_TOKENS.auditor.high
      })
    }

    const agentCount2 = debateRound.agents.length
    const inputLow = steps.reduce((sum, s) => sum + s.inputLow, 0)
    const inputHigh = steps.reduce((sum, s) => sum + s.inputHigh, 0)
    const outputLow = steps.reduce((sum, s) => sum + s.outputLow, 0)
    const outputHigh = steps.reduce((sum, s) => sum + s.outputHigh, 0)
    const costLow = (inputLow * prices.input + outputLow * prices.output) / 1_000_000
    const costHigh = (inputHigh * prices.input + outputHigh * prices.output) / 1_000_000
    return {
      stepCount: steps.length,
      agentCount: agentCount2,
      steps,
      inputTokens: { low: inputLow, high: inputHigh },
      outputTokens: { low: outputLow, high: outputHigh },
      cost: { low: costLow, high: costHigh }
    }
  }

  if (shape === 'brokered-no-synth' || shape === 'brokered-synth') {
    const reviewRound = flow.rounds[0]!

    for (const agent of reviewRound.agents) {
      steps.push({
        name: agent.name,
        role: 'reviewer',
        inputLow: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS,
        inputHigh: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS,
        outputLow: OUTPUT_TOKENS.reviewer.low,
        outputHigh: OUTPUT_TOKENS.reviewer.high
      })
    }

    if (shape === 'brokered-synth') {
      const synthRound = flow.rounds[flow.rounds.length - 1]!
      const reviewerOutputLow = reviewRound.agents.length * OUTPUT_TOKENS.reviewer.low
      const reviewerOutputHigh = reviewRound.agents.length * OUTPUT_TOKENS.reviewer.high
      steps.push({
        name: synthRound.agents[0]!.name,
        role: 'synthesizer',
        inputLow: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + reviewerOutputLow,
        inputHigh: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS + reviewerOutputHigh,
        outputLow: OUTPUT_TOKENS.synthesizer.low,
        outputHigh: OUTPUT_TOKENS.synthesizer.high
      })
    }

    const agentCount = reviewRound.agents.length + (shape === 'brokered-synth' ? 1 : 0)
    const inputLow = steps.reduce((sum, s) => sum + s.inputLow, 0)
    const inputHigh = steps.reduce((sum, s) => sum + s.inputHigh, 0)
    const outputLow = steps.reduce((sum, s) => sum + s.outputLow, 0)
    const outputHigh = steps.reduce((sum, s) => sum + s.outputHigh, 0)
    const costLow = (inputLow * prices.input + outputLow * prices.output) / 1_000_000
    const costHigh = (inputHigh * prices.input + outputHigh * prices.output) / 1_000_000
    return {
      stepCount: steps.length,
      agentCount,
      steps,
      inputTokens: { low: inputLow, high: inputHigh },
      outputTokens: { low: outputLow, high: outputHigh },
      cost: { low: costLow, high: costHigh }
    }
  }

  // solo
  steps.push({
    name: flow.agents[0]?.name ?? 'Agent',
    role: 'roundAgent',
    inputLow: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS,
    inputHigh: BRIEF_TOKENS + SYSTEM_PROMPT_TOKENS,
    outputLow: OUTPUT_TOKENS.roundAgent.low,
    outputHigh: OUTPUT_TOKENS.roundAgent.high
  })

  const inputLow = steps.reduce((sum, s) => sum + s.inputLow, 0)
  const inputHigh = steps.reduce((sum, s) => sum + s.inputHigh, 0)
  const outputLow = steps.reduce((sum, s) => sum + s.outputLow, 0)
  const outputHigh = steps.reduce((sum, s) => sum + s.outputHigh, 0)
  const costLow = (inputLow * prices.input + outputLow * prices.output) / 1_000_000
  const costHigh = (inputHigh * prices.input + outputHigh * prices.output) / 1_000_000
  return {
    stepCount: steps.length,
    agentCount: 1,
    steps,
    inputTokens: { low: inputLow, high: inputHigh },
    outputTokens: { low: outputLow, high: outputHigh },
    cost: { low: costLow, high: costHigh }
  }
}
