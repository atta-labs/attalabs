/**
 * Gated on presence, not equality to `'production'`. `VERCEL_ENV` takes three
 * values on Vercel — `production`, `preview`, `development` — so
 * `=== 'production'` leaves every preview deploy (a real, publicly-reachable
 * URL Vercel publishes for every PR touching this app) ungated. Gated on
 * `VERCEL_ENV`, not `NODE_ENV`, for a separate reason: `NODE_ENV` is also
 * `"production"` for a local `bun run build && bun run start`, which must
 * still show the real Studio dashboard. `VERCEL_ENV` is unset entirely for
 * that local case (Vercel's own runtime is what sets it), so presence is the
 * signal that distinguishes any actual Vercel deploy — production or preview
 * — from a local production-mode build.
 *
 * This is a PLACEHOLDER, not the concept. It stands exactly where
 * Phase 3's viewer-auth check (repo/org membership on a deployed,
 * auth-gated Studio) goes. Today "not a Vercel deploy" is the only available
 * proxy for "the only visitor is you" — Vinaya has no viewer identity yet.
 * When Phase 3 ships real auth, replace this term wherever it gates Studio
 * visibility/access; the surrounding logic (e.g. the Portal/Studio switch's
 * gate order in `ProductSwitch.tsx`) does not need to change shape, only this
 * term.
 */
export function isVercelDeploy(): boolean {
  return process.env.VERCEL_ENV !== undefined
}
