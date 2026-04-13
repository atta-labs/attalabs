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

const MOCK_MODE = true

// ── Mock response bank ────────────────────────────────────────────────────────
// Realistic, role-specific responses that simulate a real VC funding deliberation.
// These responses demonstrate the product's value: distinct voices, genuine friction,
// reframes, and a decisive conclusion.

const MOCK_RESPONSES: Record<string, Record<number, string>> = {
  Strategist: {
    1: `The opportunity here is significant but misunderstood. A $5M valuation on $36k/year revenue is a 139x revenue multiple — the VC is betting on trajectory, not current performance. With $500k you could hire two engineers, invest in marketing, and potentially reach $30k/month within 12 months. The path forward: take the money only if you have a specific, concrete plan to deploy that capital in the next 6 months. If you'd put it in a savings account "just in case," decline — you're selling 10% of your company for a safety net you don't need.`,
    2: `[TARGET: Critic] You're right that the valuation is aggressive, but you're wrong about why. The VC isn't valuing your current revenue — they're valuing the category and your position in it. Early SaaS valuations are always disconnected from revenue. The question isn't whether 139x is "fair" — it's whether this is the last time you'll be offered money at terms this favorable. If the product works and grows, Series A will dilute you far more. This might be the cheapest capital you'll ever raise.`,
    3: `[TARGET: Devil's Advocate] You've made the strongest point in this room. The question isn't "take or don't take" — it's "what would you do with $500k that you can't do with $3k/month?" If the answer is "hire" then take it. If the answer is "I don't know" then don't. The capital must have a job before it arrives. I'm revising my position: the recommendation should be conditional on having a deployment plan, not on the valuation math.`
  },
  Critic: {
    1: `The math doesn't work in your favor. $3k/month is $36k/year. A $5M valuation implies a 139x revenue multiple. For context, healthy SaaS companies trade at 5-15x annual revenue. This valuation assumes you'll grow 10-20x in the next 2-3 years. Can you? With $20k in savings and no team? The VC is either wildly optimistic or planning to install aggressive growth targets that will fundamentally change how you work. Before accepting, demand to see the growth expectations they've modeled. If they expect $1M ARR in 18 months, you need to know that before you sign.`,
    2: `[TARGET: Strategist] Your framing of "cheapest capital you'll ever raise" ignores the hidden costs. The 10% equity is the visible price. The invisible price is: board seats, reporting requirements, growth pressure, and the expectation of a liquidity event. Solo developers who take VC money stop being solo developers. You become an employee of your own company with a boss called "fiduciary duty to investors." The $500k isn't free money — it's a job offer with a $5M salary expectation attached.`,
    3: `[TARGET: Strategist] Your revised position is closer but still misses one thing: the $20k in savings IS the deployment plan for the next 6 months. At $3k/month revenue and minimal burn, this developer has 18+ months of runway without touching VC money. The urgency is artificial. My position: the answer is No, not because the deal is bad, but because there is no evidence of a growth bottleneck that $500k solves. You don't raise money to solve problems you don't have yet.`
  },
  "Devil's Advocate": {
    1: `Before we debate the terms, let's challenge the premise. Why do you need $500k? You have a working product making $3k/month. That's a profitable business. Not every business needs to be a venture-scale company. The VC offer implicitly assumes you want to scale aggressively — but do you? The question "should I take the money" assumes the money is the variable. The real question is: "what kind of company do I want to build?" If the answer is "a calm, profitable business I control completely," the VC offer is not just unnecessary — it's destructive. You'd be trading a lifestyle business for a growth treadmill.`,
    2: `[TARGET: Critic] You're focused on whether the deal is fair. I'm questioning whether any deal is right. This developer has something rare: a profitable product with no debt, no investors, no obligations. The moment they take VC money, that freedom disappears permanently. There is no "undo" button on a VC round. The question nobody in this room is asking: what's the cost of NOT raising money? If the product grows at $3k/month, it reaches $10k/month in 2-3 years organically. That's $120k/year from a product you fully own. Is $500k worth giving up 10% of that future forever?`,
    3: `The room has converged on a conditional "not yet" and I think that's correct, but for reasons nobody else has stated. The real risk isn't financial — it's identity. The moment you take VC money, you go from "person who built a cool thing" to "founder who must deliver returns." That identity shift changes every decision you make. You start optimizing for growth metrics instead of product quality. You hire to meet milestones instead of hiring when it's right. The $500k changes who you are, not just what you have. My final position: No. Not because the terms are bad, but because you haven't exhausted what you can do alone. Come back to this offer when your organic growth hits a ceiling you can name specifically.`
  },
  Synthesizer: {
    1: `The room has established three distinct positions. The Strategist sees an opportunity for acceleration but conditions it on having a deployment plan. The Critic questions the valuation math and warns about hidden costs beyond equity dilution. The Devil's Advocate challenges the premise entirely — questioning whether VC funding is the right instrument for this business at this stage. The key tension: the Strategist and Devil's Advocate disagree fundamentally about whether scale is the goal. This will need to be resolved before a recommendation can be made.`,
    2: `The friction has sharpened the positions. The Strategist has reframed the value proposition: this may be the cheapest capital the developer will ever access. The Critic counters that the hidden costs (control, reporting, growth pressure) make the capital more expensive than it appears. The Devil's Advocate has introduced a powerful reframe: the cost of NOT raising is potentially very low, since organic growth to $10k/month preserves 100% ownership. The emerging consensus: the answer is not "yes or no" but "not until you can name specifically what the money would do." The Critic and Devil's Advocate are converging on this position from different angles. The Strategist is moving toward it.`,
    3: `The room has reached a clear position with one remaining tension. Three agents converge on "Not yet" — but for different reasons. The Strategist says "not until you have a deployment plan." The Critic says "not until you have evidence of a growth bottleneck." The Devil's Advocate says "not until you've exhausted organic growth." The remaining disagreement: the Strategist believes the money should eventually be taken (when conditions are met), while the Devil's Advocate believes it may never be the right choice if the developer values independence over scale. This is an irreducible values-based disagreement, not a factual one.`
  },
  Researcher: {
    1: 'Key data points for this decision: The median SaaS company at $36k ARR raises at a 10-30x revenue multiple, not 139x. However, pre-seed valuations in 2024-2026 have inflated significantly — a $5M cap on a SAFE is not uncommon for solo developers with traction. The 10% dilution is relatively founder-friendly; typical seed rounds dilute 15-25%. However, 67% of VC-backed companies never return capital to investors, and the median time to exit is 7-10 years. The developer should also consider: what percentage of solo-developer SaaS businesses successfully scale past $10k MRR with VC funding versus without it? The data suggests that product-market fit, not capital, is the primary bottleneck at this stage.',
    2: `[TARGET: Strategist] Your claim that "this might be the cheapest capital" needs grounding. Data from Carta shows that seed-stage companies that wait 6-12 months to raise after initial traction consistently achieve 30-50% higher valuations. If this developer grows from $3k to $8k/month organically, the same VC would likely offer $500k at an $8-12M valuation — meaning less dilution for the same capital. The "take it now before it disappears" framing is not supported by market data for companies with demonstrated product-market fit.`,
    3: `[TARGET: Devil's Advocate] Your argument about organic growth to $10k/month in 2-3 years may be optimistic without data on the developer's specific market and growth rate. However, the broader point holds: SaaS businesses with strong unit economics and low churn can compound effectively without external capital. The key metric the developer should track before deciding: customer acquisition cost (CAC) relative to lifetime value (LTV). If the ratio is favorable, organic growth is sustainable. If CAC is rising, the business may need capital to acquire customers before competitors do.`
  },
  Operator: {
    1: `Let's talk execution reality. $500k sounds like a lot, but in practice: two mid-level engineers cost $250-350k/year fully loaded. A basic marketing budget for SaaS is $5-10k/month. Office/tools/infrastructure runs $2-5k/month. That $500k is 12-15 months of runway with a small team — not the infinite war chest it appears to be. The developer needs to ask: can I achieve my growth milestones in 12-15 months? If not, you'll be raising again before you've proven the model, and the next round will be harder. Also critical: the developer is currently solo. Going from solo to managing 2-3 people is the hardest transition in a startup. The $500k funds the team, but who manages the team while also building the product?`,
    2: `[TARGET: Strategist] Your "hire two engineers" plan has a critical dependency: the developer must become a manager. This is a non-trivial skill transition that typically takes 6-12 months to learn, during which product velocity often decreases. The first hire for a solo developer should arguably be a senior engineer who can own a workstream independently — not two juniors who need supervision. Budget reality: one senior engineer ($150-180k) plus marketing spend ($60k/year) plus tools ($20k) = $250-260k. That gives you roughly 20 months at controlled burn. Much safer than the 12-15 months with two hires.`,
    3: `The room is converging on "not yet" and the execution math supports this. The developer's current burn rate is effectively $0 — the product is profitable and self-sustaining. Any VC investment starts a burn clock that doesn't currently exist. The operational recommendation: before taking any money, the developer should run a 90-day experiment using $5k of the $20k savings to test paid acquisition. If the economics work (CAC < 3-month LTV), that's the evidence needed to take VC money with a clear deployment plan. If they don't work, the VC money won't fix it — it'll just burn faster.`
  }
}

