import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createMultiVendorLlmCall, createDefaultLlmCall } from './llm'

// Minimal params — routing is tested before any network call is made
const baseParams = {
  agent: { name: 'TestAgent', description: '', systemPrompt: 'test' },
  systemPrompt: 'system',
  userPrompt: 'user'
}

// Stash and clear all provider env vars so routing tests are deterministic
const savedEnvVars: Record<string, string | undefined> = {}
const PROVIDER_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'OPENAI_API_KEY',
  'XAI_API_KEY',
  'GROQ_API_KEY',
  'DEEPSEEK_API_KEY',
  'MISTRAL_API_KEY'
]

beforeAll(() => {
  for (const key of PROVIDER_ENV_VARS) {
    savedEnvVars[key] = process.env[key]
    delete process.env[key]
  }
})

afterAll(() => {
  for (const key of PROVIDER_ENV_VARS) {
    if (savedEnvVars[key] !== undefined) {
      process.env[key] = savedEnvVars[key]
    }
  }
})

describe('createMultiVendorLlmCall — prefix routing', () => {
  it('throws for unknown model prefix with registry guidance', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'llama-3-70b' })).rejects.toThrow(
      "Unrecognized model 'llama-3-70b' for agent 'TestAgent'"
    )
  })

  it('routes claude-* to anthropic and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'claude-sonnet-4-6' })).rejects.toThrow(
      "No API key configured for vendor 'anthropic'"
    )
  })

  it('routes gemini-* to google and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'gemini-2.5-pro' })).rejects.toThrow(
      "No API key configured for vendor 'google'"
    )
  })

  it('routes gpt-* to openai and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'gpt-4o' })).rejects.toThrow("No API key configured for vendor 'openai'")
  })

  it('routes o4-* to openai and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'o4-mini' })).rejects.toThrow("No API key configured for vendor 'openai'")
  })

  it('routes grok-* to xai and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'grok-3' })).rejects.toThrow("No API key configured for vendor 'xai'")
  })

  it('routes deepseek-* to deepseek and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'deepseek-chat' })).rejects.toThrow(
      "No API key configured for vendor 'deepseek'"
    )
  })

  it('routes mistral-* to mistral and throws missing-key', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'mistral-small-latest' })).rejects.toThrow(
      "No API key configured for vendor 'mistral'"
    )
  })

  it('ollama routes without requiring a key (local-only vendor)', async () => {
    // Ollama is openai-compat + localOnly — no API key required; reaches network call
    // (will fail with connection refused, not missing-key)
    const fn = createMultiVendorLlmCall({})
    const err = await fn({ ...baseParams, model: 'llama3.3' }).catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).not.toMatch(/No API key configured/)
  })

  it('uses provided key and does not fall through to env var for other vendors', async () => {
    const fn = createMultiVendorLlmCall({ anthropic: 'test-ak' })
    await expect(fn({ ...baseParams, model: 'gemini-2.0-flash' })).rejects.toThrow(
      "No API key configured for vendor 'google'"
    )
  })
})

describe('createMultiVendorLlmCall — agentVendorOverrides (cross-vendor dispatch)', () => {
  it('overrides prefix routing: deepseek-r1-distill-llama-70b via groq override', async () => {
    // Without override: deepseek-* → deepseek vendor → deepseek key missing
    const fnNoOverride = createMultiVendorLlmCall({})
    await expect(fnNoOverride({ ...baseParams, model: 'deepseek-r1-distill-llama-70b' })).rejects.toThrow(
      "No API key configured for vendor 'deepseek'"
    )

    // With agentVendorOverrides: same model string → groq vendor → groq key missing
    const fnWithOverride = createMultiVendorLlmCall({}, { TestAgent: 'groq' })
    await expect(fnWithOverride({ ...baseParams, model: 'deepseek-r1-distill-llama-70b' })).rejects.toThrow(
      "No API key configured for vendor 'groq'"
    )
  })

  it('applies override per agent name — different agents can use different vendors', async () => {
    const fn = createMultiVendorLlmCall({}, { CriticAgent: 'openai', StrategistAgent: 'groq' })
    await expect(
      fn({ ...baseParams, agent: { ...baseParams.agent, name: 'CriticAgent' }, model: 'any-model' })
    ).rejects.toThrow("No API key configured for vendor 'openai'")

    await expect(
      fn({ ...baseParams, agent: { ...baseParams.agent, name: 'StrategistAgent' }, model: 'any-model' })
    ).rejects.toThrow("No API key configured for vendor 'groq'")
  })

  it('falls through to prefix routing for agents not in overrides map', async () => {
    const fn = createMultiVendorLlmCall({}, { OtherAgent: 'groq' })
    // TestAgent not in overrides — uses prefix routing for claude-*
    await expect(fn({ ...baseParams, model: 'claude-sonnet-4-6' })).rejects.toThrow(
      "No API key configured for vendor 'anthropic'"
    )
  })
})

describe('createDefaultLlmCall — backward compatibility', () => {
  it('returns a callable LlmCallFn', () => {
    const fn = createDefaultLlmCall('test-key')
    expect(typeof fn).toBe('function')
  })

  it('throws missing-key for claude-* when no anthropic key is set', async () => {
    const fn = createDefaultLlmCall()
    await expect(fn({ ...baseParams, model: 'claude-haiku-4-5' })).rejects.toThrow(
      "No API key configured for vendor 'anthropic'"
    )
  })
})
