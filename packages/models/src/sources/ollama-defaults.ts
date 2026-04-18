// Popular Ollama models injected into the catalog. Ollama isn't on models.dev,
// so these are hand-curated. Users will only actually be able to run a model
// here if they've pulled it locally (`ollama pull <tag>`); the probe tells
// them when the server is unreachable but doesn't enumerate installed models
// yet — that's V2.

import type { ModelEntry } from '../catalog'

export const OLLAMA_DEFAULT_CATALOG: ModelEntry[] = [
  {
    id: 'ollama/llama3.3',
    modelId: 'llama3.3',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Llama 3.3',
    description: 'Local — free, no limits',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/llama3.2',
    modelId: 'llama3.2',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Llama 3.2',
    description: 'Local — small + fast',
    tier: 'fast',
    cost: 'free'
  },
  {
    id: 'ollama/llama3.1',
    modelId: 'llama3.1',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Llama 3.1',
    description: 'Local',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/qwen2.5',
    modelId: 'qwen2.5',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Qwen 2.5',
    description: 'Local — strong open-weight',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/deepseek-r1',
    modelId: 'deepseek-r1',
    displayProvider: 'deepseek',
    route: 'ollama',
    label: 'DeepSeek R1',
    description: 'Local — reasoning',
    tier: 'reasoning',
    cost: 'free'
  },
  {
    id: 'ollama/gemma3',
    modelId: 'gemma3',
    displayProvider: 'google',
    route: 'ollama',
    label: 'Gemma 3',
    description: 'Local — Google open-weight',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/phi4',
    modelId: 'phi4',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Phi 4',
    description: 'Local — small + capable',
    tier: 'fast',
    cost: 'free'
  },
  {
    id: 'ollama/mistral',
    modelId: 'mistral',
    displayProvider: 'mistral',
    route: 'ollama',
    label: 'Mistral 7B',
    description: 'Local',
    tier: 'fast',
    cost: 'free'
  }
]
