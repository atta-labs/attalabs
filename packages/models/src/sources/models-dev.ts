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
const REVALIDATE_SECONDS = 60 * 60 * 24 // 24h

export async function fetchModelsDev(): Promise<ModelsDevResponse> {
  const res = await fetch(MODELS_DEV_URL, {
    next: { revalidate: REVALIDATE_SECONDS }
  })
  if (!res.ok) throw new Error(`models.dev fetch failed: ${res.status}`)
  return (await res.json()) as ModelsDevResponse
}
