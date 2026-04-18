// Where the AI SDK request actually routes.
export type RouteProvider = 'anthropic' | 'google' | 'groq' | 'openai' | 'openrouter' | 'ollama'

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
  | 'ollama'

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
  },
  // Ollama runs locally — no auth by default. The "key" slot is a sentinel
  // (any non-empty string) meaning "user has enabled Ollama"; the actual
  // base URL is hardcoded to localhost:11434. See the setup note the probe
  // surfaces when the server isn't reachable.
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    keyPrefix: '',
    keyPlaceholder: 'no key needed — press Save to enable',
    envVar: 'OLLAMA_BASE_URL'
  }
}

// Convenience ordering for UI rendering (native providers first, proxy last,
// local inference at the end)
export const ROUTE_PROVIDER_ORDER: RouteProvider[] = ['anthropic', 'openai', 'google', 'groq', 'openrouter', 'ollama']

// Default Ollama endpoint. Users who run Ollama on a different port or host
// will need to update this constant (or we add per-user baseURL in V2).
export const OLLAMA_BASE_URL = 'http://localhost:11434'
