import { resolveGithubToken, resolveRepo } from '@atta/aeg-forge-state'
import { cache } from 'react'

/**
 * Server-only: `resolveGithubToken()` shells out to `gh auth token` (`execFile`,
 * 5s timeout) when no env token is set. `cache()` de-dupes that call within a
 * single request — the Portal/Studio switch renders once per request, in a
 * layout, so an uncached call here would shell out on every page load.
 *
 * NOT an authorization check — see `isVercelDeploy()` in `env.ts` and.
 * This only answers "can this server reach GitHub?".
 */
export const hasForgeConnection = cache(async (): Promise<boolean> => {
  const [token, repo] = await Promise.all([resolveGithubToken(), resolveRepo()])
  return token !== null && repo !== null
})
