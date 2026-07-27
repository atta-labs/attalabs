import { deriveTrancheFromForge } from '@atta/aeg-forge-state'
import type { StateSource } from './contract'

export type ForgeSourceConfig = {
  owner: string
  repo: string
}

/**
 * Primary StateSource design. Wires `@atta/aeg-forge-state`'s
 * `deriveTrancheFromForge` behind the contract — imported as a workspace
 * dependency rather than re-homed. `@atta/aeg-forge-state` is already a
 * clean, general-purpose, repo/owner-parameterized package with no
 * vinaya-specific coupling and existing consumers of its own
 * (`packages/aeg-core/bin/*`, both apps' `read-root.ts`/`stale-blocker.ts`);
 * re-homing it would be a rename with no functional benefit and would break
 * those consumers.
 */
export function createForgeSource(config: ForgeSourceConfig): StateSource {
  return {
    async getTranche(slug: string) {
      return deriveTrancheFromForge(config.owner, config.repo, slug)
    }
  }
}
