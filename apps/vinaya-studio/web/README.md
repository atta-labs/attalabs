# Vinaya Studio

The local governance dashboard for Vinaya — `/studio` (home), `/studio/projects`, `/studio/tranches`, and `/studio/backlog`, plus the `GET /api/coherence` route they read from. Part of the [AttaLabs](../../../README.md) ecosystem.

"Vinaya" means "discipline" or "the rules of conduct" in Pali.

## What this app is, and what it deliberately is not

This app serves `/studio/**` and nothing else, and it is **never deployed**. It contains no `ProductSwitch`, no `isVercelDeploy()` gate, and no marketing/doctrine-browser routes — those live in [`apps/vinaya-portal/web`](../../vinaya-portal/web). The previous arrangement served the public Portal and the local-only Studio from one deployment and hid Studio behind a runtime `isVercelDeploy()` gate that had to be correct on every route — a standing liability whose earlier `VERCEL_ENV` equality check once left preview deployments ungated. Splitting the apps replaces that runtime answer with a structural one: this app has no production entry point to gate against, so the gate itself is gone rather than papered over.

Consequently there is no Portal↔Studio toggle either — with two apps there is no in-app destination to switch to. Studio's one cross-app link (the topbar's "Docs" item, to Portal's `/docs/reference`) is an `external` link to the production domain rather than an in-app route.

This app does not depend on `@atta/vinaya-sources` — verified against the moved surface (`app/studio/**`, `lib/forge`, `lib/repo-state`): zero imports. Adding it back for symmetry with Portal would be an unnecessary dependency here becoming an unnecessary registry dependency in a future adoption tranche.

## Running it

```
bun run dev:vinaya-studio    # port 3008, falls back to 3108
```

`apps/vinaya-portal/web` runs on 3007/3107. Two apps rendering the same product under the same CMS theme are easy to confuse — check the port before concluding a change did or did not take effect.

## CMS identity

Studio's CMS key is `'vinayaStudio'`. The root layout uses it for metadata, runtime config, and branding; the Studio layout uses it for topbar branding. Both build-time generator entry points use the same key and write `packages/ui/generated/vinayaStudio/`, which the app's component and canvas aliases target.

The `vinayaStudioConfig` and `branding-vinayaStudio` documents live in the same Sanity project as the legacy `vinaya` documents and were seeded with an identical appearance. “Vinaya” in visible copy remains the product's display label; it is not the CMS lookup key.

## Repo-root resolution

`src/lib/repo-state/read-root.ts`'s `findAegRoot()` walks up from `process.env.VINAYA_REPO_ROOT ?? process.cwd()` looking for `.vinaya/projects.md`, then returns that directory itself — the repo root, not a legacy `aeg-root/` (attalabs carries no repo-local `aeg-root/`; the doctrine ships inside the installed `@attalabs/vinaya` package instead). `src/app/api/coherence/route.ts` calls the same function directly. This app sits at `apps/vinaya-studio/web`, three hops up from the repo root (`web/<product>/apps/<root>`) — so the walk resolves for the ordinary `next dev` case with no `VINAYA_REPO_ROOT` override needed; that override exists for the standalone-bundled Studio case in the separate `atta-labs/vinaya` CLI repo, where Next's generated `server.js` calls `process.chdir(__dirname)` before any request runs.

Unlike `apps/vinaya-portal/web`, this app declares no `outputFileTracingIncludes` in `next.config.ts` and carries no `tracing-markers.test.ts` guard — that mechanism exists solely to keep a Vercel serverless bundle from silently dropping a computed-path read a `force-dynamic` route needs at request time, and this app is never deployed to Vercel, so there is no serverless bundle for a marker to go missing from.
