import { z } from 'zod'
import type { StateSource } from './contract'
import { createFileSource } from './file-adapter'
import { createForgeSource } from './forge-adapter'

/**
 * Mirrors `apps/vinaya/cli/src/lib/config.ts`'s schema-first shape: a plain
 * zod object validated at load time, no conditional logic ().
 */
export const StateSourceConfigSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('forge'), owner: z.string(), repo: z.string() }),
  z.object({ kind: z.literal('file'), root: z.string().optional() })
])

export type StateSourceConfig = z.infer<typeof StateSourceConfigSchema>

/** Config-driven adapter selection — the one place a caller picks forge vs. file. */
export function selectSource(config: StateSourceConfig): StateSource {
  switch (config.kind) {
    case 'forge':
      return createForgeSource({ owner: config.owner, repo: config.repo })
    case 'file':
      return createFileSource({ root: config.root })
  }
}
