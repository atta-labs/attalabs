// Popular Ollama models injected into the catalog. Ollama isn't on models.dev,
// so these are hand-curated. Users will only actually be able to run a model
// here if they've pulled it locally (`ollama pull <tag>`); the probe tells
// them when the server is unreachable but doesn't enumerate installed models
// yet — that's V2.

import type { ModelEntry } from '../catalog'

// Entries include explicit size tags so users can pick the variant that fits
// their hardware. A 36GB Mac comfortably runs 14B at 4-bit; 32B is the
// practical ceiling. A 16GB Mac should stay at 7B or below.
export const OLLAMA_DEFAULT_CATALOG: ModelEntry[] = [
  // Qwen 2.5 — Apache 2.0, strong general-purpose, good fine-tuning support
  {
    id: 'ollama/qwen2.5:32b',
    modelId: 'qwen2.5:32b',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Qwen 2.5 32B',
    description: 'Local — needs ~20GB RAM',
    tier: 'reasoning',
    cost: 'free'
  },
  {
    id: 'ollama/qwen2.5:14b',
    modelId: 'qwen2.5:14b',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Qwen 2.5 14B',
    description: 'Local — sweet spot on 32GB+',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/qwen2.5:7b',
    modelId: 'qwen2.5:7b',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Qwen 2.5 7B',
    description: 'Local — fine-tune target',
    tier: 'balanced',
    cost: 'free'
  },
  // Llama 3.x — Meta's open-weight, biggest fine-tuning ecosystem
  {
    id: 'ollama/llama3.3',
    modelId: 'llama3.3',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Llama 3.3 70B',
    description: 'Local — needs 40GB+ RAM',
    tier: 'frontier',
    cost: 'free'
  },
  {
    id: 'ollama/llama3.1:8b',
    modelId: 'llama3.1:8b',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Llama 3.1 8B',
    description: 'Local — fine-tune target',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/llama3.2:3b',
    modelId: 'llama3.2:3b',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Llama 3.2 3B',
    description: 'Local — 8GB Macs',
    tier: 'fast',
    cost: 'free'
  },
  // DeepSeek — reasoning specialist, MIT-licensed
  {
    id: 'ollama/deepseek-r1:32b',
    modelId: 'deepseek-r1:32b',
    displayProvider: 'deepseek',
    route: 'ollama',
    label: 'DeepSeek R1 32B',
    description: 'Local — reasoning, ~20GB RAM',
    tier: 'reasoning',
    cost: 'free'
  },
  {
    id: 'ollama/deepseek-r1:14b',
    modelId: 'deepseek-r1:14b',
    displayProvider: 'deepseek',
    route: 'ollama',
    label: 'DeepSeek R1 14B',
    description: 'Local — reasoning, ~9GB RAM',
    tier: 'reasoning',
    cost: 'free'
  },
  // Gemma 3 — Google research quality
  {
    id: 'ollama/gemma3:27b',
    modelId: 'gemma3:27b',
    displayProvider: 'google',
    route: 'ollama',
    label: 'Gemma 3 27B',
    description: 'Local — Google open-weight',
    tier: 'balanced',
    cost: 'free'
  },
  {
    id: 'ollama/gemma3:12b',
    modelId: 'gemma3:12b',
    displayProvider: 'google',
    route: 'ollama',
    label: 'Gemma 3 12B',
    description: 'Local — fits 16GB+ Macs',
    tier: 'balanced',
    cost: 'free'
  },
  // Phi 4 — small but smart, MIT
  {
    id: 'ollama/phi4',
    modelId: 'phi4',
    displayProvider: 'meta',
    route: 'ollama',
    label: 'Phi 4 14B',
    description: 'Local — punches above its weight',
    tier: 'balanced',
    cost: 'free'
  },
  // Mistral — efficient European model, Apache 2.0
  {
    id: 'ollama/mistral',
    modelId: 'mistral',
    displayProvider: 'mistral',
    route: 'ollama',
    label: 'Mistral 7B',
    description: 'Local — efficient',
    tier: 'fast',
    cost: 'free'
  }
]
