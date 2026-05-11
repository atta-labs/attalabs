import { describe, it, expect } from 'bun:test'
import { VENDORS, VENDOR_ORDER, resolveVendorByPrefix, isLocalOnly, type VendorId } from '@atta/models'

const VALID_SDK_SHAPES = ['openai-compat', 'anthropic', 'google-genai'] as const

describe('vendor registry — structural invariants', () => {
  it('every vendor has a valid sdkShape', () => {
    for (const [, vendor] of Object.entries(VENDORS)) {
      expect(VALID_SDK_SHAPES).toContain(vendor.sdkShape as string)
    }
  })

  it('every openai-compat vendor has a baseURL', () => {
    for (const [, vendor] of Object.entries(VENDORS)) {
      if (vendor.sdkShape === 'openai-compat') {
        expect(vendor.baseURL).toBeTruthy()
      }
    }
  })

  it('every vendor has an id that matches its key', () => {
    for (const [key, vendor] of Object.entries(VENDORS)) {
      expect(vendor.id).toBe(key)
    }
  })

  it('VENDOR_ORDER contains exactly the same set of ids as VENDORS', () => {
    const registryIds = new Set(Object.keys(VENDORS))
    const orderIds = new Set(VENDOR_ORDER)
    expect(registryIds).toEqual(orderIds)
  })

  it('non-local vendors have an envVar', () => {
    for (const [, vendor] of Object.entries(VENDORS)) {
      if (!vendor.localOnly) {
        expect(vendor.envVar).toBeTruthy()
      }
    }
  })
})

describe('resolveVendorByPrefix — model routing', () => {
  it('claude-* → anthropic', () => {
    expect(resolveVendorByPrefix('claude-sonnet-4-6')).toBe('anthropic')
    expect(resolveVendorByPrefix('claude-opus-4-7')).toBe('anthropic')
  })

  it('gemini-* → google', () => {
    expect(resolveVendorByPrefix('gemini-2.5-pro')).toBe('google')
    expect(resolveVendorByPrefix('gemini-2.0-flash')).toBe('google')
  })

  it('gpt-* → openai', () => {
    expect(resolveVendorByPrefix('gpt-4o')).toBe('openai')
  })

  it('o4-*, o3-*, o1-* → openai', () => {
    expect(resolveVendorByPrefix('o4-mini')).toBe('openai')
    expect(resolveVendorByPrefix('o3-mini')).toBe('openai')
    expect(resolveVendorByPrefix('o1-preview')).toBe('openai')
  })

  it('grok-* → xai', () => {
    expect(resolveVendorByPrefix('grok-3-mini')).toBe('xai')
  })

  it('deepseek-* → deepseek (prefix only; catalog overrides for cross-vendor models)', () => {
    expect(resolveVendorByPrefix('deepseek-chat')).toBe('deepseek')
    // deepseek-r1-distill-llama-70b has deepseek prefix → resolves to deepseek here
    // but catalog lookup (agentVendorOverrides) correctly returns groq
    expect(resolveVendorByPrefix('deepseek-r1-distill-llama-70b')).toBe('deepseek')
  })

  it('mistral-*, codestral-* → mistral', () => {
    expect(resolveVendorByPrefix('mistral-small-latest')).toBe('mistral')
    expect(resolveVendorByPrefix('codestral-2501')).toBe('mistral')
  })

  it('returns null for unprefixed models (groq-hosted llama, together, fireworks, etc.)', () => {
    expect(resolveVendorByPrefix('llama-3-70b')).toBeNull()
    expect(resolveVendorByPrefix('accounts/fireworks/models/llama-v3')).toBeNull()
    expect(resolveVendorByPrefix('unknown-model')).toBeNull()
  })
})

describe('isLocalOnly', () => {
  it('ollama is local-only', () => {
    expect(isLocalOnly('ollama')).toBe(true)
  })

  it('all other vendors are not local-only', () => {
    const nonLocal = VENDOR_ORDER.filter((id) => id !== 'ollama') as VendorId[]
    for (const id of nonLocal) {
      expect(isLocalOnly(id)).toBe(false)
    }
  })
})
