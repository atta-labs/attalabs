import { describe, expect, it } from 'vitest'
import { type ApiKeyMap, collectRequiredProviders, hasProviderKey, missingProviders } from './keymap'

describe('keymap', () => {
  it('collectRequiredProviders dedupes across model configs', () => {
    const got = collectRequiredProviders([
      { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
      { provider: 'openai', modelId: 'gpt-4.1' },
      { provider: 'anthropic', modelId: 'claude-haiku' }
    ])
    expect(got).toEqual(new Set(['anthropic', 'openai']))
  })

  it('hasProviderKey is true only for non-empty string', () => {
    const km: ApiKeyMap = { anthropic: 'sk-ant-xxx', openai: '' }
    expect(hasProviderKey(km, 'anthropic')).toBe(true)
    expect(hasProviderKey(km, 'openai')).toBe(false)
    expect(hasProviderKey(km, 'google')).toBe(false)
  })

  it('missingProviders returns providers not in the keymap', () => {
    const km: ApiKeyMap = { anthropic: 'sk-ant-xxx' }
    const required = new Set<'anthropic' | 'openai' | 'google'>(['anthropic', 'openai'])
    expect(missingProviders(km, required)).toEqual(['openai'])
  })
})
