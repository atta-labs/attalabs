# 2026-06-17 — Fix Vercel turbo-ignore from app subdirectories

**Tier:** 0

Fixed Vercel building all apps on every PR regardless of what changed. The `ignoreCommand` was running `turbo-ignore` from the app subdirectory where `turbo.json` isn't found, causing it to fail silently and default to "build everything."

Changed `ignoreCommand` in three `vercel.json` files to prefix with `cd ../../.. && ` so `turbo-ignore` runs from the monorepo root where `turbo.json` lives. Also removed stale `functions` config for deleted route `src/app/api/match/route.ts` in herald-ai.

Files:
- `apps/atta-ai/web/vercel.json`
- `apps/vada-ai/web/vercel.json`
- `apps/herald-ai/web/vercel.json`
