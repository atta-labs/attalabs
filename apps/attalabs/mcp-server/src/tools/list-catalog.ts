import { listPublicSpecs } from '@atta/engine'
import { ListCatalogInputSchema, type ListCatalogInput } from '../schema'

export interface ListCatalogOutput {
  ok: boolean
  specs?: Array<{
    id: string
    name: string
    description: string
  }>
  error?: string
}

export async function runListCatalog(input: unknown): Promise<ListCatalogOutput> {
  try {
    const parsed = ListCatalogInputSchema.parse(input)
    return listCatalog(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Validation failed: ${message}` }
  }
}

function listCatalog(input: ListCatalogInput): ListCatalogOutput {
  try {
    const allSpecs = listPublicSpecs()
    const filtered = input.prefix ? allSpecs.filter((s) => s.id.startsWith(input.prefix!)) : allSpecs

    const specs = filtered.map((spec) => ({
      id: spec.id,
      name: spec.displayName,
      description: spec.description
    }))

    return { ok: true, specs }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Catalog lookup failed: ${message}` }
  }
}
