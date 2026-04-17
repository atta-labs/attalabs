import type { ModelEntry } from './catalog'

// Used when models.dev is unreachable. Keep minimal.
export const FALLBACK_CATALOG: ModelEntry[] = [
  {
    id: 'anthropic/claude-sonnet-4-6',
    modelId: 'claude-sonnet-4-6',
    displayProvider: 'anthropic',
    route: 'anthropic',
    label: 'Claude Sonnet 4.6',
    description: 'Balanced — default',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'openai/gpt-4.1',
    modelId: 'gpt-4.1',
    displayProvider: 'openai',
    route: 'openai',
    label: 'GPT-4.1',
    description: 'Balanced workhorse',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'google/gemini-2.5-flash',
    modelId: 'gemini-2.5-flash',
    displayProvider: 'google',
    route: 'google',
    label: 'Gemini 2.5 Flash',
    description: 'Balanced',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'groq/llama-3.3-70b-versatile',
    modelId: 'llama-3.3-70b-versatile',
    displayProvider: 'meta',
    route: 'groq',
    label: 'Llama 3.3 70B',
    description: 'Groq — fastest open-weight',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'openrouter/meta-llama-3.3-70b-free',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    displayProvider: 'meta',
    route: 'openrouter',
    label: 'Llama 3.3 70B (Free)',
    description: 'Free tier — rate-limited',
    tier: 'fast',
    cost: 'free'
  }
]
