// Fetch locally-installed Ollama models via /api/tags so the picker shows
// only what the user can actually run. Runs entirely in the browser — direct
// call to localhost:11434, no Vāda-server involvement. See /trust.
//
// Ollama's tag format (e.g. "qwen2.5:14b") is used as the modelId when we
// later invoke the model — same string, no translation needed.

import type { ModelEntry } from '@atta/models'
import { OLLAMA_BASE_URL } from '@atta/models'

interface OllamaTagEntry {
  name: string
  model?: string
  size?: number
  details?: {
    family?: string
    parameter_size?: string
    quantization_level?: string
  }
}

interface OllamaTagsResponse {
  models?: OllamaTagEntry[]
}

// Map Ollama model families to a displayProvider string so the icon matches.
function resolveDisplayProvider(family: string | undefined, name: string): string {
  const n = name.toLowerCase()
  const f = (family ?? '').toLowerCase()
  if (n.startsWith('llama') || f.includes('llama')) return 'meta'
  if (n.startsWith('qwen') || f.includes('qwen')) return 'meta'
  if (n.startsWith('deepseek') || f.includes('deepseek')) return 'deepseek'
  if (n.startsWith('mistral') || n.startsWith('mixtral') || f.includes('mistral')) return 'mistral'
  if (n.startsWith('gemma') || f.includes('gemma')) return 'google'
  if (n.startsWith('phi') || f.includes('phi')) return 'meta'
  return 'meta'
}

function humanSize(bytes: number | undefined): string {
  if (!bytes) return ''
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1024 ** 2
  return `${mb.toFixed(0)} MB`
}

function labelize(name: string, paramSize: string | undefined): string {
  // "qwen2.5:14b" → "Qwen 2.5 14B"; keep the user's colon tag in parentheses
  // when the parameter size isn't already part of the family label.
  const [family, tag] = name.split(':')
  if (!family) return name
  const nice = family
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/(\d)\.(\d)/, '$1.$2')
  if (!tag) return paramSize ? `${nice} ${paramSize}` : nice
  return paramSize ? `${nice} ${paramSize.toUpperCase()}` : `${nice} ${tag.toUpperCase()}`
}

export async function fetchInstalledOllamaModels(): Promise<ModelEntry[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' })
  if (!res.ok) throw new Error(`Ollama /api/tags responded ${res.status}`)
  const body = (await res.json()) as OllamaTagsResponse
  const models = body.models ?? []
  return models.map((m): ModelEntry => {
    const size = humanSize(m.size)
    const paramSize = m.details?.parameter_size
    const description = size ? `Local · ${size}` : 'Local'
    return {
      id: `ollama/${m.name}`,
      modelId: m.name,
      displayProvider: resolveDisplayProvider(m.details?.family, m.name),
      vendorId: 'ollama',
      route: 'ollama',
      label: labelize(m.name, paramSize),
      description,
      tier: 'balanced',
      cost: 'free'
    }
  })
}
