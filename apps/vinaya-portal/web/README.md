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

This is the deployed production app for `vinaya.attalabs.dev` — the deployment was repointed here (Vercel dashboard change) and the original single app that combined both surfaces was deleted once this app and Vinaya Studio both proved out.

## CMS identity

Portal's CMS key is `'vinayaPortal'`. The root layout uses it for metadata, runtime config, and branding; the site layout uses it for topbar branding. Both build-time generator entry points use the same key and write `packages/ui/generated/vinayaPortal/`, which the app's component and canvas aliases target.

The `vinayaPortalConfig` and `branding-vinayaPortal` documents live in the same Sanity project as the legacy `vinaya` documents and were seeded with an identical appearance. “Vinaya” in titles, navigation, and footer copy remains the product's display label; it is not the CMS lookup key.

`src/lib/portal-cms.ts` is the one CMS read for this app — the root layout (render and `generateMetadata`) and the `(site)` layout all call its `getPortalCms()` instead of `getProductCms('vinayaPortal')` directly. It de-dupes the read within a single render (React `cache()`) and revalidates it every 60 seconds across requests (`unstable_cache`), rather than each call site paying its own live Sanity round trip. Call sites that need only `branding` or only `config` still get the same one cached object — never invoke `getProductCms` directly from this app.

## Rendering mode

Every route renders static or ISR (`○`/`●` in `next build`'s output) with a 60-second revalidate window, matching `portal-cms.ts`'s cache — including the doctrine routes below, which re-read `aeg-root` off disk each time the ISR window regenerates rather than on every request. `src/lib/published-version.ts` and `published-release-metrics.ts` stay effectively live through their own longer `next: { revalidate }` windows regardless.

This app used to force every route dynamic (`export const dynamic = 'force-dynamic'` in the root layout) because `@atta/ui`'s `NextWebShell` read the color-scheme cookie unconditionally, and a `cookies()` read anywhere in a route's render tree forces the whole route dynamic. Removing `force-dynamic` here required NextWebShell to stop doing that — see `packages/ui/lib/next-web-shell.tsx`'s `staticColorScheme` prop, which only this app passes. With it, `<html data-theme>` renders from the CMS/default scheme (no cookie read, nothing forcing the route dynamic) and a small inline script corrects it from `document.cookie` before first paint if the visitor had overridden it — the CSS this path emits (`generateThemeCSS`, both schemes gated behind `[data-theme="dark"]`) makes that a single attribute flip, no style-tag regeneration. Every other `@atta/ui` consumer is unaffected: omitting `staticColorScheme` (the default) keeps the exact prior behavior, a real server-side cookie read.

No experimental Next feature (PPR / `cacheComponents`) is needed for this: with the cookie read gone and the CMS reads cached, Next's ordinary static/ISR rendering already applies. `cacheComponents` was considered and rejected — enabling it is an app-wide opt-in with a far broader blast radius than this task's surface (Next 16 requires explicit `'use cache'`/`<Suspense>` treatment for every uncached or runtime data access in the whole app, not just this app's two layouts).

## Repo-root resolution

Two modules walk up from `process.cwd()` for a marker file: `src/lib/github-links.ts` (`vinaya.config.json`) and `src/lib/docs/load-aeg-docs.ts` (the `aeg-root` directory). Both markers are declared in `next.config.ts`'s `outputFileTracingIncludes`.

That pairing is load-bearing and has caused production-only 500s twice: the doctrine routes render static/ISR and read these files when the ISR window regenerates, not force-dynamic per request as before — but the read still happens on the deployed lambda, at whatever time it happens, so an undeclared marker still builds green and fails only there. Adding a third walker is a two-place change — the walk and the tracing declaration, in the same commit. `src/lib/tracing-markers.test.ts` enforces this by discovering the walkers in `src/` rather than trusting a hand-written list, so a new one fails the test until it is declared.
