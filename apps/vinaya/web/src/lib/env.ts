/**
 * Gated on `VERCEL_ENV`, not `NODE_ENV`: `NODE_ENV` is also `"production"` for
 * a local `bun run build && bun run start`, which must still show the real
 * Studio dashboard. `VERCEL_ENV` is set by Vercel's build/runtime environment
 * and absent locally, so it's the only signal that distinguishes an actual
 * production deploy from a local production-mode build.
 *
 * This is a PLACEHOLDER, not the concept (D-126). It stands exactly where
 * D-101 Phase 3's viewer-auth check (repo/org membership on a deployed,
 * auth-gated Studio) goes. Today "not a production deploy" is the only
 * available proxy for "the only visitor is you" — Vinaya has no viewer
 * identity yet. When Phase 3 ships real auth, replace this term wherever it
 * gates Studio visibility/access; the surrounding logic (e.g. the
 * Portal/Studio switch's gate order in `ProductSwitch.tsx`) does not need to
 * change shape, only this term.
 */
export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === 'production'
}
