// Shape of https://models.dev/api.json
export interface ModelsDevCost {
  input: number
  output: number
  reasoning?: number
}

export interface ModelsDevLimit {
  context?: number
  output?: number
}

export interface ModelsDevModel {
  id?: string
  name?: string
  family?: string
  reasoning?: boolean
  tool_call?: boolean
  open_weights?: boolean
  release_date?: string
  knowledge?: string
  cost?: ModelsDevCost
  limit?: ModelsDevLimit
}

export interface ModelsDevProvider {
  id: string
  name?: string
  env?: string[]
  api?: string
  doc?: string
  npm?: string
  models: Record<string, ModelsDevModel>
}

export type ModelsDevResponse = Record<string, ModelsDevProvider>

const MODELS_DEV_URL = 'https://models.dev/api.json'

// The response is ~2.3MB, above Next.js's 2MB per-item cache limit.
// We explicitly opt out of fetch-level caching; the CALLER wraps the
// transformed (small) output with `unstable_cache` instead.
export async function fetchModelsDev(): Promise<ModelsDevResponse> {
  const res = await fetch(MODELS_DEV_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`models.dev fetch failed: ${res.status}`)
  return (await res.json()) as ModelsDevResponse
}
