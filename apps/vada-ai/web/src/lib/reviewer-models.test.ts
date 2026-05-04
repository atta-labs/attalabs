import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  clearReviewerConfig,
  getReviewerConfig,
  resolveVendor,
  setReviewerConfig,
  validateKeysForConfig
} from './reviewer-models'

// ── localStorage mock (Node/Bun has no DOM) ──────────────────────────────────
const store = new Map<string, string>()
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
  get length() {
    return store.size
  },
  key: (i: number) => [...store.keys()][i] ?? null
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: false })
// ─────────────────────────────────────────────────────────────────────────────

const SPEC_ID = 'test-spec'

beforeEach(() => {
  store.clear()
})

afterEach(() => {
  store.clear()
})

describe('resolveVendor', () => {
  test('returns anthropic for claude- prefix', () => {
    expect(resolveVendor('claude-3-5-sonnet-20241022')).toBe('anthropic')
  })

  test('returns google for gemini- prefix', () => {
    expect(resolveVendor('gemini-2.5-pro')).toBe('google')
  })

  test('returns openai for gpt- and o4- prefixes', () => {
    expect(resolveVendor('gpt-4o')).toBe('openai')
    expect(resolveVendor('o4-mini')).toBe('openai')
  })

  test('returns null for unknown model prefix', () => {
    expect(resolveVendor('unknown-model-xyz')).toBeNull()
  })
})

describe('validateKeysForConfig', () => {
  test('returns true when all models have configured providers', () => {
    const config = { Reviewer1: 'claude-3-5-sonnet-20241022', Reviewer2: 'gemini-2.5-pro' }
    expect(validateKeysForConfig(config, ['anthropic', 'google'])).toBe(true)
  })

  test('returns false when a provider is missing', () => {
    const config = { Reviewer1: 'claude-3-5-sonnet-20241022', Reviewer2: 'gemini-2.5-pro' }
    expect(validateKeysForConfig(config, ['anthropic'])).toBe(false)
  })

  test('returns false when a model vendor is unrecognised', () => {
    const config = { Reviewer1: 'unknown-model-xyz' }
    expect(validateKeysForConfig(config, ['anthropic', 'google', 'openai'])).toBe(false)
  })

  test('returns true for empty config (no models to validate)', () => {
    expect(validateKeysForConfig({}, [])).toBe(true)
  })

  test('openai prefix gpt- is recognised', () => {
    expect(validateKeysForConfig({ R: 'gpt-4o' }, ['openai'])).toBe(true)
  })

  test('openai prefix o4- is recognised', () => {
    expect(validateKeysForConfig({ R: 'o4-mini' }, ['openai'])).toBe(true)
  })

  test('xai prefix grok- is recognised', () => {
    expect(validateKeysForConfig({ R: 'grok-3' }, ['xai'])).toBe(true)
  })
})

describe('clearReviewerConfig', () => {
  test('removes the entry from localStorage', () => {
    setReviewerConfig(SPEC_ID, { Reviewer1: 'claude-3-5-sonnet-20241022' })
    expect(store.has(`vada:reviewer-models:${SPEC_ID}`)).toBe(true)
    clearReviewerConfig(SPEC_ID)
    expect(store.has(`vada:reviewer-models:${SPEC_ID}`)).toBe(false)
  })

  test('is a no-op when no entry exists', () => {
    expect(() => clearReviewerConfig(SPEC_ID)).not.toThrow()
  })
})

describe('getReviewerConfig / setReviewerConfig round-trip', () => {
  test('returns null when nothing is stored', () => {
    expect(getReviewerConfig(SPEC_ID)).toBeNull()
  })

  test('returns stored config after set', () => {
    const config = { Reviewer1: 'gemini-2.5-pro', Synthesizer: 'claude-3-5-sonnet-20241022' }
    setReviewerConfig(SPEC_ID, config)
    expect(getReviewerConfig(SPEC_ID)).toEqual(config)
  })
})
