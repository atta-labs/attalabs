// Where the AI SDK request actually routes.
export type RouteProvider = 'anthropic' | 'google' | 'groq' | 'openai' | 'openrouter'

// Which brand logo the UI shows — independent of routing.
export type DisplayProvider =
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'openai'
  | 'xai'
  | 'deepseek'
  | 'mistral'
  | 'cerebras'
  | 'meta'

export interface ProviderMeta {
  id: RouteProvider
  label: string
  keyPrefix: string
  keyPlaceholder: string
  envVar: string
}

export const PROVIDERS: Record<RouteProvider, ProviderMeta> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-…',
    envVar: 'ANTHROPIC_API_KEY'
  },
  google: {
    id: 'google',
    label: 'Google',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza…',
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY'
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_…',
    envVar: 'GROQ_API_KEY'
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-…',
    envVar: 'OPENAI_API_KEY'
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-…',
    envVar: 'OPENROUTER_API_KEY'
  }
}

// Convenience ordering for UI rendering (native providers first, proxy last)
export const ROUTE_PROVIDER_ORDER: RouteProvider[] = ['anthropic', 'openai', 'google', 'groq', 'openrouter']