const MOCK_CONCLUSION = {
  recommendation:
    "Not yet — do not take the VC money today. The $500k solves a problem you haven't proven you have. Before accepting, run a 90-day growth experiment using $5k of your savings to test paid acquisition. If customer acquisition economics work (CAC < 3-month LTV), return to the VC with a specific deployment plan and negotiate from a position of evidence, not hope. If the economics don't work, the VC money would only burn faster without fixing the underlying growth question.",
  key_condition:
    'The developer must determine whether there is a specific, nameable growth bottleneck that $500k would solve — not a theoretical one, but one demonstrated by a failed attempt to grow organically.',
  unresolved_points: [
    {
      point:
        "Whether the VC offer should eventually be accepted (Strategist) or whether organic growth is permanently preferable (Devil's Advocate). This is a values-based disagreement about what kind of company the developer wants to build.",
      agents_involved: ['Strategist', "Devil's Advocate"]
    },
    {
      point:
        "Whether the $5M valuation is favorable (Strategist: cheapest capital you'll raise) or irrelevant (Critic: hidden costs exceed the equity price). Both positions have merit depending on the developer's growth ambitions.",
      agents_involved: ['Strategist', 'Critic']
    }
  ],
  review_by: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  participants: [
    { agent: 'Strategist', version: 'v1' },
    { agent: 'Critic', version: 'v1' },
    { agent: "Devil's Advocate", version: 'v1' },
    { agent: 'Synthesizer', version: 'v1' }
  ]
}

