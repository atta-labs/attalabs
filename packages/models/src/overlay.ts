import type { ModelEntry } from './catalog'

// Small hand-maintained map of known flagship / notable models.
// Models not listed here default to tier 'balanced' with no description.
// When a new flagship ships (e.g. Gemini 3 Pro), add it here.
//
// Key: the models.dev model id (not the OpenRouter-prefixed form).
export const OVERLAY: Record<string, { tier?: ModelEntry['tier']; description?: string }> = {
  // Anthropic
  'claude-opus-4-8': { tier: 'frontier', description: 'Deep reasoning' },
  'claude-sonnet-5': { tier: 'balanced', description: 'Balanced — default' },
  'claude-opus-4-7': { tier: 'balanced', description: 'Deep reasoning' },
  'claude-sonnet-4-6': { tier: 'balanced', description: 'Balanced' },
  'claude-haiku-4-5-20251001': { tier: 'fast', description: 'Fast + cheap' },

  // OpenAI
  'gpt-5': { tier: 'frontier', description: 'Most capable OpenAI' },
  'gpt-5-mini': { tier: 'fast', description: 'Fast + cheap' },
  'gpt-4.1': { tier: 'balanced', description: 'Balanced workhorse' },
  o3: { tier: 'reasoning', description: 'Reasoning-optimized' },

  // Google — bump when Gemini 3 releases; key on the models.dev id exactly
  'gemini-2.5-pro': { tier: 'frontier', description: 'Frontier Gemini' },
  'gemini-2.5-flash': { tier: 'balanced', description: 'Balanced Gemini' },
  'gemini-2.5-flash-lite': { tier: 'fast', description: 'Fast + cheap' },

  // Groq-hosted
  'llama-3.3-70b-versatile': { tier: 'balanced', description: 'Groq — fastest open-weight' },
  'llama-3.1-8b-instant': { tier: 'fast', description: 'Groq — ultra-fast' },

  // xAI — via OpenRouter
  'grok-4': { tier: 'frontier', description: 'xAI frontier' },
  'grok-3': { tier: 'balanced', description: 'xAI workhorse' },

  // DeepSeek — via OpenRouter
  'deepseek-r1': { tier: 'reasoning', description: 'Reasoning' },
  'deepseek-chat': { tier: 'balanced', description: 'Balanced chat' }
}
