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
const PROVIDER_ENV_VARS = ['ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY']

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
  it('throws "unrecognized model prefix" for unknown model strings', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'llama-3-70b' })).rejects.toThrow(
      "Unrecognized model prefix: 'llama-3-70b'. Supported: claude-*, gemini-*, gpt-*, o4-*, grok-*"
    )
  })

  it('routes claude-* to Anthropic and throws missing-key error', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'claude-sonnet-4-6' })).rejects.toThrow(
      "No API key configured for provider 'anthropic' (model: claude-sonnet-4-6)"
    )
  })

  it('routes gemini-* to Google and throws missing-key error', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'gemini-2.5-pro' })).rejects.toThrow(
      "No API key configured for provider 'google' (model: gemini-2.5-pro)"
    )
  })

  it('routes gpt-* to OpenAI and throws missing-key error', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'gpt-4o' })).rejects.toThrow(
      "No API key configured for provider 'openai' (model: gpt-4o)"
    )
  })

  it('routes o4-* to OpenAI and throws missing-key error', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'o4-mini' })).rejects.toThrow(
      "No API key configured for provider 'openai' (model: o4-mini)"
    )
  })

  it('routes grok-* to xAI and throws missing-key error', async () => {
    const fn = createMultiVendorLlmCall({})
    await expect(fn({ ...baseParams, model: 'grok-3' })).rejects.toThrow(
      "No API key configured for provider 'xai' (model: grok-3)"
    )
  })

  it('uses the provided key and does not fall through to env var', async () => {
    // Providing only anthropic key — gemini call still throws missing-key (not using env var)
    const fn = createMultiVendorLlmCall({ anthropic: 'test-ak' })
    await expect(fn({ ...baseParams, model: 'gemini-2.0-flash' })).rejects.toThrow(
      "No API key configured for provider 'google'"
    )
  })
})

describe('createDefaultLlmCall — backward compatibility', () => {
  it('returns a callable LlmCallFn', () => {
    const fn = createDefaultLlmCall('test-key')
    expect(typeof fn).toBe('function')
  })

  it('throws missing-key error for claude-* when no anthropic key is set', async () => {
    const fn = createDefaultLlmCall()
    await expect(fn({ ...baseParams, model: 'claude-haiku-4-5' })).rejects.toThrow(
      "No API key configured for provider 'anthropic'"
    )
  })
})
