import { Agent } from '@mastra/core/agent'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { AgentConfig } from '../schemas'
import type { ModelConfig, Provider } from '../lib/models'
import { DEFAULT_MODEL_IDS } from '../lib/models'

// ── MOCK MODE ─────────────────────────────────────────────────────────────────
// Set to true for UI simulation/testing (zero API calls).
// Set to false to use real LLMs.

const MOCK_MODE = false

// Switch providers instantly via env var:
//   DEFAULT_PROVIDER=groq     → Llama 3.3 70B (free)
//   DEFAULT_PROVIDER=google   → Gemini 2.0 Flash (free)
//   DEFAULT_PROVIDER=anthropic → Claude Sonnet
//   DEFAULT_PROVIDER=openrouter → any model via OpenRouter

function getDefaultModelConfig(): ModelConfig {
  const provider = (process.env.DEFAULT_PROVIDER ?? 'groq') as Provider
  return {
    provider,
    modelId: process.env.DEFAULT_MODEL_ID ?? DEFAULT_MODEL_IDS[provider] ?? 'llama-3.3-70b-versatile'
  }
}

// ── Provider factory ──────────────────────────────────────────────────────────

function resolveModel(config: ModelConfig) {
  const { provider, modelId, apiKey } = config
  switch (provider) {
    case 'groq':
      return createGroq({ apiKey: apiKey ?? process.env.GROQ_API_KEY })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey: apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY })(modelId)
    case 'anthropic':
      return createAnthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey: apiKey ?? process.env.OPENROUTER_API_KEY })(modelId)
  }
}

// ── Mock agents ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class MockDeliberationAgent {
  id: string
  name: string

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  async generate(_prompt: string, _options?: unknown) {
    const thinkingTime = 2000 + Math.random() * 2000
    await sleep(thinkingTime)
    return {
      text: `[Round 1] As the ${this.name}, I've analyzed the initial prompt. My position is that we must prioritize long-term scalability over immediate feature parity.`
    }
  }

  async stream(_prompt: string, _options?: unknown) {
    const name = this.name
    let targetTag = ''
    if (name === 'Critic') targetTag = '[TARGET: Strategist] '
    else if (name === "Devil's Advocate") targetTag = '[TARGET: Critic] '
    else if (name === 'Synthesizer') targetTag = '[TARGET: Strategist] '
    else targetTag = '[TARGET: Critic] '

    const text = `${targetTag}I am responding as the ${name}. I believe the current trajectory ignores critical infrastructure risks. We need to re-evaluate the friction points mentioned earlier.`
    const words = text.split(' ')

    return {
      fullStream: (async function* () {
        await sleep(1200)
        for (const word of words) {
          await sleep(70)
          yield { type: 'text-delta', payload: { text: `${word} ` } }
        }
      })()
    }
  }
}

class MockConclusionAgent {
  async generate(_prompt: string, _options?: unknown) {
    await sleep(3000)
    const fakeJson = {
      recommendation: 'Focus on establishing a robust web-first architecture before scaling to mobile.',
      key_condition: 'Technical debt remains below the 15% threshold.',
      unresolved_points: [
        { point: 'Resource allocation between platform and feature teams.', agents_involved: ['Strategist', 'Critic'] }
      ],
      review_by: '2026-06-01',
      participants: [
        { agent: 'Strategist', version: 'v1' },
        { agent: 'Critic', version: 'v1' }
      ]
    }
    return { text: `\`\`\`json\n${JSON.stringify(fakeJson)}\n\`\`\`` }
  }
}

class MockBlindCriticAgent {
  async generate(_prompt: string, _options?: unknown) {
    await sleep(2000)
    return { text: 'PASS' }
  }
}

// ── Public factory functions ───────────────────────────────────────────────────
// modelConfig is optional — falls back to DEFAULT_PROVIDER env var (default: groq).
// Phase 2 will pass it explicitly from the API route per-session.

export function createDeliberationAgent(
  config: AgentConfig,
  systemPrompt: string,
  modelConfig: ModelConfig = getDefaultModelConfig()
): Agent {
  if (MOCK_MODE) {
    return new MockDeliberationAgent(`deliberation-${config.role}`, config.name) as unknown as Agent
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Agent({
    id: `deliberation-${config.role}`,
    name: config.name,
    instructions: systemPrompt,
    model: resolveModel(modelConfig) as any
  })
}

export function createConclusionAgent(systemPrompt: string, modelConfig: ModelConfig = getDefaultModelConfig()): Agent {
  if (MOCK_MODE) {
    return new MockConclusionAgent() as unknown as Agent
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Agent({
    id: 'conclusion-agent',
    name: 'Conclusion',
    instructions: systemPrompt,
    model: resolveModel(modelConfig) as any
  })
}

export function createBlindCriticAgent(
  systemPrompt: string,
  modelConfig: ModelConfig = getDefaultModelConfig()
): Agent {
  if (MOCK_MODE) {
    return new MockBlindCriticAgent() as unknown as Agent
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Agent({
    id: 'blind-critic-agent',
    name: 'Blind Critic',
    instructions: systemPrompt,
    model: resolveModel(modelConfig) as any
  })
}
