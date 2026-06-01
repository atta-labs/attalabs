export type SdkShape = 'openai-compat' | 'anthropic' | 'google-genai'
export type KeyConvention = 'bearer' | 'x-api-key' | 'query-param' | 'none'

export interface Vendor {
  id: string
  label: string
  sdkShape: SdkShape
  baseURL?: string
  keyConvention: KeyConvention
  /** UX hint only — NOT used for routing. */
  keyPrefix?: string
  envVar?: string
  /** Which @lobehub/icons key to use; defaults to id if omitted. */
  displayId?: string
  /** Prefixes that unambiguously identify this vendor (for fallback prefix resolution). */
  modelPrefixes?: string[]
  /** True for vendors that only work in local deployments (e.g. Ollama). */
  localOnly?: boolean
}

export const VENDORS = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    sdkShape: 'anthropic',
    keyConvention: 'x-api-key',
    keyPrefix: 'sk-ant-',
    envVar: 'ANTHROPIC_API_KEY',
    modelPrefixes: ['claude-']
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.openai.com/v1',
    keyConvention: 'bearer',
    keyPrefix: 'sk-',
    envVar: 'OPENAI_API_KEY',
    modelPrefixes: ['gpt-', 'o4-', 'o3-', 'o1-']
  },
  google: {
    id: 'google',
    label: 'Google',
    sdkShape: 'google-genai',
    keyConvention: 'query-param',
    keyPrefix: 'AIza',
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    modelPrefixes: ['gemini-']
  },
  xai: {
    id: 'xai',
    label: 'xAI',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.x.ai/v1',
    keyConvention: 'bearer',
    keyPrefix: 'xai-',
    envVar: 'XAI_API_KEY',
    modelPrefixes: ['grok-']
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.groq.com/openai/v1',
    keyConvention: 'bearer',
    keyPrefix: 'gsk_',
    envVar: 'GROQ_API_KEY'
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    sdkShape: 'openai-compat',
    baseURL: 'https://openrouter.ai/api/v1',
    keyConvention: 'bearer',
    keyPrefix: 'sk-or-',
    envVar: 'OPENROUTER_API_KEY'
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.deepseek.com/v1',
    keyConvention: 'bearer',
    envVar: 'DEEPSEEK_API_KEY',
    modelPrefixes: ['deepseek-']
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.cerebras.ai/v1',
    keyConvention: 'bearer',
    envVar: 'CEREBRAS_API_KEY'
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.mistral.ai/v1',
    keyConvention: 'bearer',
    envVar: 'MISTRAL_API_KEY',
    modelPrefixes: ['mistral-', 'codestral-']
  },
  together: {
    id: 'together',
    label: 'Together AI',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.together.xyz/v1',
    keyConvention: 'bearer',
    envVar: 'TOGETHER_API_KEY'
  },
  fireworks: {
    id: 'fireworks',
    label: 'Fireworks AI',
    sdkShape: 'openai-compat',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    keyConvention: 'bearer',
    envVar: 'FIREWORKS_API_KEY'
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    sdkShape: 'openai-compat',
    baseURL: 'http://localhost:11434/v1',
    keyConvention: 'none',
    localOnly: true
  }
} satisfies Record<string, Vendor>

export type VendorId = keyof typeof VENDORS

export function getVendor(id: VendorId): Vendor {
  // satisfies preserves narrow per-entry types; cast needed to widen back to Vendor
  return VENDORS[id] as Vendor
}

export function isLocalOnly(id: VendorId): boolean {
  return getVendor(id).localOnly === true
}

/**
 * Resolve a VendorId from a model ID string using vendor-declared prefixes.
 * Returns null when no vendor unambiguously claims the prefix.
 *
 * NOTE: This is a fallback for models not resolved via the catalog.
 * For user-configured models (reviewerConfig), use the catalog-resolved
 * vendorId via agentVendorOverrides instead — a model like
 * deepseek-r1-distill-llama-70b served by Groq has vendorId='groq' in the
 * catalog, which prefix matching alone would misidentify as 'deepseek'.
 */
export function resolveVendorByPrefix(modelId: string): VendorId | null {
  for (const [vendorId, vendor] of Object.entries(VENDORS) as Array<[string, Vendor]>) {
    if (vendor.modelPrefixes?.some((prefix) => modelId.startsWith(prefix))) {
      return vendorId as VendorId
    }
  }
  return null
}

/** Ollama host without any path suffix. Discovery code appends '/api/tags'; adapter uses baseURL which has '/v1'. */
export const OLLAMA_BASE_URL = 'http://localhost:11434'

/** Ordering for UI rendering — native providers first, proxy second, local last. */
export const VENDOR_ORDER: VendorId[] = [
  'anthropic',
  'openai',
  'google',
  'xai',
  'groq',
  'openrouter',
  'deepseek',
  'cerebras',
  'mistral',
  'together',
  'fireworks',
  'ollama'
]
