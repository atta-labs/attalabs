# Vinaya Portal

The public Vinaya site — landing page plus the methodology surfaces (Start, The Harness, State Machine, Docs, CLI, Config, Roadmap). Part of the [AttaLabs](../../../README.md) ecosystem.

**Domain:** `vinaya.attalabs.dev` (not yet repointed here — see below)

"Vinaya" means "discipline" or "the rules of conduct" in Pali.

## What this app is, and what it deliberately is not

This app serves the `(site)` route group and **nothing else**. It contains no Studio route, no `api/coherence`, and no forge-connection code. That absence is the design: the previous arrangement served the public Portal and the local-only Studio from one deployment and hid Studio behind a runtime `isVercelDeploy()` gate. A gate that has to be correct on every route is a standing liability — one whose earlier `VERCEL_ENV` equality check left preview deployments ungated. Splitting the apps replaces that runtime answer with a structural one: there is nothing here to gate.

Consequently there is no Portal↔Studio toggle. With two apps there is no second product to switch to.

## Running it

```
bun run dev:vinaya-portal    # port 3007, falls back to 3107
```

`apps/vinaya/web` still exists and is still what production serves; it runs on **3006/3106**. The two apps render the same product under the same CMS theme, so they are easy to confuse — check the port before concluding a change did or did not take effect.

`apps/vinaya/web` is the rollback until the deployment is repointed here, and is deleted only once that has happened and Studio has moved to its own app.

## CMS identity

The product key is `'vinaya'` — unchanged from the original app, in all three call sites (`next.config.ts`'s `generateUIIndex`, `scripts/generate-ui.ts`, and the root layout's two `getProductCms` calls). Portal is still the Vinaya product; changing the key silently re-themes the app.

**Provisional.** `@atta/cms` now also registers a `vinayaPortal` product key — its own `vinayaPortalConfig`/`branding-vinayaPortal` documents, seeded identical to `vinaya`'s so nothing renders differently today (see `.claude/skills/ui-cms-theme/SKILL.md`). None of the three call sites above have been repointed at it; that repoint is a separate, later change. Until it happens, treat every line above as accurate.

## Repo-root resolution

Two modules walk up from `process.cwd()` for a marker file: `src/lib/github-links.ts` (`vinaya.config.json`) and `src/lib/docs/load-aeg-docs.ts` (the `aeg-root` directory). Both markers are declared in `next.config.ts`'s `outputFileTracingIncludes`.

That pairing is load-bearing and has caused production-only 500s twice: the doctrine routes are `force-dynamic` and read these files at **request** time, so an undeclared marker builds green and fails only on the deployed lambda. Adding a third walker is a two-place change — the walk and the tracing declaration, in the same commit. `src/lib/tracing-markers.test.ts` enforces this by discovering the walkers in `src/` rather than trusting a hand-written list, so a new one fails the test until it is declared.

## Spec

Route-by-route status lives in [vinaya-spec.md](../../vinaya/specs/vinaya-spec.md)'s Pages table.
