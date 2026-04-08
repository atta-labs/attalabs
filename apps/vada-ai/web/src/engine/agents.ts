import { Agent } from '@mastra/core/agent'
import type { AgentConfig } from '../schemas'

const MODEL = 'anthropic/claude-sonnet-4-5'

/**
 * TOGGLE MOCK_MODE
 * Set to true for UI simulation/testing.
 * Set to false to use real Anthropic models.
 */
const MOCK_MODE = true

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class MockDeliberationAgent {
  id: string
  name: string

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  // Round 1: Parallel thinking
  async generate(_prompt: string, _options?: any) {
    // Randomize thinking time (2-4 seconds) so they don't finish at the same time
    const thinkingTime = 2000 + Math.random() * 2000
    await sleep(thinkingTime)

    return {
      text: `[Round 1] As the ${this.name}, I've analyzed the initial prompt. My position is that we must prioritize long-term scalability over immediate feature parity.`
    }
  }

  // Rounds 2 & 3: Sequential streaming
  async stream(_prompt: string, _options?: any) {
    const name = this.name

    // Assign logic-based targets to test the Canvas connection lines
    let targetTag = ''
    if (name === 'Critic') targetTag = '[TARGET: Strategist] '
    else if (name === "Devil's Advocate") targetTag = '[TARGET: Critic] '
    else if (name === 'Synthesizer') targetTag = '[TARGET: Strategist] '
    else targetTag = '[TARGET: Critic] '

    const text = `${targetTag}I am responding as the ${name}. I believe the current trajectory ignores critical infrastructure risks. We need to re-evaluate the friction points mentioned earlier.`
    const words = text.split(' ')

    return {
      fullStream: (async function* () {
        // "Thinking" pause before the first word appears
        await sleep(1200)
        for (const word of words) {
          await sleep(70) // Simulated typing speed
          yield { type: 'text-delta', payload: { text: `${word} ` } }
        }
      })()
    }
  }
}

class MockConclusionAgent {
  async generate(_prompt: string, _options?: any) {
    await sleep(3000) // Synthesizer drafting...
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
  async generate(_prompt: string, _options?: any) {
    await sleep(2000) // Blind Critic auditing...
    return { text: 'PASS' }
  }
}

export function createDeliberationAgent(config: AgentConfig, systemPrompt: string): Agent {
  if (MOCK_MODE) {
    return new MockDeliberationAgent(`deliberation-${config.role}`, config.name) as unknown as Agent
  }
  return new Agent({
    id: `deliberation-${config.role}`,
    name: config.name,
    instructions: systemPrompt,
    model: MODEL
  })
}

export function createConclusionAgent(systemPrompt: string): Agent {
  if (MOCK_MODE) {
    return new MockConclusionAgent() as unknown as Agent
  }
  return new Agent({
    id: 'conclusion-agent',
    name: 'Conclusion',
    instructions: systemPrompt,
    model: MODEL
  })
}

export function createBlindCriticAgent(systemPrompt: string): Agent {
  if (MOCK_MODE) {
    return new MockBlindCriticAgent() as unknown as Agent
  }
  return new Agent({
    id: 'blind-critic-agent',
    name: 'Blind Critic',
    instructions: systemPrompt,
    model: MODEL
  })
}
