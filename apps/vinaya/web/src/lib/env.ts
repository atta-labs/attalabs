/**
 * Gated on `VERCEL_ENV`, not `NODE_ENV`: `NODE_ENV` is also `"production"` for
 * a local `bun run build && bun run start`, which must still show the real
 * Studio dashboard. `VERCEL_ENV` is set by Vercel's build/runtime environment
 * and absent locally, so it's the only signal that distinguishes an actual
 * production deploy from a local production-mode build.
 */
export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === 'production'
}