// ── Mock timing ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Simulate word-by-word streaming at a readable pace
const WORD_DELAY_MS = 40
// Simulate "thinking" before speaking
const THINK_DELAY_MS = 1500

// ── Mock agents ───────────────────────────────────────────────────────────────

class MockDeliberationAgent {
  id: string
  name: string

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  async generate(prompt: string, _options?: unknown) {
    await sleep(THINK_DELAY_MS + Math.random() * 2000)
    // Determine round from prompt context
    const round = this.detectRound(prompt)
    const text =
      MOCK_RESPONSES[this.name]?.[round] ??
      `As the ${this.name}, I've analyzed the situation and believe we need to consider multiple factors before reaching a conclusion.`
    return { text }
  }

  async stream(prompt: string, _options?: unknown) {
    const round = this.detectRound(prompt)
    const text =
      MOCK_RESPONSES[this.name]?.[round] ??
      `As the ${this.name}, I've analyzed the current state of the deliberation and have identified key considerations that the room should address.`
    const words = text.split(' ')

    return {
      fullStream: (async function* () {
        await sleep(THINK_DELAY_MS)
        for (const word of words) {
          await sleep(WORD_DELAY_MS + Math.random() * 20)
          yield { type: 'text-delta' as const, payload: { text: `${word} ` } }
        }
      })()
    }
  }

