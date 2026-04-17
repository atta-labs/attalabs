import type { DisplayProvider, RouteProvider } from './providers'

export interface ModelEntry {
  id: string
  modelId: string
  displayProvider: DisplayProvider
  route: RouteProvider
  label: string
  description?: string
  tier: 'frontier' | 'balanced' | 'fast' | 'reasoning'
  cost: 'free' | 'paid'
}

export const CATALOG: ModelEntry[] = [
  // Anthropic — native
  {
    id: 'anthropic/claude-opus-4-7',
    modelId: 'claude-opus-4-7',
    displayProvider: 'anthropic',
    route: 'anthropic',
    label: 'Claude Opus 4.7',
    description: 'Most capable — deep reasoning',
    tier: 'frontier',
    cost: 'paid'
  },
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
    id: 'anthropic/claude-haiku-4-5',
    modelId: 'claude-haiku-4-5-20251001',
    displayProvider: 'anthropic',
    route: 'anthropic',
    label: 'Claude Haiku 4.5',
    description: 'Fast + cheap',
    tier: 'fast',
    cost: 'paid'
  },

  // OpenAI — native
  {
    id: 'openai/gpt-5',
    modelId: 'gpt-5',
    displayProvider: 'openai',
    route: 'openai',
    label: 'GPT-5',
    description: 'Most capable OpenAI',
    tier: 'frontier',
    cost: 'paid'
  },
  {
    id: 'openai/gpt-5-mini',
    modelId: 'gpt-5-mini',
    displayProvider: 'openai',
    route: 'openai',
    label: 'GPT-5 mini',
    description: 'Fast + cheap',
    tier: 'fast',
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
    id: 'openai/o3',
    modelId: 'o3',
    displayProvider: 'openai',
    route: 'openai',
    label: 'o3',
    description: 'Reasoning-optimized',
    tier: 'reasoning',
    cost: 'paid'
  },

  // Google — native
  {
    id: 'google/gemini-2.5-pro',
    modelId: 'gemini-2.5-pro',
    displayProvider: 'google',
    route: 'google',
    label: 'Gemini 2.5 Pro',
    description: 'Frontier Gemini',
    tier: 'frontier',
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
    id: 'google/gemini-2.5-flash-lite',
    modelId: 'gemini-2.5-flash-lite',
    displayProvider: 'google',
    route: 'google',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Fast + cheap',
    tier: 'fast',
    cost: 'paid'
  },

  // Groq — native (fast open-weight)
  {
    id: 'groq/llama-3.3-70b',
    modelId: 'llama-3.3-70b-versatile',
    displayProvider: 'meta',
    route: 'groq',
    label: 'Llama 3.3 70B',
    description: 'Groq — fastest open-weight',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'groq/llama-3.1-8b',
    modelId: 'llama-3.1-8b-instant',
    displayProvider: 'meta',
    route: 'groq',
    label: 'Llama 3.1 8B',
    description: 'Groq — ultra-fast',
    tier: 'fast',
    cost: 'paid'
  },
  {
    id: 'groq/gpt-oss-120b',
    modelId: 'openai/gpt-oss-120b',
    displayProvider: 'openai',
    route: 'groq',
    label: 'GPT-OSS 120B',
    description: 'Groq — OpenAI open-weight',
    tier: 'balanced',
    cost: 'paid'
  },

  // OpenRouter — proxy routes
  {
    id: 'openrouter/grok-4',
    modelId: 'x-ai/grok-4',
    displayProvider: 'xai',
    route: 'openrouter',
    label: 'Grok 4',
    description: 'xAI frontier',
    tier: 'frontier',
    cost: 'paid'
  },
  {
    id: 'openrouter/grok-3',
    modelId: 'x-ai/grok-3',
    displayProvider: 'xai',
    route: 'openrouter',
    label: 'Grok 3',
    description: 'xAI workhorse',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'openrouter/deepseek-r1',
    modelId: 'deepseek/deepseek-r1',
    displayProvider: 'deepseek',
    route: 'openrouter',
    label: 'DeepSeek R1',
    description: 'Reasoning',
    tier: 'reasoning',
    cost: 'paid'
  },
  {
    id: 'openrouter/deepseek-v3',
    modelId: 'deepseek/deepseek-chat',
    displayProvider: 'deepseek',
    route: 'openrouter',
    label: 'DeepSeek V3',
    description: 'Balanced chat',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'openrouter/mistral-large',
    modelId: 'mistralai/mistral-large',
    displayProvider: 'mistral',
    route: 'openrouter',
    label: 'Mistral Large',
    description: 'European frontier',
    tier: 'balanced',
    cost: 'paid'
  },
  {
    id: 'openrouter/llama-3.3-70b-cerebras',
    modelId: 'meta-llama/llama-3.3-70b-instruct:cerebras',
    displayProvider: 'cerebras',
    route: 'openrouter',
    label: 'Llama 3.3 70B (Cerebras)',
    description: 'Cerebras — ultra-fast inference',
    tier: 'fast',
    cost: 'paid'
  },
  {
    id: 'openrouter/llama-3.3-70b-free',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    displayProvider: 'meta',
    route: 'openrouter',
    label: 'Llama 3.3 70B (Free)',
    description: 'Free tier — rate-limited',
    tier: 'fast',
    cost: 'free'
  }
]

export function findModelEntry(route: RouteProvider, modelId: string): ModelEntry | undefined {
  return CATALOG.find((e) => e.route === route && e.modelId === modelId)
}

export function findModelEntryByModelId(modelId: string): ModelEntry | undefined {
  return CATALOG.find((e) => e.modelId === modelId)
}
