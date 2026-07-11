import { describe, it, expect } from 'bun:test'
import { transformModelsDev } from './transform'
import type { ModelsDevResponse } from './sources/models-dev'

const FIXTURE: ModelsDevResponse = {
  anthropic: {
    id: 'anthropic',
    models: {
      'claude-opus-4-8': { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' }
    }
  },
  groq: {
    id: 'groq',
    models: {
      'deepseek-r1-distill-llama-70b': {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'DeepSeek R1 Distill Llama 70B'
      },
      'llama-4-supersonic': { id: 'llama-4-supersonic', name: 'Llama 4 Supersonic' }
    }
  }
}

describe('transformModelsDev', () => {
  it('surfaces an Anthropic model absent from OVERLAY (no per-vendor allowlist gate)', () => {
    const entries = transformModelsDev(FIXTURE)
    const entry = entries.find((e) => e.id === 'anthropic/claude-opus-4-8')
    expect(entry).toBeDefined()
    expect(entry?.tier).toBe('balanced')
    expect(entry?.description).toBeUndefined()
  })

  it('still excludes a decommissioned model id regardless of overlay/provider', () => {
    const entries = transformModelsDev(FIXTURE)
    expect(entries.find((e) => e.modelId === 'deepseek-r1-distill-llama-70b')).toBeUndefined()
  })

  it('surfaces a non-Anthropic non-overlay model with tier balanced and no description', () => {
    const entries = transformModelsDev(FIXTURE)
    const entry = entries.find((e) => e.id === 'groq/llama-4-supersonic')
    expect(entry).toBeDefined()
    expect(entry?.tier).toBe('balanced')
    expect(entry?.description).toBeUndefined()
  })
})