  private detectRound(prompt: string): number {
    if (prompt.includes('Round 3') || prompt.includes('round 3')) return 3
    if (prompt.includes('Round 2') || prompt.includes('round 2')) return 2
    if (prompt.includes('transcript so far')) return 2
    return 1
  }
}

class MockConclusionAgent {
  async generate(_prompt: string, _options?: unknown) {
    await sleep(3000)
    return { text: JSON.stringify(MOCK_CONCLUSION, null, 2) }
  }
}

class MockBlindCriticAgent {
  async generate(_prompt: string, _options?: unknown) {
    await sleep(2000)
    return { text: 'PASS' }
  }
}

// ── Provider factory (real mode) ──────────────────────────────────────────────

function getDefaultModelConfig(): ModelConfig {
  const provider = (process.env.DEFAULT_PROVIDER ?? 'groq') as Provider
  return {
    provider,
    modelId: process.env.DEFAULT_MODEL_ID ?? DEFAULT_MODEL_IDS[provider] ?? 'llama-3.3-70b-versatile'
  }
}

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

// ── Pre-flight validation ─────────────────────────────────────────────────────

type ProbeResult = { ok: boolean; error?: string }

export function estimateDeliberationTokens(agentCount: number): number {
  const perRound = agentCount * (600 + 1200 + 2000)
  const conclusion = 4000
  return Math.ceil((perRound + conclusion) * 1.25)
}

async function probeRaw(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  provider: string
): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    })
    if (res.ok) return { ok: true }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const msg =
      (json?.error as { message?: string } | undefined)?.message ??
      (json?.message as string | undefined) ??
      `HTTP ${res.status}`
    if (/quota|rate.?limit|exceeded|TPD|TPM/i.test(msg))
      return { ok: false, error: 'Rate limit or quota exceeded. Try again later or upgrade your plan.' }
    if (res.status === 401 || res.status === 403 || /invalid.*key|api.?key|auth/i.test(msg))
      return { ok: false, error: 'Invalid API key. Please check your credentials.' }
    if (res.status === 404 || /model.*not.*found|does not exist/i.test(msg))
      return { ok: false, error: `Model not found. Check the model ID for ${provider}.` }
    return { ok: false, error: msg }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function validateModelConfig(config: ModelConfig): Promise<ProbeResult> {
  if (MOCK_MODE) return { ok: true }

  const { provider, modelId, apiKey } = config

  switch (provider) {
    case 'groq':
      return probeRaw(
        'https://api.groq.com/openai/v1/chat/completions',
        { Authorization: `Bearer ${apiKey ?? process.env.GROQ_API_KEY}` },
        { model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 800, stop: ['\n'] },
        provider
      )
    case 'anthropic':
      return probeRaw(
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': apiKey ?? process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
        { model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 800, stop_sequences: ['\n'] },
        provider
      )
    case 'google':
      return probeRaw(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
        {},
        { contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 800, stopSequences: ['\n'] } },
        provider
      )
    case 'openrouter':
      return probeRaw(
        'https://openrouter.ai/api/v1/chat/completions',
        { Authorization: `Bearer ${apiKey ?? process.env.OPENROUTER_API_KEY}` },
        { model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 800, stop: ['\n'] },
        provider
      )
  }
}

// ── Public factory functions ───────────────────────────────────────────────────

export function createDeliberationAgent(
  config: AgentConfig,
  systemPrompt: string,
  modelConfig: ModelConfig = getDefaultModelConfig()
): Agent {
  if (MOCK_MODE) {
    return new MockDeliberationAgent(`deliberation-${config.role}`, config.name) as unknown as Agent
  }
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
  return new Agent({
    id: 'blind-critic-agent',
    name: 'Blind Critic',
    instructions: systemPrompt,
    model: resolveModel(modelConfig) as any
  })
}
